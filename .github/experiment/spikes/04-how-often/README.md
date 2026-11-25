# Spike 04 — "how often does this line happen at your level?" (night 8, idea 11)

Script: `spikes/01-line-reach/walk.js`, filters flipped to obscure lines (5+
ply, under 5,000 games): 7,401 named lines.

## The riskiest assumption: can the number be honest?

Multiplying the opponent's move shares along the line (spike 01's method) is an
**upper bound** wherever a step is an unnamed position. Only 1,420 of the 7,401
obscure lines have every opponent step in the shards — so that method is wrong
for 81% of exactly the pages Google sends people to. As built, it breaks.

## The reframe that survives

The shards count games that **reach** each named position, transpositions
included. So a plain fact needs no estimate:

> At 1400, of games that start 1.e4 c5, about 1 in N reach this position.

N = games(family root, band) / games(this page, band). Both are named positions.
The page's own band entry exists for 9,421 pages at 1400, 7,371 at u1400, 11,776
at all ratings (of 12,377). Where it is null, say nothing.

Caveat: it is "how often this happens in games", not "how often it happens to a
player who plays your moves" (the learner's own choices are not conditioned on).
Word it as the first.

Median obscure line by the old method: reach ~0.2% (1 game in ~500); p90 2.2%.

## Not tested

Whether a visitor who arrived on an obscure line is helped or put off by being
told it is rare. That needs a human, and a "the usual game goes X instead" link
so the number leads somewhere.
