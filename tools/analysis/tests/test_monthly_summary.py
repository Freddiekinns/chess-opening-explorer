import json
from pathlib import Path

from lib.monthly_summary import MAX_MOVES, MonthlySummary

KEY = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"


def test_results_tallied() -> None:
    summary = MonthlySummary("2026-09")
    summary.add(KEY, "1400", "1-0", "e4", 1500)
    summary.add(KEY, "1400", "1/2-1/2", "e4", 1500)
    summary.add(KEY, "1400", "0-1", "d4", 1500)
    band = summary.to_dict()["positions"][KEY]["1400"]
    assert (band["g"], band["w"], band["d"], band["b"]) == (3, 1, 1, 1)
    assert band["moves"]["e4"] == {"g": 2, "w": 1, "d": 1, "b": 0}
    assert band["moves"]["d4"] == {"g": 1, "w": 0, "d": 0, "b": 1}


def test_game_ending_on_position_counts_without_a_move() -> None:
    summary = MonthlySummary("2026-09")
    summary.add(KEY, "1400", "1-0", None, 1500)
    band = summary.to_dict()["positions"][KEY]["1400"]
    assert band["g"] == 1 and band["moves"] == {}


def test_moves_trimmed_to_most_played() -> None:
    summary = MonthlySummary("2026-09")
    sans = [f"m{i}" for i in range(MAX_MOVES + 3)]
    for count, san in enumerate(sans, start=1):
        for _ in range(count):
            summary.add(KEY, "1800", "1-0", san, 1500)
    moves = summary.to_dict()["positions"][KEY]["1800"]["moves"]
    assert MAX_MOVES == 12
    assert set(moves) == set(sans[-MAX_MOVES:])
    # Position totals still count the trimmed moves' games.
    assert summary.to_dict()["positions"][KEY]["1800"]["g"] == sum(
        range(1, len(sans) + 1)
    )


def test_rating_total_recorded_and_merged() -> None:
    left, right = MonthlySummary("2026-09"), MonthlySummary("2026-09")
    left.add(KEY, "1400", "1-0", "e4", 1500.5)
    right.add(KEY, "1400", "0-1", "d4", 1600.0)
    left.merge(right)
    band = left.to_dict()["positions"][KEY]["1400"]
    # The total, so averages stay exact across months: r / g.
    assert band["r"] == 3100 and band["g"] == 2
    assert "r" not in band["moves"]["e4"]


def test_empty_band_omitted() -> None:
    summary = MonthlySummary("2026-09")
    summary.add(KEY, "2200", "1-0", "e4", 1500)
    assert list(summary.to_dict()["positions"][KEY]) == ["2200"]


def test_merge_adds_counts() -> None:
    left, right = MonthlySummary("2026-09"), MonthlySummary("2026-09")
    left.add(KEY, "1400", "1-0", "e4", 1500)
    right.add(KEY, "1400", "0-1", "e4", 1500)
    right.games_read = 5
    left.merge(right)
    assert left.to_dict()["positions"][KEY]["1400"]["moves"]["e4"] == {
        "g": 2,
        "w": 1,
        "d": 0,
        "b": 1,
    }
    assert left.games_read == 5


def test_write_records_month_and_speeds(tmp_path: Path) -> None:
    summary = MonthlySummary("2026-09")
    summary.add(KEY, "1400", "1-0", "e4", 1500)
    path = tmp_path / "2026-09.json"
    summary.write(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["month"] == "2026-09"
    assert data["speeds"] == ["blitz", "rapid", "classical"]
    assert data["positions"][KEY]["1400"]["g"] == 1


def test_gzipped_summary_round_trips(tmp_path: Path) -> None:
    summary = MonthlySummary("2026-09", games_read=7)
    summary.add(KEY, "1400", "1-0", "e4", 1500)
    summary.add(KEY, "1400", "0-1", None, 1700)
    path = tmp_path / "2026-09.json.gz"
    summary.write(path)
    assert path.read_bytes()[:2] == b"\x1f\x8b"
    again = MonthlySummary.read(path)
    assert again.to_dict() == summary.to_dict()


def test_summary_counted_at_other_speeds_rejected(tmp_path: Path) -> None:
    import gzip

    import pytest

    path = tmp_path / "2026-09.json.gz"
    MonthlySummary("2026-09").write(path)
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        data = json.load(handle)
    data["speeds"] = ["bullet", "blitz", "rapid", "classical"]
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        json.dump(data, handle)
    with pytest.raises(ValueError, match="speeds"):
        MonthlySummary.read(path)
