#!/usr/bin/env python3
"""
Check a monthly summary against the Lichess explorer for the same month.

    LICHESS_TOKEN=... python crosscheck_explorer.py data/monthly/2026-09.json

Takes 20 positions spread across the popularity range and asks the explorer
for each band with the same speeds and month: 80 requests, paced under the
token's 25 per minute. Use a personal token, never the production one.
Prints each cell's gap and exits non-zero if any total is off by more than 2%.
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict

import requests

from lib.monthly_summary import SPEED_ORDER

EXPLORER = "https://explorer.lichess.org/lichess"
# Same rating buckets per band as BAND_RATINGS in explorer.routes.js.
BAND_RATINGS: Dict[str, str] = {
    "u1400": "0,1000,1200",
    "1400": "1400,1600",
    "1800": "1800,2000",
    "2200": "2200,2500",
}
SAMPLE = 20
TOLERANCE = 0.02
PAUSE_SECONDS = 2.6


def main() -> int:
    token = os.environ.get("LICHESS_TOKEN")
    if not token:
        print("Set LICHESS_TOKEN to a personal Lichess token.", file=sys.stderr)
        return 2
    summary = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    month = summary["month"]
    positions = summary["positions"]

    by_games = sorted(
        positions,
        key=lambda key: sum(band["g"] for band in positions[key].values()),
        reverse=True,
    )
    step = max(len(by_games) // SAMPLE, 1)
    sample = by_games[::step][:SAMPLE]

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    worst = 0.0
    print(f"{'band':>6} {'ours':>10} {'explorer':>10} {'gap':>7}  position")
    for key in sample:
        for band, ratings in BAND_RATINGS.items():
            response = session.get(
                EXPLORER,
                params={
                    "variant": "standard",
                    "speeds": ",".join(SPEED_ORDER),
                    "ratings": ratings,
                    "fen": f"{key} 0 1",
                    "since": month,
                    "until": month,
                    "moves": 0,
                    "topGames": 0,
                    "recentGames": 0,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            theirs = data["white"] + data["draws"] + data["black"]
            ours = positions[key].get(band, {}).get("g", 0)
            gap = abs(ours - theirs) / theirs if theirs else (0.0 if not ours else 1.0)
            worst = max(worst, gap)
            print(f"{band:>6} {ours:>10,} {theirs:>10,} {gap:>7.2%}  {key}")
            time.sleep(PAUSE_SECONDS)

    print(f"worst gap {worst:.2%} (tolerance {TOLERANCE:.0%})")
    return 0 if worst <= TOLERANCE else 1


if __name__ == "__main__":
    sys.exit(main())
