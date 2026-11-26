# Spike 11 — Lichess's CC0 puzzles by opening (night 9, idea 19)

Lichess's puzzle database is public domain. lichess.org refuses the cloud, so
this reads the Hugging Face mirror (`Lichess/chess-puzzles`, 6,157,341 puzzles).
One of its three parquet files (2,052,447 rows, about a third) was downloaded
into the run's container and read with `hyparquet` (scratchpad install; nothing
committed but the scripts `pqcount.mjs`, `pq2.mjs`, which expect the file and
the package at scratchpad paths).

## What exists (one third of the data; multiply by ~3)

- 408,827 puzzles carry opening tags; 97,975 carry the `opening` phase theme
  ("tactics in the first phase of the game").
- Opening-phase puzzles by family tag, and how many are rated 1600 or below:
  Sicilian 14,071 (9,847), French 6,045 (4,077), Caro-Kann 5,395, Italian 5,104
  (3,415), Scandinavian 4,421, QGD 3,229, English 3,000, Ruy Lopez 2,548, Scotch
  2,708, Russian (Petroff) 1,822, Slav 1,154 (787), King's Indian 514 (334). 154
  family tags in all.
- **Every opening-phase puzzle also has a variation tag**: 1,212 distinct
  (`Kings_Indian_Defense_Fianchetto_Variation`, …). The names are Lichess's
  opening names, the same source as our ECO names. Checked (`pq3.mjs`): **909 of
  1,212 tags equal one of our page names** once punctuation becomes underscores,
  covering 67,413 of 95,188 opening-phase puzzles (71%). Most of the rest are
  Lichess's `<Family>_Other_variations` buckets, which belong on a family root.
- They sit right where our long lines end: move 9–12 for 48,308 of 95,188, ≤8
  for 20,544, 13–15 for 19,192.
- Every puzzle is engine-verified by Lichess, rated, and carries a popularity
  score and play count.

## Do a variation's puzzles fit the line? (the play-through's default)

`pq4.mjs <tag>`. Lichess's tags stop at two levels (family + variation): the
Center Attack has 0 puzzles of its own in this third, its parent
`Italian_Game_Classical_Variation` has 726, 476 rated 1600 or below. Read by
hand, the most played fit: the first (31,847 plays, 1504) has White's c3 and
Black's pawn on d4, Ng5 and Qh5 against f7, the Center Attack's own structure;
the fourth (a3, h3, Qa4) is a slow line and does not fit. By a crude pawn
signature (White's c- and d-pawns both moved, no pawn on d3), **412 of 476 (87%)
are c3/d4 games**, 52 are d3 lines. So a card could end with puzzles from games
like it: ~1,200 in the full set for this line's neighbourhood.

## What this changes

Tonight's engine sweep found common opening mistakes almost only in 1.e4 e5,
because it looked only at named positions with 1,000+ games. These puzzles come
from real rated games past the named tree, so they exist for d4 openings too
(King's Indian ~1,500 in the full set). It is engine-checked content for every
family that we would not have to compute.

## Where it breaks

- **It already exists as a product**: `lichess.org/training/<opening>` and
  openingpuzzles.com (119,345 puzzles, almost certainly this database). A
  "puzzles" page of our own adds nothing. The only use worth testing is inside
  the play-through: after a card, "three puzzles from games in this variation,
  at your rating" — the step that could turn a 2-minute card into a session.
- A puzzle tagged with a variation may come from a game that left our page's
  line long before; the tag is the opening the game started as, not the position
  on our page. A variation page could show puzzles whose games went elsewhere.
- Using it needs a data step (download the CC0 file, filter by tag, commit a
  small file per variation): a pipeline, so the owner's yes. No API spend and no
  engine of ours. CC0 needs no attribution, but crediting Lichess is right.
