# Spike 15 — puzzles that still look like the opening (night 11, idea 22)

The owner on Gate B (#249, 2026-11-27): the puzzles "are interesting but not
necessarily connected"; the board must clearly still be the opening, "or you
won't learn an idea".

## Measuring "connected"

Two numbers per puzzle, against the line's end position:

- **board kept**: the share of the end position's pieces on the same square in
  the puzzle's first position;
- **moved pieces kept**: the same, counting only pieces the line moved (the
  ones that make it this opening, not the rooks and king at home).

Night 10's puzzle file (2,909 puzzles, the pawn rule `keptAll`): board kept
median **0.69** (19% at 0.8+), moved pieces kept median **0.67** (40% at 0.75+),
and they start a median **5 moves** after the line ends. That matches what the
owner saw.

## The near filter

`near.mjs` reads all 5.6M Lichess CC0 puzzles (Hugging Face parquet, container
only), keeps those rated ≤1600 with the page's variation tag and not in the line
itself, and scores both numbers. Board kept alone was not enough: on the Center
Attack it ranked 3...Nge7 and ...f6 games first (few moves played, so most
pieces are home). Ranking by moved pieces kept first fixed that.

| Lines (1,592 popular) with 3+ puzzles | board ≥ 0.8 | board ≥ 0.7 |
| ------------------------------------- | ----------- | ----------- |
| moved pieces kept = 1                 | 185         | 243         |
| ≥ 0.85                                | 253         | 334         |
| ≥ 0.75                                | 378         | 484         |
| ≥ 0.66                                | 416         | 524         |

The prototype now uses **moved ≥ 0.75 and board ≥ 0.8**, up to 3 per solving
side: 1,140 puzzles in lines with three, board kept median **0.87**, starting a
median **2 moves** after the line ends (90% within 3). For the learner's default
side, 437 lines get at least one (272 get three); 1,155 get none.

## Where it breaks

- **The Center Attack gets none.** After 5.d4 exd4 the centre changes at once,
  so no puzzle keeps the line's moved pieces; the near ones are 4.d3 games.
- **Coverage drops** from night 10's 524 lines with three to 272 for the
  learner's side. Connected or nothing is the owner's rule, so the drop is
  accepted. Idea 21 ("off the line", `spikes/16`) fills many of the gaps.
- **Still a game, not a lesson.** A near puzzle is a real 1,200-rated mistake
  two moves after the line. It shows a tactic in this structure. It does not
  explain an idea.

Examples (top 3, moved kept / board kept / moves after the line):

- Polerio: nXnCb 1.00 / 0.97 / +1, PZZZv 1.00 / 0.87 / +1. The Na5 line's own
  tactics.
- KID Orthodox: EjprU 0.92 / 0.94 / +1. Night 10 had only 83 middlegame
  puzzles here.

## After the critic (same night)

The critic found 48 of 1,012 learner-side puzzles on 34 pages that could not
come from the line's end. On the Fried Liver page, all three were copies of one
6.Qf3 position with the knight still on g5. Traxler and Maróczy pages had
siblings too. `near.mjs` now also requires a puzzle to be **reachable** from the
line's end:

- every pawn the line moved is still there or further up its file;
- no pawn is back on a home square the line emptied, and neither side has more
  pawns than at the line's end;
- no minor piece the line developed is back home;
- no castling right comes back;
- the line's last move still stands if the puzzle starts within a move;
- no position is used twice.

New coverage for the learner's default side: **364 lines with at least one
puzzle, 194 with three**. The Fried Liver keeps one (f7YHg) and the Traxler
Knight Sacrifice one (EUUJ9, ...Bxf2+ Kf1). Polerio and French Exchange keep all
three.
