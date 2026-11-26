# Spike 10 — the board-first play-through at 390 px (night 9, idea 1)

The first spike of Gate A Revision 1. Throwaway HTML (`template.html` +
`line.json`, built by `build.js`; data by `line.js`) for the default line,
Italian Center Attack, 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4, at the
1400 band. Play animates a move every 0.9 s; ◀ and ▶| step. Every number is
from the shards; the 6...Ng4 note is Stockfish's (depth 18, `spikes/06`).

Screenshots: `1-pause.png` (3...Bc5), `2-pause.png` (4...Nf6), `3-pause.png`
and `4-pause.png` (the end).

## What it showed

- **Revision 1's split rule pauses too often.** "Top move under 60%, second over
  20%" fires at 5 of 10 steps (3.Bc4, 3...Bc5, 4.c3, 4...Nf6, 5.d4). The spike
  pauses only on the opponent's splits (what you will face) plus the end: 3
  pauses. Pausing on your own side's splits would argue against the line you
  chose to learn.
- **Mid-line pauses are true but thin.** "The line follows 3...Bc5; 31% of your
  opponents go Nf6 instead (Two Knights)" is useful preparation, but it is the
  page's own Next moves, shown in order. The names under each bar carry it:
  without them a learner sees "h6 15%" and learns nothing.
- **The end is the best pause.** "What White plays next": 68% 6.cxd4, 24%
  6.e5, which wins more (57% vs 52%). Then the engine step: after 6.e5, 29% of
  Black players answer 6...Ng4, more than a pawn worse than 6...d5, with
  "Punish 6...Ng4 →". The line stops being a sequence to memorise and becomes
  "here is what happens next at your level, and the mistake to punish". That is
  the critic's add-on (spike 08) working where it fits.
- **The line is short.** Ten ply plays in ~9 seconds plus pauses. A unit is
  under two minutes before Practice. That matches "a few minutes on a phone"
  but is not a study session by itself.
- **Your turn (memory), spiked later the same night** (`5-memory-wrong.png`,
  `6-memory-done.png`): play White's five moves, Black answers by the line. A
  wrong move gets "d4 is not this line. Try again", and the second miss names
  "4.c3". It works, and it is the site's existing Practice in another place.
  Watch plus memory is about 2–3 minutes for a 10-ply line: a lesson card, not a
  session. A session needs several cards in a row (the family's lines, or the
  line and its end-pause branches), which is the design question for Gate B.

## Stage 3: three puzzles from games like this (spiked the same night)

After "Your turn", the spike runs three Lichess CC0 puzzles tagged
`Italian_Game_Classical_Variation`, rated 1600 or below, with the c3/d4 pawn
signature, most played first (`puzzles.json`, `spikes/11`). The opponent's
move is played, then "A Lichess game in this variation reached this position,
and the move just played is a mistake. White to move: find the best move."
(`9-puzzle-ask.png`, `10-puzzle-solved.png`). A scripted walk solved all three
and reached "Session done".

- The first puzzle is recognisably the line: c3, Black's pawn on d4, Bc5, and
  Ng5 + Qh5 against f7 after 9...h6?. The learner sees the line they just played
  turn into a tactic at move 9.
- **Watch, memory, three puzzles is about 5–7 minutes**: a session, not a card,
  and the puzzle content exists for 71% of opening-phase puzzles by exact
  variation name, with no engine and no writing of ours.
- Rough edges: the puzzle jumps from move 5 to move 9 without the moves between
  (the database has only the game id); "your level" for puzzles is the puzzle's
  rating, not the explorer band.

## Guess first (idea 12 as a pause), spiked the same night

`?guess` asks "What do most of your opponents play here?" with the top three
moves as buttons before showing the bars (`7-guess-ask.png`,
`8-guess-reveal.png`). It fails on structure: a pause sits at a split by
definition, so the answer is often a coin toss. At 3...Bc5 it is 32% against
31%, and "You said Nf6; most play Bc5" reads as unfair. Of the 225 distinct
opponent-split pause positions on the 706 long lines, **91 (40%) have the top
two moves within 10 points.** Guessing popularity belongs where the top move is
clearly ahead (idea 12's daily form, if anywhere), not at the play-through's
pauses. Better pause question, untested: "which of these scores best for you?"

## Does the pause rule generalise?

Across the 706 named lines of 9+ ply whose end has 5,000+ games at 1400 (learner
= the side that plays the line's last move), opponent-side splits give **1–3
pauses on 619 (88%)**, none on 69, four on 18. The end position is itself a
split (a real "what next" fork) on 299 (42%). Every end has 1,000+ games.

## Open

- The engine step needs engine output in production (questions.md 5). Without
  it, the end pause still has 6.cxd4 / 6.e5 and their results.
- 6...Ng4 comes from the data-only list confirmed at depth 18, not the
  engine-first sweep (which only had 6.O-O O-O? on this line); a real build
  would vet each item by hand.
