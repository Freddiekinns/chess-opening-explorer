# Spike 13 — the Gate B prototype (night 10)

Gate A passed on 2026-11-26 ("Happy for a board first approach"). This is the
clickable prototype for Gate B, built in the real app on `feat/exp-play-through`
(from `main`), not as throwaway HTML.

## What was built

- `?lab=playthrough` on any opening page opens a full-screen **Play through**
  (`packages/web/src/components/detail/PlayThrough.tsx`). Nothing links to it.
- **1. Watch.** The page's named line plays at 0.9 s a move. It pauses before an
  opponent's move where your opponents at your saved level split (top move under
  60%, second over 20%, 500+ games), with the top three moves, their share and
  how often each wins; the line's move is highlighted. The end pause shows what
  the side to move plays next. The learner's side defaults to Black when the
  family name has "Defense", else White, with a switch.
- **2. Your turn.** Play your side's moves from memory; the opponent answers by
  the line. One miss: "a3 is not this line. Try again." Two: "The line plays
  4.c3."
- **3. Puzzles.** Three Lichess CC0 puzzles (rated ≤1600) from games tagged with
  the page's variation, whose pawns keep every pawn the line moved (spike 12's
  keptAll), most played first. Board shows the opponent's mistake highlighted.
  Credit and link to the puzzle on Lichess.
- Data: `GET /api/openings/line-bands?fens=a|b|…` (new; a shard lookup per
  position, CDN-cached 24 h) and `public/lab/play-through-puzzles.json` (338 KB,
  fetched only when the memory step starts): **526 lines**, the four hand-picked
  ones plus every named line of 6+ ply with 5,000+ games at 1400 and three
  fitting puzzles (`pages.js`, `puzzles.mjs`; 524 of 1,592 such lines qualify).
  Other lines end at "Your turn" with "No puzzles fit this line closely enough
  yet."
- Tests: `tests/unit/line-bands-endpoint.test.js` (2) and `PlayThrough.test.tsx`
  (5). `test:all`, `build`, `build:vercel` pass (the latter rewrites sitemaps
  locally; reverted, never committed).

## Walked at 390 px (`walk.js`, screenshots here)

| Line                     | Learner | Pauses                                      | Puzzles   |
| ------------------------ | ------- | ------------------------------------------- | --------- |
| Italian Center Attack    | White   | 3...Bc5 (34/33/16), 4...Nf6, end            | 3, solved |
| Caro-Kann Advance, u1400 | Black   | 2.d4 (39/35/13), 3.e5, end                  | 3, solved |
| KID Orthodox             | Black   | 2.c4, 4.e4, 6.Be2 (35/30), end              | none      |
| Two Knights, Polerio     | White   | 3...Nf6, 5...Na5 (47/32/13), end (Bb5+ 81%) | 3, solved |

No page errors. The KID end pause is the best single screen: after 6...e5, 47%
of White players at 1400 push 7.d5 and win 42%; 21% castle and win 53%.

## Where it is weak

- **Puzzles can come from a sibling line.** The pawn rule cannot tell lines
  apart that differ only in piece moves. The Polerio's first puzzle has White's
  knight on f7, Black's on f3 and g4 and White's c3: by eye a 5...Nd4 (Fritz)
  game, not 5...Na5. The label now names what is true ("a Lichess game in the
  Two Knights Defense"). The critic measured fit on a sample (below).
- **Short lines make a short session.** The Caro Advance is three moves of
  memory; a 10-ply line is ~3 minutes plus puzzles.
- **"Wins" is the mover's win rate**, without draws; fine for comparing moves at
  one pause, not a verdict.
