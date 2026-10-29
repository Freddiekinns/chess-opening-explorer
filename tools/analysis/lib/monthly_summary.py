#!/usr/bin/env python3
"""
One month of Lichess games, reduced to per-position, per-band counts.

A summary is what the pipeline keeps instead of the games: a few MB per
month, so a window of months can be re-summed without downloading anything
again (see combine_window.py).
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

from .game_processor import COUNTED_SPEEDS

# Moves kept per position and band, matching MAX_MOVES in explorer.routes.js.
MAX_MOVES = 12

SPEED_ORDER = ["blitz", "rapid", "classical"]


@dataclass
class Tally:
    g: int = 0
    w: int = 0
    d: int = 0
    b: int = 0

    def add(self, result: str) -> None:
        self.g += 1
        if result == "1-0":
            self.w += 1
        elif result == "0-1":
            self.b += 1
        else:
            self.d += 1

    def merge(self, other: "Tally") -> None:
        self.g += other.g
        self.w += other.w
        self.d += other.d
        self.b += other.b

    def to_dict(self) -> Dict[str, int]:
        return {"g": self.g, "w": self.w, "d": self.d, "b": self.b}


@dataclass
class BandTally(Tally):
    moves: Dict[str, Tally] = field(default_factory=dict)


@dataclass
class MonthlySummary:
    month: str
    positions: Dict[str, Dict[str, BandTally]] = field(default_factory=dict)
    games_read: int = 0

    def add(self, key: str, band: str, result: str, next_san: Optional[str]) -> None:
        tally = self.positions.setdefault(key, {}).setdefault(band, BandTally())
        tally.add(result)
        if next_san is not None:
            tally.moves.setdefault(next_san, Tally()).add(result)

    def merge(self, other: "MonthlySummary") -> None:
        self.games_read += other.games_read
        for key, bands in other.positions.items():
            for band, theirs in bands.items():
                ours = self.positions.setdefault(key, {}).setdefault(band, BandTally())
                ours.merge(theirs)
                for san, move in theirs.moves.items():
                    ours.moves.setdefault(san, Tally()).merge(move)

    def to_dict(self) -> dict:
        positions = {}
        for key, bands in self.positions.items():
            positions[key] = {}
            for band, tally in bands.items():
                top = sorted(
                    tally.moves.items(), key=lambda item: item[1].g, reverse=True
                )[:MAX_MOVES]
                positions[key][band] = {
                    **tally.to_dict(),
                    "moves": {san: move.to_dict() for san, move in top},
                }
        return {
            "month": self.month,
            "speeds": [speed for speed in SPEED_ORDER if speed in COUNTED_SPEEDS],
            "games_read": self.games_read,
            "positions": positions,
        }

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(self.to_dict(), handle, separators=(",", ":"), sort_keys=True)
