# Spike 02 — "the common mistake at your level" (night 8, idea 8)

Scripts: `traps.js <band>`, `punish.js <band> <minScore>` (run from repo root).

A **popular-but-losing move**: at a band, a move chosen by 20%+ of players (500+
games, position 2,000+ games) that scores 44% or less for the side playing it,
while another move with 5%+ share scores 8+ points better.

| Band  | Positions with 2,000+ games | Mistake moves | Positions |
| ----- | --------------------------- | ------------- | --------- |
| u1400 | 2,569                       | 107           | 100       |
| 1400  | 3,864                       | 164           | 157       |
| 2200  | 2,633                       | 34            | 32        |

Mistakes fall as rating rises (164 → 34): the signal is what it should be. The
data rediscovers known traps without being told: the Fried Liver (5...Nxd5, 37%
of u1400 Black, scores 37%; 5...Nd4 scores 60%), the Petrov copycat (3...Nxe4
scores 36% at u1400), Blackburne–Kostić (4.Nxe5 scores 24%), the Englund (4.Bf4,
43%), the Göring and Scotch Gambit `dxc3` acceptances, the Stafford (6.d3? Bc5,
85% for Black), the Rousseau (exf5 39%).

## The punishment (what happens next)

The position **after** the mistake is in the shards for only 41 of 164 (the rest
are unnamed positions). Of those 41, 40 have a reply scoring 58%+ that most
players find (e.g. Fried Liver: Nxf7, 63% find it, 69%). For the other 123 the
page can say "X scores 35% here, Y scores 56%" but cannot show the follow-up
without the explorer proxy (one cached call per position) or a wider shard run.

Caveat seen in the list: a score gap is not always a trap. `6.Bg5 h6 7.Bh4` in
the QGD or `2.Bg5 h6` in the Dutch are ordinary moves that score less; no
tactic. A presentation must not call every gap a "trap".

## Demand signal

Trap videos are a large share of the video corpus: 73 of 1,418 titles, 9 of the
50 most viewed, 15% of all views (Stafford trap video: 6.1M views).
