# Spike 06 — is the "better move" sound? (night 9, ideas 8 and 17)

Container-only Stockfish 16 (`apt-get install stockfish`; chess.js 1.0.0 in the
run's scratchpad). Nothing installed is committed; `package.json` and the
lockfile are untouched. Evals are centipawns from the mover's side.

Scripts (run from the repo root, `CHESSJS=<dir holding node_modules/chess.js>`):

- `find.js <band> [minPosGames] [minMoveGames]` — night 8's data-only rules
  (loose and strict), with the move each would call "better".
- `engine.js hits.json <depth>` — evals the root, the flagged move and the
  "better" moves. `classify.js` buckets them.
- `sweep.js` — engine-first: every named position with N+ games at a band, eval
  of the root and of every move with 15%+ share. `mistakes.js` joins it to the
  shards.

## 1. Night 8's data-only rule teaches unsound moves

The 164 data-only "mistakes" at 1400 (positions with 2,000+ games), each checked
at depth 18 against the move the panel would have called better
(`list-1400-2000games.txt`):

| Bucket                                                       | Count |
| ------------------------------------------------------------ | ----- |
| Real: flagged move loses 80+ cp and the fix is sound (≤50)   | 58    |
| Quiet: the flagged move is fine by the engine (loses <50 cp) | 54    |
| Mixed (50–80 cp, or the fix is itself dubious)               | 38    |
| Unsound: the "better" move is worse than the flagged one     | 14    |

So **two in five items would teach something false**: a "mistake" that is not
one, or a fix that is worse. The unsound fixes are a pattern, not noise: speculative
sacrifices that score well at 1400 because the defender goes wrong. Italian
4.Nc3 Nxe4: the data prefers 5.Bxf7+ (48%) to 5.Nxe4 (39%), but 5.Bxf7+ is
−1.4. The same with ...Bxf2+ against 4.Nxe5 in three Four Knights/Ruy lines,
Bxf7+ in the King's Gambit, 4.c4 in the Alekhine (−1.2). Relaxing the
thresholds to positions with 400–2,000 games (`list-1400-400to2000games.txt`)
makes it worse: 42 real of 209, 103 quiet.

**Verdict:** a data-only "better move" must never ship. Idea 8 as night 8
spiked it is killed; it lives only with an engine check.

## 2. Engine first: what real common mistakes exist

Every named position with 1,000+ games at 1400 (4,699), depth 14, then the
hits re-checked at depth 20 (`engine-first-1400-d20.txt`). A mistake: the
position is not already decided (|eval| ≤ 2.5), 20%+ of the band plays the
move, and it loses 100+ cp.

- **152 confirmed at depth 20** (of 206 at depth 14: depth 14 is too noisy on
  its own). 111 ruin the position (mover's eval below −0.5 after it); 41 miss
  free material but leave the game roughly level (Modern 1.e4 g6 2.d4 Bg7 3.Bd3:
  38% of 1400s play 3...d6 and miss 3...Bxd4, a free pawn). The −0.5 line
  between the two is arbitrary; read the items, not the split.

- **94 also score 3+ points below the position's other moves at 1400** (marked
  `*`): the engine's mistake costs real games at this level. The other 58 are
  mistakes 1400s do not punish.
- **By family (the 94): Italian 27, Queen's Gambit 9, King's pawn 9, King's
  Gambit 6, Ruy Lopez 5, Sicilian 4**, then 3 or fewer each. French 2, King's
  Indian 1, Slav 0, English 1.
- The punishing reply comes from the engine, so night 8's gap (punishment in
  the shards for 41 of 164) no longer matters. Only 28 of the after-mistake
  positions are named, so how often a band finds the punishment is mostly
  unknown.

The rule set before the test was: under ~5 families with a set, and idea 17
dies as a per-family feature. Three families have 8+ (Italian, QG, King's
pawn). **Idea 17 per family is killed.** What the data does support:

- **By first moves, not by family.** Mistakes cluster in 1.e4 e5 (Italian, King's
  pawn, King's Gambit, Ruy, Scotch, Petroff, Vienna, Philidor: 54 of 94). And
  1.e4 e5 is where beginners are: 66% × 57% ≈ 38% of u1400 games, 27% at 1400,
  9% at 2200. One "1.e4 e5 at your level" set reaches more learners than ten
  family sets.

## Where this still breaks

- Shipping needs engine output in production: either a precomputed file (a
  pipeline run plus Stockfish as a build tool, both the owner's yes) or a client
  engine (a dependency). Nothing tonight is buildable without that decision.
- 1,000+ games is the early tree. Closed openings may have mistakes deeper,
  where the shards' named positions have fewer games; not swept.
- "Loses 100 cp" is the engine's view; whether it is the right lesson for a 1200
  (a missed pawn versus an opening principle) is a teaching judgment no script
  makes. Every item would need a human (or the owner) to read it.

## 3. The same at u1400 (the band traps are for)

Same sweep at u1400 (3,229 positions with 1,000+ games), confirmed at depth 20
(`engine-first-u1400-d20.txt`): **143 of 187 confirmed, 83 cost games at
u1400, 51 of them in 1.e4 e5.** Italian 27, Ruy Lopez 7, King's pawn 6, then 4
or fewer. Only 34 items are shared with 1400: the bands make different
mistakes. Union of both bands: 143 by FEN, 140 distinct positions (the critic: three are reached by two move orders), 78 in 1.e4 e5.

Raw sweeps (depth 14, one JSON line per position) are kept gzipped
(`sweep-*-d14.jsonl.gz`) so the analysis can be re-run without the engine.
