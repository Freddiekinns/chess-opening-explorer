# Spike 01 — how often does a learner reach a named line? (night 8)

Script: `walk.js` (run from the repo root: `node walk.js 1400 out.json`). It
walks every named ECO line of 9+ ply whose final position has 5,000+ games
(1,885 lines), reading the `position-stats` shards at each ply.

## Reach: the line the page names is rarely the game a learner gets

"Reach" = product of the opponent's move shares along the line, at the 1400
band, for the side that plays it (the learner chooses their own moves; only the
opponent's choices count). Steps with no shard data (unnamed positions, ~10% of
steps) are skipped, so these numbers are **upper bounds**.

| 1,885 lines, 9+ ply, 1400 band | p10  | p25  | median | p75  | p90  |
| ------------------------------ | ---- | ---- | ------ | ---- | ---- |
| reach, better side             | 0.3% | 0.6% | 1.3%   | 2.4% | 4.6% |

- 51 of 1,885 lines are reached in 10%+ of games; 1 in 25%+; 1,286 (68%) in
  under 2%.
- 1,818 of 1,885 contain at least one step where the line's move is chosen by
  under 20% of 1400 players.
- Median 4 band splits per line (top move under 60%, second over 20%) — so
  "pause at up to three splits" has material on almost every line.

Example: Najdorf, English Attack (6.Be3). A 1400 Najdorf player reaches it in
~3% of 1.e4 c5 games: 2.Nf3 51%, 3.d4 44%, 6.Be3 18% (6.Bg5 23% is the top
move).

## Coverage: the shards stop where the named tree stops

Following the **most played** move at a band from a family root (greedy main
path), the shards run out after:

| Start                 | u1400 | 1400 | 2200 |
| --------------------- | ----- | ---- | ---- |
| Italian after 3...Bc5 | 3     | 8    | 8    |
| Sicilian 2.Nf3 d6     | 2     | 20+  | 20+  |
| QGD 1.d4 d5 2.c4 e6   | 10    | 16   | 11   |
| Caro-Kann 1.e4 c6     | 7     | 7    | 6    |
| London 1.d4 d5 2.Bf4  | 1     | 4    | 3    |
| Scandinavian 1.e4 d5  | 5     | 5    | 10   |

The bands also choose different main paths: in the Italian, u1400 goes 4.d3 Nf6
5.Ng5; 1400 and 2200 go 4.c3 Nf6 5.d4. The u1400 path is the one a beginner
meets and it leaves the named tree at ply 3.

## What it means

1. A play-through of a **named line** (idea 1 as put to Gate A) teaches a
   sequence the learner's opponents leave in ~98% of games at 1400. The pauses
   are where the learner's game actually goes elsewhere — the content is the
   branch, not the line.
2. A "what you will actually face" path at the learner's band is the more useful
   walk, but our shards cannot follow it: off the named tree there is no data,
   and the u1400 path leaves it within 1–3 moves in the London and the Italian.
   Following it needs the explorer (rate-limited proxy, CDN cached) or a wider
   shard pipeline run — both behind the owner (charter: pipelines, Lichess).
