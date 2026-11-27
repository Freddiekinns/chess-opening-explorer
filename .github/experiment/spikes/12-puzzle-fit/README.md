# Spike 12 — do the variation's puzzles fit the line? (night 10, idea 19)

Night 9 found three Lichess CC0 puzzles could end the play-through, on one line
(Center Attack). The question tonight: does that hold on a d4 line and an
obscure one, where the variation tag is broad or thin? `fit.mjs` reads all three
parquet files of the Hugging Face mirror (6.16M puzzles; container only) and,
for each line, counts opening-phase puzzles rated ≤1600 carrying the line's
Lichess variation tag, and tests each puzzle's pawns against the line's end:

- **contradicted**: a pawn the line moved stands on its home square again (the
  game left the line before its end);
- **keptAll**: every pawn the line placed still stands there or further up its
  file;
- **fit**: not contradicted, and all but one placed pawn kept.

Output: `fit-out.json` (counts, move-number spread, top 12 fits per line).

| Line (tag)                                | ≤1600 | keptAll | fit   |
| ----------------------------------------- | ----- | ------- | ----- |
| Center Attack (Italian Classical)         | 1,420 | 28      | 270   |
| KID Orthodox 6.Be2 e5                     | 83    | 6       | 17    |
| KID Fianchetto 3.g3                       | 72    | 18      | 60    |
| London 1.d4 d5 2.Bf4                      | 609   | 363     | 569   |
| Najdorf 5...a6                            | 881   | 423     | 708   |
| Caro-Kann Advance 3.e5                    | 2,030 | 421     | 1,094 |
| Caro-Kann Advance, Botvinnik–Carls 3...c5 | 2,030 | 135     | 718   |
| Vienna Frankenstein–Dracula (20 ply)      | 155   | 0       | 0     |

## What it showed

- **Short and structural lines are well served.** London, Najdorf and the
  Caro-Kann Advance have hundreds of fitting puzzles at ≤1600, and their top
  ones read as the line (the Caro Advance's most played: e5/d4 chain, Qb6xb2).
- **The King's Indian is thin.** 83 and 72 puzzles at ≤1600 in all of Lichess,
  most at move 13–18 (middlegame). Three puzzles exist per line, but with no
  choice by fit or popularity. A d4 learner gets a weaker stage 3.
- **A generic pawn rule cannot tell sibling lines apart where the line keeps
  tension.** The Center Attack resolves (6.cxd4), so only 28 puzzles keep its
  pawns; the tolerant rule admits 270, and 2 of its top 3 are slow c3/d3 Giuoco
  lines (Pd3, no d4 tension). Night 9's line-specific signature (c- and d-pawns
  moved, no pawn on d3: 87% of the parent tag) was right for that line, but it
  was hand-written. Across 12,377 pages a rule has to be general, so stage 3 is
  accurate on structural lines and approximate on tension lines.
- **On long tactical lines the puzzles are the line itself.** Every one of the
  Frankenstein–Dracula's 155 puzzles happens before the 20-ply line ends (71 by
  move 8). Shown after the line, they would quiz moves just watched. For lines
  like this a puzzle belongs at a pause inside the line, or nowhere.

## What this changes

Stage 3 (three puzzles) is kept for the Gate B prototype, which runs one line
(Center Attack) with night 9's signature. For Gate C it needs a per-page rule:
offer puzzles only when 3+ fit with keptAll, or with a hand-checked signature
for the ~500 most visited lines; otherwise end the session at "Your turn". That
is a data step the owner has allowed (CC0), not tonight's work.
