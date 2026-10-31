import json
from pathlib import Path
from typing import Dict, List

import pytest

import combine_window
from combine_window import MIN_SAMPLE, build_outputs, load_window, shard_for_fen
from lib.monthly_summary import MonthlySummary

E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
E4_KEY = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"
# The same position as E4 at other move counters: both dataset FENs get its stats.
E4_LATE = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 3 7"
UNPLAYED = "r1b1kbnr/pppp1Npp/8/8/4q3/5n2/PPPPBP1P/RNBQKR2 w Qkq - 2 8"
WINDOW = {"since": "2026-07", "until": "2026-09"}
TODAY = "2026-10-31"


def write_month(directory: Path, month: str, games: Dict[str, int]) -> None:
    """A summary where 1.e4 has `games[band]` white wins at 1500 per band."""
    summary = MonthlySummary(month, games_read=sum(games.values()))
    for band, count in games.items():
        for _ in range(count):
            summary.add(E4_KEY, band, "1-0", "e5", 1500)
    summary.write(directory / f"{month}.json.gz")


def window_dir(tmp_path: Path, games: Dict[str, int]) -> Path:
    for month in ("2026-07", "2026-08", "2026-09"):
        write_month(tmp_path, month, games)
    return tmp_path


def outputs(tmp_path: Path, games: Dict[str, int], fens: List[str]):
    summary = load_window(window_dir(tmp_path, games), "2026-07", "2026-09")
    return build_outputs(summary, fens, WINDOW, TODAY)


def test_sums_months(tmp_path: Path) -> None:
    stats, bands, _ = outputs(tmp_path, {"1400": 10, "1800": 20}, [E4])
    assert bands["positions"][E4]["1400"] == {"g": 30, "w": 30, "d": 0, "b": 0}
    assert bands["positions"][E4]["1800"]["g"] == 60
    assert stats["positions"][E4]["games_analyzed"] == 90


def test_missing_month_fails(tmp_path: Path) -> None:
    write_month(tmp_path, "2026-07", {"1400": 30})
    write_month(tmp_path, "2026-09", {"1400": 30})
    with pytest.raises(FileNotFoundError, match="2026-08"):
        load_window(tmp_path, "2026-07", "2026-09")


def test_month_label_must_match_file(tmp_path: Path) -> None:
    write_month(tmp_path, "2026-07", {"1400": 30})
    (tmp_path / "2026-07.json.gz").rename(tmp_path / "2026-08.json.gz")
    write_month(tmp_path, "2026-07", {"1400": 30})
    write_month(tmp_path, "2026-09", {"1400": 30})
    with pytest.raises(ValueError, match="2026-08"):
        load_window(tmp_path, "2026-07", "2026-09")


def test_thin_band_is_null(tmp_path: Path) -> None:
    # 3 months x 6 games = 18, under MIN_SAMPLE.
    assert MIN_SAMPLE == 20
    _, bands, shards = outputs(tmp_path, {"2200": 6, "1400": 10}, [E4])
    assert bands["positions"][E4]["2200"] is None
    assert bands["positions"][E4]["u1400"] is None
    shard = shards[shard_for_fen(E4)]["positions"][E4]
    assert shard["bands"]["2200"] is None
    assert shard["bands"]["1400"]["g"] == 30


def test_all_band_is_sum_of_bands(tmp_path: Path) -> None:
    stats, _, shards = outputs(
        tmp_path, {"u1400": 10, "1400": 10, "1800": 10, "2200": 10}, [E4]
    )
    entry = stats["positions"][E4]
    assert entry["games_analyzed"] == entry["frequency_count"] == 120
    assert entry["white_win_rate"] == 1.0
    assert entry["draw_rate"] == 0.0 and entry["black_win_rate"] == 0.0
    assert entry["avg_rating"] == 1500
    every = shards[shard_for_fen(E4)]["positions"][E4]["bands"]["all"]
    assert every["g"] == 120
    assert every["moves"] == [{"san": "e5", "g": 120, "w": 120, "d": 0, "b": 0}]


def test_keys_map_back_to_dataset_fens(tmp_path: Path) -> None:
    stats, bands, _ = outputs(tmp_path, {"1400": 10}, [E4, E4_LATE])
    assert set(stats["positions"]) == {E4, E4_LATE}
    assert stats["positions"][E4_LATE]["games_analyzed"] == 30
    assert bands["positions"][E4_LATE]["1400"]["g"] == 30


def test_position_without_games_keeps_nulls(tmp_path: Path) -> None:
    # The 16 positions the live file holds with no games: null rates, never 0%.
    stats, bands, shards = outputs(tmp_path, {"1400": 10}, [E4, UNPLAYED])
    entry = stats["positions"][UNPLAYED]
    assert entry["games_analyzed"] == 0
    assert entry["white_win_rate"] is None
    assert entry["draw_rate"] is None and entry["black_win_rate"] is None
    assert entry["avg_rating"] is None
    assert entry["popularity_score"] == 0 and entry["confidence_score"] == 0.0
    assert entry["analysis_date"] == TODAY
    assert bands["positions"][UNPLAYED] == {
        "u1400": None,
        "1400": None,
        "1800": None,
        "2200": None,
    }
    assert shards[shard_for_fen(UNPLAYED)]["positions"][UNPLAYED]["bands"] == {
        "all": None,
        "u1400": None,
        "1400": None,
        "1800": None,
        "2200": None,
    }


def test_thin_position_has_no_rates(tmp_path: Path) -> None:
    # 3 months x 6 games = 18: the real count, but no win rates or rating.
    stats, _, _ = outputs(tmp_path, {"1400": 6}, [E4])
    entry = stats["positions"][E4]
    assert entry["games_analyzed"] == entry["frequency_count"] == 18
    assert entry["white_win_rate"] is None
    assert entry["draw_rate"] is None and entry["black_win_rate"] is None
    assert entry["avg_rating"] is None


def test_metadata_records_window(tmp_path: Path) -> None:
    stats, bands, shards = outputs(tmp_path, {"1400": 10}, [E4])
    assert stats["metadata"]["window"] == WINDOW
    assert stats["metadata"]["speeds"] == ["blitz", "rapid", "classical"]
    assert stats["metadata"]["analysis_method"] == "game files"
    assert stats["metadata"]["total_positions"] == 1
    assert bands["window"] == WINDOW
    assert shards[shard_for_fen(E4)]["window"] == WINDOW


def test_fields_live_readers_require(tmp_path: Path) -> None:
    # validatePopularityStats in popularity-stats-service.js.
    stats, _, _ = outputs(tmp_path, {"1400": 10}, [E4])
    entry = stats["positions"][E4]
    for field, kind in [
        ("popularity_score", int),
        ("frequency_count", int),
        ("games_analyzed", int),
        ("confidence_score", float),
        ("analysis_date", str),
    ]:
        assert isinstance(entry[field], kind), field


def test_popularity_score_is_decile_of_games() -> None:
    # Deciles over positions that have games; no games scores 0.
    counts = list(range(1, 101))
    scores = combine_window.popularity_scores([0] + counts)
    assert scores[0] == 0
    assert scores[1] == 1 and scores[10] == 1 and scores[11] == 2
    assert scores[-1] == 10
    assert scores[1:] == sorted(scores[1:])


@pytest.mark.parametrize(
    "games, confidence",
    [(0, 0.0), (1, 0.4), (10, 0.6), (100, 0.8), (1000, 1.0)],
)
def test_confidence_tiers(games: int, confidence: float) -> None:
    assert combine_window.confidence(games) == confidence


def test_shard_hash_matches_middleware() -> None:
    # Golden values from tests/unit/seo-lookup-shards.test.js, at 16 shards.
    fens = [
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2",
    ]
    assert [shard_for_fen(fen, 16) for fen in fens] == [11, 8, 12, 13]


def test_writes_atomically_and_round_trips(tmp_path: Path) -> None:
    stats, bands, shards = outputs(tmp_path / "in", {"1400": 10}, [E4])
    out = tmp_path / "out"
    combine_window.write_outputs(out, stats, bands, shards)
    assert json.loads((out / "popularity_stats.json").read_text("utf-8")) == stats
    assert json.loads((out / "popularity-bands.json").read_text("utf-8")) == bands
    name = f"{shard_for_fen(E4):02d}.json"
    assert json.loads((out / "position-stats" / name).read_text("utf-8")) == (
        shards[shard_for_fen(E4)]
    )
    assert (
        len(list((out / "position-stats").glob("*.json")))
        == combine_window.SHARD_COUNT
        == 256
    )
    assert not list(out.rglob("*.tmp"))


def test_oversized_shard_writes_nothing(tmp_path: Path, monkeypatch) -> None:
    # The page endpoint reads one shard per request; a large one costs every view.
    stats, bands, shards = outputs(tmp_path / "in", {"1400": 10}, [E4])
    monkeypatch.setattr(combine_window, "MAX_SHARD_BYTES", 100)
    out = tmp_path / "out"
    with pytest.raises(ValueError, match="shard"):
        combine_window.write_outputs(out, stats, bands, shards)
    assert not out.exists() or not any(out.rglob("*"))


def test_failed_write_replaces_nothing(tmp_path: Path, monkeypatch) -> None:
    # Files from different windows must never be served side by side.
    stats, bands, shards = outputs(tmp_path / "in", {"1400": 10}, [E4])
    out = tmp_path / "out"
    (out / "position-stats").mkdir(parents=True)
    (out / "popularity_stats.json").write_text("old", encoding="utf-8")
    real_write = Path.write_text
    calls = []

    def flaky(self, *args, **kwargs):
        calls.append(self)
        if len(calls) == 3:
            raise OSError("disk full")
        return real_write(self, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", flaky)
    with pytest.raises(OSError):
        combine_window.write_outputs(out, stats, bands, shards)
    monkeypatch.undo()
    assert (out / "popularity_stats.json").read_text(encoding="utf-8") == "old"
    assert not list(out.rglob("*.tmp"))
