import hashlib
import datetime
from pathlib import Path

import pytest

import refresh
from lib.monthly_summary import MonthlySummary

PUBLISHED = {refresh.file_name(m) for m in ["2026-08", "2026-09"]}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class FakeResponse:
    def __init__(self, status_code: int, body: bytes, headers=None) -> None:
        self.status_code = status_code
        self.body = body
        self.headers = headers or {}

    def raise_for_status(self) -> None:
        pass

    def iter_content(self, chunk_size: int):
        yield self.body

    def __enter__(self):
        return self

    def __exit__(self, *exc) -> None:
        pass


def test_last_month_and_window_cross_the_year() -> None:
    assert refresh.last_month(datetime.date(2027, 1, 5)) == "2026-12"
    assert refresh.window_months("2027-01") == ["2026-11", "2026-12", "2027-01"]


def test_no_work_when_summary_exists() -> None:
    work = refresh.find_work(
        "2026-09",
        on_main=lambda m: True,
        waiting_for_review=lambda m: False,
        published=PUBLISHED,
    )
    assert work == []


def test_no_work_while_a_branch_waits_for_review() -> None:
    work = refresh.find_work(
        "2026-09",
        on_main=lambda m: m != "2026-09",
        waiting_for_review=lambda m: True,
        published=PUBLISHED,
    )
    assert work == []


def test_no_work_when_month_not_yet_published() -> None:
    work = refresh.find_work(
        "2026-10",
        on_main=lambda m: m != "2026-10",
        waiting_for_review=lambda m: False,
        published=PUBLISHED,
    )
    assert work == []


def test_work_is_every_month_the_window_lacks() -> None:
    # The PC was off all of September's refresh: both months are summarised.
    work = refresh.find_work(
        "2026-09",
        on_main=lambda m: m == "2026-07",
        waiting_for_review=lambda m: False,
        published=PUBLISHED,
    )
    assert work == ["2026-08", "2026-09"]


def test_listings_parsed() -> None:
    name = refresh.file_name("2026-09")
    assert refresh.parse_sha256sums(f"abc123  {name}\n") == {name: "abc123"}
    assert refresh.parse_counts(f"{name} 89616462\n\n") == {name: 89616462}


def test_checksum_mismatch_aborts_and_deletes_the_file(tmp_path: Path) -> None:
    path = tmp_path / "month.pgn.zst"
    path.write_bytes(b"corrupt")
    with pytest.raises(refresh.RefreshError, match="SHA-256"):
        refresh.verify_checksum(path, sha(b"expected"))
    assert not path.exists()


def test_download_resumes_a_partial_file(tmp_path: Path) -> None:
    dest = tmp_path / "month.pgn.zst"
    dest.with_name(dest.name + ".part").write_bytes(b"abc")
    seen = {}

    def get(url, headers, stream, timeout):
        seen["range"] = headers.get("Range")
        return FakeResponse(206, b"def")

    refresh.download("https://example", dest, sha(b"abcdef"), get=get)
    assert seen["range"] == "bytes=3-"
    assert dest.read_bytes() == b"abcdef"
    assert not dest.with_name(dest.name + ".part").exists()


def test_download_finished_before_an_interruption_is_kept(tmp_path: Path) -> None:
    # Shut down while hashing: the .part is whole, so Lichess answers 416.
    dest = tmp_path / "month.pgn.zst"
    dest.with_name(dest.name + ".part").write_bytes(b"abcdef")
    refresh.download(
        "https://example",
        dest,
        sha(b"abcdef"),
        get=lambda url, headers, stream, timeout: FakeResponse(416, b""),
    )
    assert dest.read_bytes() == b"abcdef"


def test_download_restarts_when_the_server_ignores_the_range(tmp_path: Path) -> None:
    dest = tmp_path / "month.pgn.zst"
    dest.with_name(dest.name + ".part").write_bytes(b"stale")
    refresh.download(
        "https://example",
        dest,
        sha(b"abcdef"),
        get=lambda url, headers, stream, timeout: FakeResponse(200, b"abcdef"),
    )
    assert dest.read_bytes() == b"abcdef"


def test_a_cut_short_download_is_kept_to_resume(tmp_path: Path) -> None:
    dest = tmp_path / "month.pgn.zst"
    part = dest.with_name(dest.name + ".part")
    with pytest.raises(refresh.RefreshError, match="cut short"):
        refresh.download(
            "https://example",
            dest,
            sha(b"abcdef"),
            get=lambda url, headers, stream, timeout: FakeResponse(
                200, b"abc", {"Content-Length": "6"}
            ),
        )
    assert part.read_bytes() == b"abc"


def test_size_read_from_a_resumed_response() -> None:
    assert refresh.expected_size({"Content-Range": "bytes 3-5/6"}, 3) == 6
    assert refresh.expected_size({"Content-Length": "3"}, 3) == 6
    assert refresh.expected_size({}, 0) is None


def test_summary_with_the_wrong_game_count_is_deleted(tmp_path: Path) -> None:
    path = tmp_path / "2026-09.json.gz"
    summary = MonthlySummary("2026-09", games_read=99)
    summary.write(path)
    assert not refresh.summary_is_complete(path, expected_games=100)
    assert not path.exists()
    summary.write(path)
    assert refresh.summary_is_complete(path, expected_games=99)


def test_unreadable_summary_is_deleted(tmp_path: Path) -> None:
    path = tmp_path / "2026-09.json.gz"
    path.write_bytes(b"not gzip")
    assert not refresh.summary_is_complete(path, expected_games=1)
    assert not path.exists()


def test_summary_written_atomically(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "2026-09.json.gz"
    MonthlySummary("2026-09", games_read=1).write(path)

    def fail(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr("lib.monthly_summary.json.dump", fail)
    with pytest.raises(OSError):
        MonthlySummary("2026-09", games_read=2).write(path)
    # The old summary survives whole, and no temporary file is left to commit.
    assert MonthlySummary.read(path).games_read == 1
    assert list(tmp_path.iterdir()) == [path]


def test_commit_stages_only_the_data(tmp_path: Path) -> None:
    branch, add, commit, detach = refresh.commit_commands(
        tmp_path, ["2026-09"], "2026-07", "2026-09"
    )
    # The branch is made only here, once there is data to commit.
    assert branch[-2:] == ["-B", "data/popularity-2026-09"]
    assert detach[-2:] == ["checkout", "--detach"]
    paths = add[add.index("--") + 1 :]
    assert paths == [
        "tools/analysis/data/monthly/2026-09.json.gz",
        "api/data/popularity_stats.json",
        "api/data/popularity-bands.json",
        "api/data/position-stats/*.json",
    ]
    assert "refresh popularity stats to 2026-07–2026-09" in " ".join(commit)


def test_never_calls_git_push(tmp_path: Path) -> None:
    commands = refresh.setup_commands(tmp_path) + refresh.commit_commands(
        tmp_path, ["2026-09"], "2026-07", "2026-09"
    )
    assert commands and all(command[0] == "git" for command in commands)
    assert not any("push" in command for command in commands)
    with pytest.raises(refresh.RefreshError, match="never pushes"):
        refresh.git(["push", "origin", "main"])


def test_notification_text_is_quoted_for_powershell() -> None:
    assert refresh.powershell_quote("C:/Users/o'brien") == "'C:/Users/o''brien'"


def test_a_bare_branch_from_a_failed_run_does_not_count_as_done() -> None:
    # The branch exists from the first step of the run; only the summary
    # committed to it means the month is waiting for review.
    assert refresh.has_summary_args(
        "refs/heads/data/popularity-2026-09", "2026-09"
    ) == [
        "cat-file",
        "-e",
        "refs/heads/data/popularity-2026-09:tools/analysis/data/monthly/2026-09.json.gz",
    ]


def test_setup_never_makes_the_review_branch(tmp_path: Path) -> None:
    assert not any("-B" in command for command in refresh.setup_commands(tmp_path))
