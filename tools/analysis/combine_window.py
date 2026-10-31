#!/usr/bin/env python3
"""
Combine a window of monthly summaries into the files the site serves.

    python -I combine_window.py --since 2026-07 --until 2026-09

Reads data/monthly/<month>.json.gz for every month in the window (a missing
month aborts; the window never silently shrinks) and writes, under api/data/:

- popularity_stats.json: the all-ratings figures per dataset FEN, in the
  shape its readers already use, plus metadata.window.
- popularity-bands.json: per FEN, per band {g, w, d, b}, or null under
  MIN_SAMPLE games. Browse and search read this.
- position-stats/NN.json: per FEN, every band with its average rating and
  next moves, in 256 shards by the hash middleware.ts uses. The page endpoint
  reads one shard per request.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from lib.game_processor import position_key
from lib.monthly_summary import MAX_MOVES, SPEED_ORDER, BandTally, MonthlySummary, Tally

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT.parent.parent / "api" / "data"
ECO_DIR = DATA_DIR / "eco"
MONTHLY_DIR = ROOT / "data" / "monthly"

BANDS = ["u1400", "1400", "1800", "2200"]
# Fewer games than this and a band shows "no stats" (MIN_MOVE_SAMPLE in
# bookExplorerMerge.ts).
MIN_SAMPLE = 20
# Not middleware.ts's 96: five bands of moves are ~2 KB a position, and the
# page endpoint reads one whole shard per request. Same hash, more shards.
SHARD_COUNT = 256
MAX_SHARD_BYTES = 250_000


def month_range(since: str, until: str) -> List[str]:
    year, month = (int(part) for part in since.split("-"))
    end = tuple(int(part) for part in until.split("-"))
    months = []
    while (year, month) <= end:
        months.append(f"{year:04d}-{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    if not months:
        raise ValueError(f"empty window {since}..{until}")
    return months


def load_window(directory: Path, since: str, until: str) -> MonthlySummary:
    total = MonthlySummary(f"{since}..{until}")
    for month in month_range(since, until):
        path = directory / f"{month}.json.gz"
        if not path.exists():
            raise FileNotFoundError(f"no summary for {month} at {path}")
        summary = MonthlySummary.read(path)
        if summary.month != month:
            raise ValueError(f"{path} holds {summary.month}, expected {month}")
        total.merge(summary)
    return total


def shard_for_fen(fen: str, count: int = SHARD_COUNT) -> int:
    """djb2, as shardForFen in middleware.ts and generate-seo-lookup.js."""
    value = 5381
    for char in fen:
        value = (value * 33 + ord(char)) & 0xFFFFFFFF
    return value % count


def popularity_scores(games: List[int]) -> List[int]:
    """1-10 by decile of games among positions that have any; 0 for none."""
    played = sorted(count for count in games if count > 0)
    if not played:
        return [0] * len(games)
    thresholds = [played[max(int(i / 10 * len(played)) - 1, 0)] for i in range(1, 11)]
    scores = []
    for count in games:
        if count == 0:
            scores.append(0)
        else:
            scores.append(min(1 + sum(count > limit for limit in thresholds), 10))
    return scores


def confidence(games: int) -> float:
    if games >= 1000:
        return 1.0
    if games >= 100:
        return 0.8
    if games >= 10:
        return 0.6
    if games >= 1:
        return 0.4
    return 0.0


def _all_band(bands: Dict[str, BandTally]) -> BandTally:
    every = BandTally()
    for tally in bands.values():
        every.merge(tally)
        for san, move in tally.moves.items():
            every.moves.setdefault(san, Tally()).merge(move)
    return every


def _counts(tally: Optional[BandTally]) -> Optional[dict]:
    if tally is None or tally.g < MIN_SAMPLE:
        return None
    return {"g": tally.g, "w": tally.w, "d": tally.d, "b": tally.b}


def _detail(tally: Optional[BandTally]) -> Optional[dict]:
    counts = _counts(tally)
    if counts is None:
        return None
    top = sorted(tally.moves.items(), key=lambda item: (-item[1].g, item[0]))
    return {
        **counts,
        "avg_rating": round(tally.r / tally.g),
        "moves": [{"san": san, **move.to_dict()} for san, move in top[:MAX_MOVES]],
    }


def build_outputs(
    summary: MonthlySummary, dataset_fens: List[str], window: dict, today: str
) -> Tuple[dict, dict, Dict[int, dict]]:
    stats_positions: Dict[str, dict] = {}
    band_positions: Dict[str, dict] = {}
    shards: Dict[int, dict] = {
        index: {"window": window, "positions": {}} for index in range(SHARD_COUNT)
    }
    every_by_fen = {}
    for fen in dataset_fens:
        bands = summary.positions.get(position_key(fen), {})
        every = _all_band(bands)
        every_by_fen[fen] = every
        band_positions[fen] = {band: _counts(bands.get(band)) for band in BANDS}
        shards[shard_for_fen(fen)]["positions"][fen] = {
            "bands": {
                "all": _detail(every),
                **{band: _detail(bands.get(band)) for band in BANDS},
            }
        }

    scores = popularity_scores([every_by_fen[fen].g for fen in dataset_fens])
    for fen, score in zip(dataset_fens, scores):
        every = every_by_fen[fen]
        # The real count either way; rates only once they mean something.
        played = every.g >= MIN_SAMPLE
        stats_positions[fen] = {
            "popularity_score": score,
            "frequency_count": every.g,
            "white_win_rate": every.w / every.g if played else None,
            "black_win_rate": every.b / every.g if played else None,
            "draw_rate": every.d / every.g if played else None,
            "games_analyzed": every.g,
            "avg_rating": round(every.r / every.g) if played else None,
            "confidence_score": confidence(every.g),
            "analysis_date": today,
        }

    stats = {
        "positions": stats_positions,
        "metadata": {
            "total_positions": len(dataset_fens),
            "window": window,
            "speeds": SPEED_ORDER,
            "analysis_date": today,
            "data_source": "Lichess monthly database (database.lichess.org), "
            "rated games, bots and abandoned games excluded",
            "analysis_method": "game files",
        },
    }
    return stats, {"window": window, "positions": band_positions}, shards


def _dump(data: dict) -> str:
    return json.dumps(data, separators=(",", ":"), sort_keys=True)


def write_outputs(
    out_dir: Path, stats: dict, bands: dict, shards: Dict[int, dict]
) -> None:
    """Serialises and checks everything, writes every .tmp, then swaps them in.

    A failure before the swap leaves the old files untouched and no .tmp
    behind, so files from two windows are never served together.
    """
    files = {
        out_dir / "popularity_stats.json": _dump(stats),
        out_dir / "popularity-bands.json": _dump(bands),
    }
    for index, shard in shards.items():
        text = _dump(shard)
        if len(text.encode("utf-8")) > MAX_SHARD_BYTES:
            raise ValueError(
                f"shard {index:02d} is {len(text):,} bytes, over {MAX_SHARD_BYTES:,}"
            )
        files[out_dir / "position-stats" / f"{index:02d}.json"] = text

    staged = []
    try:
        for path, text in files.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(path.name + ".tmp")
            staged.append((tmp, path))
            tmp.write_text(text, encoding="utf-8")
    except OSError:
        for tmp, _ in staged:
            tmp.unlink(missing_ok=True)
        raise
    for tmp, path in staged:
        tmp.replace(path)


def load_dataset_fens() -> List[str]:
    fens = set()
    for path in sorted(ECO_DIR.glob("eco*.json")):
        with path.open(encoding="utf-8") as handle:
            fens.update(json.load(handle).keys())
    return sorted(fens)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--since", required=True, help="first month, YYYY-MM")
    parser.add_argument("--until", required=True, help="last month, YYYY-MM")
    parser.add_argument("--monthly-dir", type=Path, default=MONTHLY_DIR)
    parser.add_argument("--out-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()

    summary = load_window(args.monthly_dir, args.since, args.until)
    window = {"since": args.since, "until": args.until}
    today = datetime.date.today().isoformat()
    stats, bands, shards = build_outputs(summary, load_dataset_fens(), window, today)
    write_outputs(args.out_dir, stats, bands, shards)

    largest = max(len(_dump(shard)) for shard in shards.values())
    print(f"window {args.since}..{args.until}: {summary.games_read:,} games read")
    print(f"{len(stats['positions']):,} positions; largest shard {largest:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
