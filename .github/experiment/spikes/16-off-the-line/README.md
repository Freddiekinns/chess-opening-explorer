# Spike 16 — "they leave the line" (night 11, idea 21)

The owner asked for a "clever way" to make the last step connected to the
opening. A puzzle from someone else's game is connected only by a filter
(`spikes/15`). This step is connected by construction. It replays the line, but
at a point where your opponents at your level often play something else, the
opponent plays that move, and you find the reply. It turns the watch step's
"White has a choice here" into a question. Night 8's finding was that the splits
are the content.

## The rule (scripts here, run in order)

1. `dev-cover.js`: for each of the 1,592 popular lines, with the learner's side
   from the prototype's own `defaultSide` rule, list each opponent move off the
   line with 10%+ of games at 1400 and 500+ games. That gives 9,995 moves. For
   8,480 of them the shards hold the next position (300+ games).
2. `dev-refine.js`: keep moves from ply 4 on (the opening is set) whose position
   is in the same family or unnamed. 1,630 are kept, all of them named
   positions: unnamed ones have no shard data. 812 have a **clear** reply (45%+
   of games and 1.5× the next move).
3. `engine.js`: Stockfish 16, depth 16, MultiPV 5. **279 of 287** clear replies
   are within 50 cp of best. The 8 that fail are dropped. Example: the Bishop's
   Gambit reply 4.Bc4 in a ...g5 line, −100 against −42.
4. `engine-all.js`: every legal reply at depth 14 gives `ok` (within 50 cp,
   median 5 moves).
5. `branches.js`: up to 3 per page, in line order (the easy ones are dropped
   since the critic; see the end). This gives **519 pages, 610 questions**. 331
   questions also have another reply, played 10%+ and engine-accepted, that
   counts as found.

What the learner sees: "White leaves the line: 4.d3 instead of 4.Ng5. 34% of
White players at your level play it. What do you play?"

- The most played reply, or another common reply the engine accepts: "Yes" or
  "Good too".
- A move the engine accepts but few people play: "playable, the engine says, but
  few players at your level choose it. Try again."
- Anything else: "the engine rates X clearly lower". The second miss names the
  move.

## Coverage

| Of 1,592 popular lines                     | Lines |
| ------------------------------------------ | ----- |
| off-the-line questions                     | 519   |
| near puzzles for the learner's side (15)   | 428   |
| either (a Test step exists)                | 760   |
| both                                       | 187   |
| night 10's loosely fitting puzzles (3 for) | 524   |

## Walked at 390 px (real app, `test-walk.js`)

- **Polerio (Black):** 4.d3 instead of 4.Ng5 (34%), answered 4...Bc5 (49%). Rb8
  got "playable but few choose it". Then 3 near puzzles, the first a 6.d3
  Polerio game with the knight on a5 and the pawn on d5. Screenshots 2–5.
- **KID Orthodox (Black):** 4.Nf3 (22%) and 5.f4 (15%, the Four Pawns), both
  answered by castling. Right, but it teaches little.
- No page errors.

## Where it is weak

- **Trivial answers.** Of 279 sound positions, 22 are answered by castling and
  73 by a capture (mostly recaptures). 374 of the 519 lines have at least one
  question that is neither. The KID gets only castling.
- **Popular is not the same as best.** The engine filter (50 cp) keeps out
  unsound replies, but "most played at 1400" picks the answer among sound ones.
  The copy says "most players", not "best".
- **Flagship lines miss out.** The Center Attack and the Najdorf have no clear
  reply at any split, so the Center Attack's Test is 1 near puzzle and the
  Najdorf's is 3 puzzles.
- Shares are of all games at the 1400 band (Lichess rated games, ~1400–1800),
  the same base as the watch step.

## Idea 26, measured (`miss.js`)

In 643 of 788 learner positions with data (82%), another move is played by 10%+
at 1400. In 430 it is 20%+, and in 222 it is played **more** than the line's
move. A miss is often a real move, so the first-miss message now says so: "a3 is
played by 20% at your level, but it is another line."

## After the critic (same night)

The critic (Opus, high, `critic/`) re-ran the numbers. The shares match
`bandsFor` at 1400 to within 0.6 points on all 610 items, and it found no wrong
reply in ~60 read. It also found four problems, all fixed:

1. **Built from 1400 only, but shown at any level.** At 1800, 345 shares were 5+
   points off and 54 deviations fell under 10%. The step is now shown only when
   the level is 1400 (the default). The fix that keeps it at every level is a
   file per band: next.
2. **Half the questions were easy.** 330 of 610 were easy: one acceptable move,
   90%+ agreement, the learner's own next line move, castling, or a recapture.
   All of those are dropped, leaving **279 pages and 309 questions**. The KID
   Orthodox loses its two "castle" questions.
3. **Stockfish's best was answered "Try again"** in 38 of 223 positions.
   `engine-cp.js` now keeps each move's loss at depth 14, and any move within 15
   cp of the best counts as found (`top`). 122 of 309 items gained a move that
   was refused before.
4. **Wording.** "N% of White players" became "played in N% of games here at your
   level". "The engine agrees" became "the engine rates it sound": the check is
   within 50 cp, not first choice.

Coverage after the fixes (1,592 popular lines): off the line **279**, near
puzzles **364**, either **553**, both **90**. Night 10 had 524 lines with three
loosely fitting puzzles.

## Per band (data only, not in the prototype yet)

`dev-cover-band.js` (BAND=u1400|1800|2200) and `branches-band.js` use the same
rules. Soundness is keyed by position and reply, because a band can pick a
different reply.

- Stockfish checked 214 new position+reply pairs; 202 are sound. The 12 it drops
  include popular lower-band mistakes such as Ruy Exchange 5.Nxe5 (+81 cp for
  White's opponent).
- Per-move losses came from 185 new positions.

| Band  | Pages | Questions |
| ----- | ----- | --------- |
| u1400 | 250   | 267       |
| 1400  | 279   | 309       |
| 1800  | 272   | 290       |
| 2200  | 334   | 348       |

So the idea holds at every level. A file per band (about four times 70 KB,
unformatted) lets the component pick the learner's level. One gap: positions
first checked at 1400 but used only at another band have `ok` but no per-move
loss, so `top` is empty there. Rerun `engine-cp.js` over all used positions
before Gate C.
