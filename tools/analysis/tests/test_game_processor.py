from typing import List, Optional, Tuple

import chess
import pytest

from lib.game_processor import BandGameProcessor, band_of, position_key, speed_of

AFTER_E4_E5_NF3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
AFTER_E4_E5_NF3_NC6 = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"

Call = Tuple[str, str, str, Optional[str]]


def game(
    moves: str,
    time_control: str = "180+2",
    white: int = 1500,
    black: int = 1500,
    result: str = "1-0",
    extra_headers: str = "",
) -> str:
    """A game in the Lichess monthly-dump format, clock comments included."""
    return (
        '[Event "Rated Blitz game"]\n'
        f'[Result "{result}"]\n'
        f'[WhiteElo "{white}"]\n'
        f'[BlackElo "{black}"]\n'
        f'[TimeControl "{time_control}"]\n'
        f"{extra_headers}"
        "\n"
        f"{moves} {result}\n"
    )


def run(pgn: str, targets: List[str]) -> List[Call]:
    """The callback's (key, band, result, next_san); the rating has its own test."""
    calls: List[Call] = []
    processor = BandGameProcessor(set(targets), lambda *args: calls.append(args[:4]))
    processor.process_game(pgn)
    return calls


def test_callback_receives_average_rating() -> None:
    ratings: List[float] = []
    processor = BandGameProcessor(
        {AFTER_E4_E5_NF3}, lambda *args: ratings.append(args[4])
    )
    processor.process_game(game("1. e4 e5 2. Nf3", white=1601, black=1500))
    assert ratings == [1550.5]


def test_position_key_ignores_move_counters() -> None:
    assert position_key(AFTER_E4_E5_NF3) == position_key(
        AFTER_E4_E5_NF3.replace("1 2", "5 9")
    )
    assert (
        position_key(AFTER_E4_E5_NF3)
        == "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -"
    )


def test_position_key_drops_illegal_en_passant_square() -> None:
    # 1.e4 with "e3" written in: no black pawn can take, so it's the same position as "-".
    with_ep = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    assert position_key(with_ep) == position_key(with_ep.replace(" e3 ", " - "))


@pytest.mark.parametrize(
    "avg, band",
    [
        (0, "u1400"),
        (1399.5, "u1400"),
        (1400, "1400"),
        (1799.5, "1400"),
        (1800, "1800"),
        (2199.5, "1800"),
        (2200, "2200"),
        (3000, "2200"),
    ],
)
def test_band_edges(avg: float, band: str) -> None:
    assert band_of(avg) == band


@pytest.mark.parametrize(
    "time_control, speed",
    [
        ("15+0", None),
        ("60+0", None),
        ("120+1", None),
        ("180+0", "blitz"),
        ("300+3", "blitz"),
        ("600+0", "rapid"),
        ("900+10", "rapid"),
        ("1800+0", "classical"),
        ("-", None),
    ],
)
def test_speed_of(time_control: str, speed: Optional[str]) -> None:
    # Lichess's rule: estimated seconds = base + 40 x increment; bullet under 180, blitz under 480, rapid under 1500.
    assert speed_of(time_control) == speed


def test_records_band_result_and_next_move() -> None:
    calls = run(
        game("1. e4 { [%clk 0:03:00] } 1... e5 { [%clk 0:03:00] } 2. Nf3 Nc6 3. Bb5"),
        [AFTER_E4_E5_NF3],
    )
    assert calls == [(position_key(AFTER_E4_E5_NF3), "1400", "1-0", "Nc6")]


def test_transposition_counts() -> None:
    # 1.Nf3 Nc6 2.e4 e5 reaches the same position as 1.e4 e5 2.Nf3 Nc6, at different move counters.
    calls = run(game("1. Nf3 Nc6 2. e4 e5 3. Bb5", result="0-1"), [AFTER_E4_E5_NF3_NC6])
    assert calls == [(position_key(AFTER_E4_E5_NF3_NC6), "1400", "0-1", "Bb5")]


def test_final_position_checked() -> None:
    calls = run(game("1. e4 e5 2. Nf3", result="1/2-1/2"), [AFTER_E4_E5_NF3])
    assert calls == [(position_key(AFTER_E4_E5_NF3), "1400", "1/2-1/2", None)]


def test_repeated_position_counted_once() -> None:
    start = chess.STARTING_FEN
    calls = run(game("1. Nf3 Nf6 2. Ng1 Ng8 3. e4"), [start])
    assert calls == [(position_key(start), "1400", "1-0", "Nf3")]


def test_bullet_skipped() -> None:
    assert run(game("1. e4 e5 2. Nf3", time_control="60+0"), [AFTER_E4_E5_NF3]) == []


def test_correspondence_skipped() -> None:
    assert run(game("1. e4 e5 2. Nf3", time_control="-"), [AFTER_E4_E5_NF3]) == []


def test_unfinished_game_skipped() -> None:
    assert run(game("1. e4 e5 2. Nf3", result="*"), [AFTER_E4_E5_NF3]) == []


def test_bot_game_skipped() -> None:
    # The explorer leaves bots out; they were 3% of 2200+ games at 1.e4 in 2026-03.
    pgn = game("1. e4 e5 2. Nf3", extra_headers='[BlackTitle "BOT"]\n')
    assert run(pgn, [AFTER_E4_E5_NF3]) == []


def test_titled_human_counted() -> None:
    pgn = game("1. e4 e5 2. Nf3", extra_headers='[WhiteTitle "GM"]\n')
    assert len(run(pgn, [AFTER_E4_E5_NF3])) == 1


def test_abandoned_game_skipped() -> None:
    pgn = game("1. e4 e5 2. Nf3", extra_headers='[Termination "Abandoned"]\n')
    assert run(pgn, [AFTER_E4_E5_NF3]) == []


def test_band_from_average_rating() -> None:
    calls = run(game("1. e4 e5 2. Nf3", white=2300, black=2150), [AFTER_E4_E5_NF3])
    assert [band for _, band, _, _ in calls] == ["2200"]


def test_annotations_stripped_from_moves() -> None:
    calls = run(game("1. e4! e5?! 2. Nf3 $1 Nc6"), [AFTER_E4_E5_NF3])
    assert calls[0][3] == "Nc6"


def test_stops_at_max_plies() -> None:
    calls: List[Call] = []
    processor = BandGameProcessor(
        {AFTER_E4_E5_NF3}, lambda *args: calls.append(args), max_plies=2
    )
    processor.process_game(game("1. e4 e5 2. Nf3"))
    assert calls == []
