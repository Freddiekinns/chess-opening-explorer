#!/usr/bin/env python3
"""
Monthly refresh: summarise whatever months the window lacks, recombine it, and
commit the result to a local branch for the owner to review.

    python refresh.py           # do the work, if there is any
    python refresh.py --check   # say what it would do; only fetches origin/main

Run by the scheduled task (schedule/register-task.ps1) at logon and daily, so
most runs find nothing to do and exit. It runs from, and works in, its own
worktree at %LOCALAPPDATA%\\openingbook\\worktree, reset to origin/main each
time, so it runs only merged code and never touches the owner's checkout. It
never pushes, opens a PR or deploys: the owner reviews the branch
data/popularity-YYYY-MM and opens the PR.
"""

import argparse
import datetime
import hashlib
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set

import requests

from lib.monthly_summary import MonthlySummary

REPO = Path(__file__).resolve().parent.parent.parent
BASE = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "openingbook"
WORKTREE = BASE / "worktree"
DOWNLOADS = BASE / "lichess"
SUMMARIES = BASE / "summaries"
LOG = BASE / "refresh.log"

LISTING_URL = "https://database.lichess.org/standard/"
WINDOW = 3
MONTHLY = "tools/analysis/data/monthly"
SERVED = [
    "api/data/popularity_stats.json",
    "api/data/popularity-bands.json",
    "api/data/position-stats/*.json",
]
# Under pythonw every console child (git, powershell) would flash a window.
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
# Summarising takes ~2½ hours on every core; the PC stays usable at this.
BELOW_NORMAL = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)

log = logging.getLogger("refresh")


class RefreshError(Exception):
    pass


def file_name(month: str) -> str:
    return f"lichess_db_standard_rated_{month}.pgn.zst"


def branch_name(month: str) -> str:
    return f"data/popularity-{month}"


def last_month(today: datetime.date) -> str:
    first = today.replace(day=1) - datetime.timedelta(days=1)
    return f"{first.year:04d}-{first.month:02d}"


def window_months(until: str) -> List[str]:
    year, month = (int(part) for part in until.split("-"))
    months = []
    for _ in range(WINDOW):
        months.append(f"{year:04d}-{month:02d}")
        year, month = (year - 1, 12) if month == 1 else (year, month - 1)
    return months[::-1]


def find_work(
    until: str,
    on_main: Callable[[str], bool],
    waiting_for_review: Callable[[str], bool],
    published: Set[str],
) -> List[str]:
    """The months to summarise for the window ending `until`; none if it's done,
    waiting for review, or Lichess hasn't published every month it needs."""
    if waiting_for_review(until):
        return []
    missing = [month for month in window_months(until) if not on_main(month)]
    if not all(file_name(month) in published for month in missing):
        return []
    return missing


def parse_sha256sums(text: str) -> Dict[str, str]:
    pairs = (line.split() for line in text.splitlines() if line.strip())
    return {name: digest for digest, name in pairs}


def parse_counts(text: str) -> Dict[str, int]:
    pairs = (line.split() for line in text.splitlines() if line.strip())
    return {name: int(count) for name, count in pairs}


def verify_checksum(path: Path, expected: str) -> None:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    if digest.hexdigest() != expected:
        path.unlink()
        raise RefreshError(f"{path.name} failed its SHA-256 check; deleted")


def expected_size(headers: Dict[str, str], offset: int) -> Optional[int]:
    """The whole file's size: from Content-Range on a resume, else the length."""
    if "Content-Range" in headers:
        return int(headers["Content-Range"].rsplit("/", 1)[1])
    if "Content-Length" in headers:
        return offset + int(headers["Content-Length"])
    return None


def download(url: str, dest: Path, expected: str, get: Callable = requests.get) -> None:
    """Downloads to dest.part, resuming one left by an earlier run; dest only
    appears once the whole file has passed its checksum."""
    part = dest.with_name(dest.name + ".part")
    done = part.stat().st_size if part.exists() else 0
    headers = {"Range": f"bytes={done}-"} if done else {}
    with get(url, headers=headers, stream=True, timeout=60) as response:
        # 416: the part is already whole (stopped while hashing it last time).
        if response.status_code != 416:
            response.raise_for_status()
            # 200 rather than 206: the server sent the whole file, so start again.
            mode = "ab" if response.status_code == 206 else "wb"
            total = expected_size(response.headers, done if mode == "ab" else 0)
            with part.open(mode) as handle:
                for chunk in response.iter_content(chunk_size=1 << 20):
                    handle.write(chunk)
            # A stream cut short is resumed next run, not hashed and thrown away.
            if total is not None and part.stat().st_size < total:
                raise RefreshError(f"{dest.name}: download cut short; will resume")
    verify_checksum(part, expected)
    part.replace(dest)


def summary_is_complete(path: Path, expected_games: int) -> bool:
    """A summary that can't be read, or read a different number of games from
    the number Lichess published, is deleted."""
    if not path.exists():
        return False
    try:
        if MonthlySummary.read(path).games_read == expected_games:
            return True
    except (OSError, EOFError, ValueError, KeyError) as error:
        log.warning("%s unreadable (%s)", path.name, error)
    log.warning("%s incomplete; deleted", path.name)
    path.unlink()
    return False


def git(
    args: List[str], cwd: Path = REPO, check: bool = True
) -> subprocess.CompletedProcess:
    if "push" in args:
        raise RefreshError("refresh never pushes")
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        creationflags=NO_WINDOW,
    )
    if check and result.returncode != 0:
        raise RefreshError(f"git {' '.join(args)}: {result.stderr.strip()}")
    return result


def has_summary_args(ref: str, month: str) -> List[str]:
    return ["cat-file", "-e", f"{ref}:{MONTHLY}/{month}.json.gz"]


def setup_commands(worktree: Path) -> List[List[str]]:
    """The worktree back to origin/main, detached. The review branch is made
    only at commit time, so a failed run leaves nothing that looks done."""
    return [
        ["git", "-C", str(worktree), "checkout", "--force", "--detach", "origin/main"]
    ]


def commit_commands(
    worktree: Path, months: List[str], since: str, until: str
) -> List[List[str]]:
    paths = [f"{MONTHLY}/{month}.json.gz" for month in months] + SERVED
    wt = ["git", "-C", str(worktree)]
    return [
        [*wt, "checkout", "-B", branch_name(until)],
        [*wt, "add", "--", *paths],
        [
            *wt,
            "commit",
            "-m",
            f"chore(data): refresh popularity stats to {since}–{until}\n\n"
            "Written by tools/analysis/refresh.py.",
        ],
        # Detach again, so the owner can check the branch out.
        [*wt, "checkout", "--detach"],
    ]


def run(commands: List[List[str]]) -> None:
    for command in commands:
        git(command[1:])


def powershell_quote(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def notify(message: str) -> None:
    script = (
        "Add-Type -AssemblyName System.Windows.Forms;"
        "$n = New-Object System.Windows.Forms.NotifyIcon;"
        "$n.Icon = [System.Drawing.SystemIcons]::Information;"
        "$n.Visible = $true;"
        f"$n.ShowBalloonTip(10000, 'Opening Book', {powershell_quote(message)}, 'Info');"
        "Start-Sleep 10; $n.Dispose()"
    )
    try:
        subprocess.Popen(
            ["powershell", "-NoProfile", "-Command", script], creationflags=NO_WINDOW
        )
    except OSError:
        log.warning("could not show a notification")


def run_script(name: str, *args: str) -> None:
    with LOG.open("a", encoding="utf-8") as handle:
        subprocess.run(
            [sys.executable, str(WORKTREE / "tools/analysis" / name), *args],
            cwd=WORKTREE / "tools/analysis",
            check=True,
            stdout=handle,
            stderr=subprocess.STDOUT,
            creationflags=BELOW_NORMAL | NO_WINDOW,
        )


def summarise(month: str, sums: Dict[str, str], counts: Dict[str, int]) -> Path:
    name = file_name(month)
    out = SUMMARIES / f"{month}.json.gz"
    if summary_is_complete(out, counts[name]):
        log.info("%s already summarised", month)
        return out
    raw = DOWNLOADS / name
    if not raw.exists():
        log.info("downloading %s", name)
        download(LISTING_URL + name, raw, sums[name])
    log.info("summarising %s", month)
    run_script(
        "summarise_month.py", "--month", month, "--file", str(raw), "--out", str(out)
    )
    if not summary_is_complete(out, counts[name]):
        raise RefreshError(f"{month}: game count differs from Lichess's counts.txt")
    raw.unlink()
    return out


def listing(name: str) -> str:
    response = requests.get(LISTING_URL + name, timeout=60)
    response.raise_for_status()
    return response.text


def refresh(check: bool) -> int:
    until = last_month(datetime.date.today())
    git(["fetch", "--quiet", "origin", "main"])
    sums = parse_sha256sums(listing("sha256sums.txt"))
    counts = parse_counts(listing("counts.txt"))
    work = find_work(
        until,
        on_main=lambda m: git(
            has_summary_args("origin/main", m), check=False
        ).returncode
        == 0,
        waiting_for_review=lambda m: git(
            has_summary_args(f"refs/heads/{branch_name(m)}", m), check=False
        ).returncode
        == 0,
        # Both lists, or there's no game count to check the summary against.
        published=set(sums) & set(counts),
    )
    if not work:
        log.info("window ending %s: nothing to do", until)
        return 0
    since = window_months(until)[0]
    log.info(
        "window %s..%s: will summarise %s on %s",
        since,
        until,
        ", ".join(work),
        branch_name(until),
    )
    if check:
        return 0
    if REPO != WORKTREE.resolve():
        # setup_commands resets with --force: never in someone's checkout.
        raise RefreshError(f"runs only from {WORKTREE}; use --check here")

    try:
        DOWNLOADS.mkdir(parents=True, exist_ok=True)
        SUMMARIES.mkdir(parents=True, exist_ok=True)
        run(setup_commands(WORKTREE))
        for month in work:
            out = summarise(month, sums, counts)
            shutil.copyfile(out, WORKTREE / MONTHLY / out.name)
        log.info("combining %s..%s", since, until)
        run_script("combine_window.py", "--since", since, "--until", until)
        run(commit_commands(WORKTREE, work, since, until))
    except Exception:
        log.exception("refresh failed")
        notify(f"Popularity refresh failed: see {LOG}")
        return 1
    # Kept until the window moves past them, in case the branch isn't merged
    # before next month's run needs them again.
    keep = {f"{month}.json.gz" for month in window_months(until)}
    for old in SUMMARIES.glob("*.json.gz"):
        if old.name not in keep:
            old.unlink()
    log.info("committed %s; review it and open the PR", branch_name(until))
    notify(f"Stats to {until} are on branch {branch_name(until)}, ready to review.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="say what would be done; only fetches origin/main",
    )
    args = parser.parse_args()

    BASE.mkdir(parents=True, exist_ok=True)
    handlers: List[logging.Handler] = [logging.FileHandler(LOG, encoding="utf-8")]
    if sys.stderr is not None:  # None under pythonw, which the task uses
        handlers.append(logging.StreamHandler())
    logging.basicConfig(
        level=logging.INFO,
        handlers=handlers,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    try:
        return refresh(args.check)
    except Exception:
        # Offline at logon, Lichess down: logged, not notified; tomorrow retries.
        log.exception("refresh did not run")
        return 1


if __name__ == "__main__":
    sys.exit(main())
