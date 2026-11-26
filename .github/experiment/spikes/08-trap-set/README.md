# Spike 08 — a "1.e4 e5 at your level" mistake set at 390 px (night 9, idea 17 reframed)

Throwaway HTML (`template.html`, built by `build.js` with `items.json`), opened
from `file://` in the container's Chromium at 390 × 844. A CSS board, chess.js
from unpkg for legality. Never pushed or deployed. Every number on screen is
from the 1400 band of the `position-stats` shards; answers are Stockfish's.

Each of eight positions has two steps:

1. **Avoid it.** "Here, 32% of players at your level play Nxd5, and it goes
   badly for them" + a W/D/L bar (won 34%, drew 3%, lost 63%, 76,182 games).
   Find a better move. Two wrong tries reveal the answer.
2. **Punish it.** The board flips: you are the other side, the opponent just
   played the mistake; find the punishment. Feedback shows how many at your
   level find it, where the shards have the position.

Screenshots: `1-fix-prompt`, `2-wrong-common-move`, `3-fix-right`,
`4-punish-prompt`, `5-punish-right`, `6-damiano-prompt`. A scripted walk played
all 16 steps through without an error.

## What clicking through showed

- **The real outcome makes the stakes plain.** "Lost 63% of 76,182 games" needs
  no jargon, unlike night 8's "scores 35%". The two-sided step (avoid it as
  one side, punish it as the other) is a natural pair.
- **Accepting only the engine's top moves is wrong teaching.** At 0.4 pawns'
  tolerance, 5...b5 and 5...Nd4 in the Two Knights (playable, scoring 56% at
  1400) were marked "not it". At 0.8 the mistake itself crept in (5...Nxd5 is
  only about −1.2). The rule that works: the avoid step accepts anything within
  0.8 except the flagged move; the punish step accepts within 0.4. Items close
  to the 1-pawn line are fragile and need a person to read them.
- **The famous traps are the least useful.** Ordered by games, the set opens
  with the Fried Liver, Blackburne–Kostić and Damiano: trap-video staples. 97%
  of 1400s already find 4...Qg5. A set should be ordered by how often the
  punishment is missed and lead with the lines no video covers (Modern 3.Bd3
  ...d6 missing 3...Bxd4, Chigorin 4...Nb4 5.Qa4+, the Scandinavian 5...Bc5).
  But how often the punishment is found is known for only 28 of 206 items (the
  after-mistake position is usually unnamed).
- **Some "better" moves still lose at this level.** Scotch 4...Qh4: Stockfish's
  5.Nc3 is played by 44% and still lost 53%. Copy has to say "Stockfish's
  choice; still hard at your level", not promise a good result.
- **Many punishments are sequences**, not one move (Philidor 4...dxe5 5.Qxd8+
  Kxd8 6.Nxe5). One-move answers make some items read as "trade queens", which
  misses the point. A set needs two-to-three-move solutions.
- **Avoid steps are knowledge, punish steps are calculation.** A learner finds
  5...Na5 only by knowing it; the punishments can be worked out. The punish step
  is the stronger activity.

## What it would take to build

Engine output in production. Either a committed file of ~100–150 vetted items
(made by a script with Stockfish run on someone's machine: a pipeline and a tool
the owner must allow), or a client-side engine (a dependency). Plus a human
read of every item. Nothing here is buildable before that decision.

## Killed as a direction (same night): it exists, and the critic agrees

- **openingpuzzles.com** (read with a fetch, not tried hands-on): free, "119,345
  puzzles · 21 interactive opening studies", every puzzle from 1800+ Lichess
  games and "Stockfish checks every puzzle at depth 20", kept only with "one
  clearly best answer". Its Traps page lists 23 traps with a fall rate by band:
  "Fried Liver Attack … 5...Nxd5: 49% of players rated 1200–1400 fall for it".
  That is this spike's first card. Lichess also has free puzzles by opening
  (`lichess.org/training/openings`, CC0 data).
- **The critic (Opus, `spikes/06`, `08`)** re-counted 94/54 (holds) and the
  union (140 distinct, not 143: three positions reached by two move orders),
  read 18 items: about half good lessons, a third engine trivia or duplicates
  (four Traxler lines; Ruy 3...f6 4.Bxc6 at −0.15), the rest famous traps whose
  punishment 97–100% already find. In 29 of 94 the mover still scores 45%+, so
  "goes badly for them" overclaims. Punishment found-rate known for 13 of 94.
  Ranked objections: the content needs a human read of every item and still
  overlaps the trap-video canon; it is a one-off quiz with nothing for the 63%
  of u1400 games that do not start 1.e4 e5; the band copy overstates.

What survives is the critic's proposal: inside the board-first play-through
(Gate A Revision 1), where a pause falls on an engine-confirmed common mistake,
offer "punish it" as an optional step. About 40 vetted 1.e4 e5 items (a 6-point
gap and still bad after the move), and only with engine output in production.
