#!/usr/bin/env python3
"""
Summarise one Lichess monthly database file into per-position band counts.

    python -I summarise_month.py --month 2026-09 [--file path.pgn.zst] [--limit N]

Streams the file (from disk with --file, otherwise straight from
database.lichess.org), keeps blitz, rapid and classical games, and writes
data/monthly/<month>.json.gz. The games themselves are never stored.
"""

import argparse
import io
import json
import sys
import time
from multiprocessing import Pool
from pathlib import Path
from typing import BinaryIO, Iterator, List, Optional

import requests
import zstandard as zstd

from lib.game_processor import BandGameProcessor
from lib.monthly_summary import MonthlySummary

ROOT = Path(__file__).resolve().parent
ECO_DIR = ROOT.parent.parent / "api" / "data" / "eco"
OUT_DIR = ROOT / "data" / "monthly"
URL = "https://database.lichess.org/standard/lichess_db_standard_rated_{month}.pgn.zst"
BATCH_SIZE = 20000
GAME_START = "[Event "

_processor: Optional[BandGameProcessor] = None
_summary: Optional[MonthlySummary] = None


def load_target_fens() -> set:
    fens = set()
    for path in sorted(ECO_DIR.glob("eco*.json")):
        with path.open(encoding="utf-8") as handle:
            fens.update(json.load(handle).keys())
    return fens


def _init_worker(target_fens: set, month: str) -> None:
    global _processor, _summary
    _summary = MonthlySummary(month)
    _processor = BandGameProcessor(target_fens, _summary.add)


def _process_batch(games: List[str]) -> MonthlySummary:
    for game in games:
        _processor.process_game(game)
    partial = MonthlySummary(
        _summary.month, positions=_summary.positions, games_read=len(games)
    )
    _summary.positions = {}
    return partial


def iter_games(raw: BinaryIO, limit: Optional[int]) -> Iterator[str]:
    """One PGN text per game. A game starts at each '[Event ' line."""
    reader = zstd.ZstdDecompressor().stream_reader(raw)
    text = io.TextIOWrapper(reader, encoding="utf-8", errors="replace")
    current: List[str] = []
    count = 0
    for line in text:
        if line.startswith(GAME_START) and current:
            yield "".join(current)
            count += 1
            if limit is not None and count >= limit:
                return
            current = []
        current.append(line)
    if current:
        yield "".join(current)


def iter_batches(games: Iterator[str]) -> Iterator[List[str]]:
    batch: List[str] = []
    for game in games:
        batch.append(game)
        if len(batch) == BATCH_SIZE:
            yield batch
            batch = []
    if batch:
        yield batch


def summarise(
    raw: BinaryIO, month: str, limit: Optional[int], workers: int
) -> MonthlySummary:
    target_fens = load_target_fens()
    total = MonthlySummary(month)
    start = time.time()
    with Pool(workers, initializer=_init_worker, initargs=(target_fens, month)) as pool:
        for partial in pool.imap_unordered(
            _process_batch, iter_batches(iter_games(raw, limit))
        ):
            total.merge(partial)
            if total.games_read % (BATCH_SIZE * 50) < BATCH_SIZE:
                rate = total.games_read / (time.time() - start)
                print(f"{total.games_read:>12,} games  {rate:,.0f}/s", flush=True)
    rate = total.games_read / max(time.time() - start, 1e-9)
    print(
        f"done: {total.games_read:,} games in {time.time() - start:,.0f}s ({rate:,.0f}/s)",
        flush=True,
    )
    return total


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--month", required=True, help="YYYY-MM")
    parser.add_argument(
        "--file", type=Path, help="local .pgn.zst; streams from Lichess when omitted"
    )
    parser.add_argument(
        "--limit", type=int, help="stop after N games (a sample, not a summary to keep)"
    )
    parser.add_argument("--workers", type=int, default=11)
    parser.add_argument(
        "--out", type=Path, help="output path; default data/monthly/<month>.json.gz"
    )
    args = parser.parse_args()
    if args.limit and not args.out:
        # A sample written to the default path would be summed as a real month.
        parser.error("--limit needs --out, away from data/monthly/")

    out = args.out or OUT_DIR / f"{args.month}.json.gz"
    if args.file:
        with args.file.open("rb") as raw:
            summary = summarise(raw, args.month, args.limit, args.workers)
    else:
        with requests.get(
            URL.format(month=args.month), stream=True, timeout=60
        ) as response:
            response.raise_for_status()
            summary = summarise(response.raw, args.month, args.limit, args.workers)
    summary.write(out)
    print(f"wrote {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
