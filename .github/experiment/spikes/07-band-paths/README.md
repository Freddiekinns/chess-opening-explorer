# Spike 07 — the path each band actually plays (night 9, ideas 15 and 7)

`paths.js` follows the most played move at each band from a root, while the
position is in the `position-stats` shards (the named tree). Output for six
roots in `paths.txt`; each step is `move(share at that band, score for the
mover)`, and `|end` is where the shards stop.

## What it shows

The bands play different openings, not different move orders:

| Root          | u1400                                   | 1400                         | 2200                              |
| ------------- | --------------------------------------- | ---------------------------- | --------------------------------- |
| Italian 3.Bc4 | Two Knights, 4.Ng5 → Fried Liver        | Giuoco Piano 4.c3 Nf6 5.d4   | Giuoco Pianissimo 4.d3, slow      |
| 1.e4 e6       | 2.Nf3 d5 3.exd5 (ends at ply 3)         | Advance, 5...Qb6             | Classical, Steinitz 4.e5 Nfd7     |
| 1.d4 Nf6      | 2.Bf4 g6 (London; ends at ply 2)        | King's Indian, to move 9     | Nimzo-Indian, 4.e3 Rubinstein     |
| 1.e4 c5       | 2.Nf3 Nc6 3.Bc4 (ends at ply 4)         | Open, 4...e5 5.Nxc6          | Najdorf main line to move 16      |
| 1.e4 c6       | Advance, Short-style (same as 1400)     | Advance 4.Nf3 e6 5.Bd3       | Advance 4.h4 h5                   |
| QG 2.c4       | Accepted, 3.e4 b5 4.a4 (holding a pawn) | Accepted, 3.Nc3 Nf6 4.e4     | Declined, Exchange Carlsbad       |

The u1400 Italian path is the one a learner is most likely to meet: 4.Ng5 34%,
then 5...Nxd5 played by 57% of u1400 Black players, scoring 37%, then 6.Nxf7
found by 46% and scoring 72%. A path view turns into the common-mistake view
(idea 8) on its own.

## Where it breaks

- **u1400 data ends early.** The u1400 path leaves the named tree at ply 2–4 in
  the French, 1.d4 Nf6 and the Sicilian, because those beginners play unnamed
  moves (2.Bc4 in the Sicilian). Past that point only the band-aware
  `/api/explorer` proxy has data (one cached call per ply, the 25 req/min token).
  A precomputed path file would need a pipeline run against Lichess (owner's yes).
- **"Most played" flips on thin margins** (Sicilian 1400 4...e5 27%), so a path
  is one line out of a fan; the page must show the share at each step.
- It is information, not an activity. On its own it is a better "Next moves",
  not a study session; its use is to choose what to drill (ideas 7, 14).
