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
