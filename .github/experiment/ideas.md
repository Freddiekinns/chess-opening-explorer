# Ideas

Every idea for making the site more useful to learners, with its status and what
testing it showed. Method in `operating.md` (The loop). Keep at least ten live
ideas while in discovery. Statuses: `untested`, `testing`, `promising`,
`killed`. Newest evidence first under each idea.

Seeded 2026-11-25 from week 1's research and Gate A (ideas 1–6). Night 8 widened
it (7–17) and tested 1, 7, 8, 11 and 16 against the data (`spikes/01`–`05`).
Night 9 added a container-only Stockfish and tested 8, 11, 15, 17 and the new 18
(`spikes/06`–`09`). **Gate A passed on 2026-11-26 (board-first, idea 1).** Night
10 tested puzzle fit (`spikes/12`) and built the Gate B prototype in the real
app (`spikes/13`, branch `feat/exp-play-through`).

## What night 9's engine changes for every idea

- **Score is not soundness, measurably.** Of 164 data-only "mistakes" at 1400,
  54 are not mistakes by Stockfish and 14 have an engine-worse "better" move
  (speculative Bxf7+ / Bxf2+ sacrifices that score because 1400s defend badly).
  Any idea that says "better" or "mistake" needs an engine check, and so the
  owner's decision on engine output in production (`spikes/06`).
- **Opening mistakes live in 1.e4 e5.** Engine-first, 94 costly popular mistakes
  at 1400 and 83 at u1400 (140 distinct); 78 of them are in 1.e4 e5, which is
  ~37% of u1400 games and 2,323 of 12,377 pages. Closed openings have almost
  none in the early tree.

## What night 8's data changes for every idea

Two facts from the position-stats shards that any idea has to live with:

- **Every long line is rarely reached, so the splits are the content.** At 1400
  a named 9+ ply line is reached in a median ~1.3% of games, but even the
  opponent's most played path only reaches ~4% (`spikes/01`, `spikes/05`). That
  is a property of openings, not of named lines: teach the branch points.
- **The shards stop where the named tree stops.** Following the most played move
  at a band, data runs out after 1–8 ply in the London, Caro-Kann, Italian
  (u1400) and Scandinavian. Anything that follows "what your opponents actually
  play" off the named tree must use the explorer proxy the page already calls
  (25 req/min, CDN cached 24 h) — allowed, but a cold walk spends the token.

## Live

### 8. The common mistake at your level — `killed` as data-only; a pause in 1 at most

On a page, name the move players at your level commonly get wrong in the next
few moves of this opening, what scores better, and (where data reaches) the
punishing reply. Then let the learner try it: set up the position, find the
better move or the punishment. Data only, nothing written.

- 2026-11-26 (night 9, `spikes/06`): **killed in its data-only form.** Two in
  five of night 8's 164 items would teach something false by Stockfish's depth
  18 (54 not mistakes, 14 with a worse "better" move, e.g. Italian 4.Nc3 Nxe4
  5.Bxf7+ is −1.4 but scores 48% vs 39%). Relaxing thresholds makes it worse (42
  real of 209). With an engine, the page feature is still the ~500 popular pages
  of night 8; the set form (17) is where it goes.

- 2026-11-25 (night 8): the "better move" can be unsound — see idea 17 (Dragon
  7...Ng4). Applies to 8 as much as 17.
- 2026-11-25 (night 8, critic, `spikes/05`): nearly killed as a page feature.
  69% of pages have under 2,000 games at 1400; of those, 0 have a mistake on the
  page and 2 within 4 ply. Relaxed rules add 99 pages; 6,057 get nothing at any
  threshold. On 157 of the 500 covered pages the move is already in Next moves.
  Stricter rule (vs the most played alternative) keeps 89 of 164, and most
  replicate at u1400 and 1800: the mistakes are real. Survives only as a feature
  for ~500 popular pages or as a family trap set (idea 17). Decided by where
  visitors actually land (`[local]` PostHog read).
- 2026-11-25 (night 8, `spikes/03`): panel spiked at 390 px. Readable, but
  "scores 35%" is jargon, "better" by top score picked 5...b5 over the book
  5...Na5 (selection effect), and the panel must follow the band pill.
- 2026-11-25 (night 8, `spikes/02`): 164 such moves at 1400 (157 positions), 107
  at u1400, 34 at 2200 — falling with rating as it should. It rediscovers the
  Fried Liver, Stafford, Blackburne–Kostić, Englund, Petrov copycat and the
  Göring/Scotch gambit acceptances unprompted. Trap videos are 15% of all views
  in our video corpus (9 of the top 50).
- Breaks: the punishing reply is in the shards for only 41 of 164 (40 of those
  have a 58%+ reply most players find). Half the gaps are under 12 points, and
  some gaps are not tactics (QGD `6.Bg5 h6`), so "trap" must not be the label
  for all. Concentrated: Italian 46, QG 19, Sicilian 16 at 1400; most families
  have under 6, so a per-family set works for a handful of families only.
- Production already shows the raw numbers in "Next moves" for the current
  position (Fried Liver: 5...Nxd5, 35% for Black, screenshot in `spikes/02`).
  What is new is naming it, looking a few moves ahead from the page a learner is
  on, and the try-it step.
- Next test: does a learner at the Two Knights (4.Ng5) page get anything from
  "two moves on, 37% of your level play 5...Nxd5 and score 37%"? Spike the panel
  at 390 px. And: how many pages have a mistake within 4 ply ahead?

### 7. Walk the line your level actually plays — `testing`

Instead of the named line, play through the **most played path at your band**
from the page's position, pausing where your level splits. Idea 1, re-aimed.

- 2026-11-25 (night 8, code read): not blocked after all. The page already
  fetches `/api/explorer?fen=&band=` for positions off the named tree
  (`lib/lichessExplorer.ts:155`), band-aware, CDN-cached 24 h
  (`explorer.routes.js`). A walk of N plies off the tree is N proxy calls, each
  cached; the risk is the token's 25 req/min on a cold walk, not missing data.
  The same call would give idea 8 its punishing reply.
- 2026-11-25 (night 8): the bands choose different paths (Italian: u1400 goes
  4.d3 and 5.Ng5; 1400 and 2200 go 4.c3 Nf6 5.d4). The Gate A default (Center
  Attack) happens to be the 1400 main path, so it survives as an example. But
  off the named tree there is no data: the u1400 path leaves it at ply 3 in the
  Italian and ply 1 in the London. Blocked on data reach, not on the idea.

### 1. Board-first play-through of a named line — `Gate A passed`; Gate B prototype built

- 2026-11-27 (night 10, `spikes/13`): built in the real app behind
  `?lab=playthrough`: watch with opponent-split pauses, memory, three CC0
  puzzles on 526 lines. Walked at 390 px on four lines (White and Black, 1400
  and u1400, with and without puzzles). The end pause carries it: KID Orthodox,
  7.d5 is played by 47% at 1400 and wins 42%, 7.O-O by 21% and wins 53%.
- 2026-11-27 (night 10, `spikes/13/next.js`): a session can continue. Of 1,592
  named lines of 6+ ply with 5,000+ games at 1400, 1,054 end where a top-three
  move (5%+) leads to another named page, and 776 to another line of the same
  grade. "Next line" after the end pause is data-backed on half the lines. A
  reason to come back (idea 3) is still missing.

A play button animates the line, pausing where players at your level split,
captioned from the `position-stats` shards; then play it from memory; then done.
(`gates/gate-a.md`, Revision 1.)

- 2026-11-26 (night 9, `spikes/10`): first spike, Center Attack at 390 px. Works
  and is true. Revision 1's split rule pauses at 5 of 10 steps; pausing only on
  the opponent's splits gives 3, and 1–3 on 88% of 706 long lines. Mid-line
  pauses are the page's Next moves in order (useful prep, thin); the end pause
  ("what next": 6.cxd4 68%, 6.e5 24% and wins more; then 29% answer 6...Ng4,
  which Stockfish rates more than a pawn worse) is the strongest. A unit is
  under two minutes before Practice, so Practice from memory is what makes it a
  session, and that step was not spiked.

- 2026-11-26 (night 9, competitor): openingpuzzles.com has "21 interactive
  opening studies" (ideas and main variations on a live board) beside its
  puzzles. Not tried hands-on. Idea 1's difference has to be every position (all
  12,377, not 21) and the band splits; say so at Gate A.

- 2026-11-26 (night 9, from `spikes/06`): a pause could also mark where your
  level commonly goes wrong (engine-confirmed). That applies to 485 of 8,464
  named 9+ ply lines (6%), but to 360 of 1,643 in 1.e4 e5 (22%). 48 named lines
  follow the mistake themselves (the Fried Liver, 5...Nxd5, the Lolli, the
  Damiano Gambit, the Blackburne Shilling): a play-through of those that does
  not say so teaches the losing side as if it were book. Needs the same engine
  decision as 17; without it, Revision 1's band-split captions stand alone.

- 2026-11-25 (night 8, critic, `spikes/05`): the reach objection below is
  **withdrawn**. Even the opponent's most played path reaches a median 4% at 9+
  ply, so every long line is "rarely reached"; counted from the family, the
  named line gets 4.9% against a 10.8% ceiling. Books teach main lines for their
  plans and structures. The finding that stands: the splits matter more than the
  moves, which Revision 1 already uses. Idea 1 is not weakened by spike 01.
- 2026-11-25 (night 8, `spikes/01`, superseded above): pauses exist (median 4
  band splits per line). But the line itself is reached in ~1.3% of a 1400
  learner's games (median, upper bound), and 1,818 of 1,885 lines have a step
  chosen by under 20% of 1400 players. Playing the named line from memory drills
  a sequence the learner seldom meets; the splits are the content. Folded into 7
  unless the owner wants the named line for its own sake (a book does teach main
  lines).
- 2026-11-25 (night 7): the shards cover all 12,377 named positions; 1,330 of
  1,885 lines of 9+ ply with 5,000+ games have band data at every step.
- Owner, 2026-11-24: "possibly"; the animation was the owner's suggestion.

### 12. Guess what your level plays — `untested`

A position from your opening; guess the most played move at your band, then see
the split and the scores. A daily one gives a reason to return without an
account (local streak). Riskiest: is guessing popularity a learning activity or
trivia? Needs a spike and a human.

- 2026-11-26 (night 9, `spikes/10`): as a guess at the play-through's pauses it
  fails: 91 of 225 pause positions (40%) have the top two moves within 10
  points, so the "answer" is a coin toss (3...Bc5 32% vs 3...Nf6 31%). Only the
  daily form, on positions with a clear favourite, is left.

- 2026-11-25 (night 8, data): of 2,250 positions with 1,000+ games at both u1400
  and 2200, the most played move differs in 879 (39%): 1.d4 d5 vs Nf6, 1.d4 Nf6
  2.Bf4 vs 2.c4, French 2.Nf3 vs 2.d4, French Advance 3.e5 vs 3.Nc3. The u1400
  top move is under 60% in 1,673 (74%), so a guess is rarely obvious.

### 13. Smallest opening to learn — `untested`

For a beginner choosing an opening: how few positions cover most of the games at
your level (opponents' choices concentrate in some openings, scatter in others).
Riskiest: shard coverage off the named tree (spike 01) makes the count wrong
exactly where it matters.

### 2. Practice that teaches, not just checks — `untested`

Wrong-move message, show the line before asking for it, no band-blind extension
(night 4 found the Italian drill extends into 4.Nc3 Nxe4). Builds on PR #241's
hint arrow. `research/04` §3.

- Night 8: Practice drills a named line; spike 01 says the learner rarely meets
  it. Practice that follows the band's main path or ends at the common mistake
  (idea 8) may matter more than the message.
- Known: Practice finishes 5 of 13 starts (`baseline.md`); where the other 8
  stop is a `[local]` PostHog read not yet done.

### 3. Come back when something is due — `untested`

Memory of what you studied (#196), and a reason to return (reviews come due).
Week 1 found learners return only when something changed while they were away
(`research/02`), but #241's 2026-11-10 "no trainer" decision stands in the way.

### 4. Your own games against the book — `untested`

`/analyse` already links into pages with `ref=personal&username=…`, which the
page ignores (`research/01`). `research/05` judged it an optional later layer:
Analyse has ~15 users a month. Night 8 link: "did you fall for your level's
common mistake?" is a concrete question own games could answer (idea 8).

### 5. Jump to the part of a video about this line — `untested`

Family lectures lead most shelves (61–93% by line length, Gate A Rev 1). If
creators' videos carry chapter timestamps, a page could link to the minute that
covers its line. `video-index.json` holds no descriptions, and the cloud gets
YouTube's captcha, so it stays `[local]`.

### 6. Questions built from real explorer data — `untested`

"What do 1400s play here?", "which reply scores best for Black at your level?" —
a chapter's questions without written prose (`research/04`). Idea 8 is the
sharpest form of this found so far; 12 is the daily form.

### 14. Before-game brief on a phone — `untested`

Five minutes before a game: for your opening at your level, the three things
that happen most and the one mistake to avoid. Composes 7 and 8. Riskiest:
nobody opens a website before a game (needs a human).

### 15. How the opening changes as you improve — `testing`

Show the u1400 path beside the 2200 path (Italian: d3/Ng5 vs c3/d4). Tells a
learner which habits to drop. Riskiest: data reach at u1400 (spike 01).

- 2026-11-26 (night 9, `spikes/07`): the bands play different openings, not move
  orders: from 3.Bc4, u1400 goes into the Two Knights and the Fried Liver
  (5...Nxd5 played by 57%, scoring 37%), 1400 into the Giuoco Piano c3/d4, 2200
  into the slow 4.d3; 1.d4 Nf6 is a London at u1400, a King's Indian at 1400, a
  Nimzo at 2200; QG 2.c4 is accepted below 1800 and declined above. Vivid. But
  the u1400 path leaves the shards at ply 2–4 in the French, 1.d4 Nf6 and the
  Sicilian, and it is information, not an activity. Its best use is choosing
  what a set or a drill covers (u1400 meets the Fried Liver, so drill that).
  Stays `testing`; not a direction on its own.
- 2026-11-25 (night 8, data): of 2,250 positions with 1,000+ games at both u1400
  and 2200, the most played move differs in 879 (39%): 1.d4 d5 vs Nf6, 1.d4 Nf6
  2.Bf4 vs 2.c4, French 2.Nf3 vs 2.d4, French Advance 3.e5 vs 3.Nc3. The u1400
  top move is under 60% in 1,673 (74%), so a guess is rarely obvious.

### 19. Lichess CC0 puzzles as the session's last step — `in the prototype`

- 2026-11-27 (night 10, `spikes/12`): fit holds on structural lines (London 569,
  Najdorf 708, Caro Advance 1,094 fitting at ≤1600), is thin on the King's
  Indian (83 and 72 in all, mostly move 13–18), and fails on long tactical lines
  (all 155 Frankenstein–Dracula puzzles happen inside the line). A generic pawn
  rule admits sibling lines where the line keeps tension (Center Attack: 2 of
  the tolerant rule's top 3 were c3/d3 games); the strict rule (keptAll) keeps
  28, enough for three. 524 of 1,592 popular long lines get three; the rest end
  at memory. Pawns cannot separate lines that differ only in piece moves
  (Polerio vs Fritz): see the critic's sample in `spikes/13`.

## Killed

### 17. A trap set per family — `killed` 2026-11-26

From any page in a family, "the N mistakes players at your level make in the
Italian", each a position to solve.

- 2026-11-26 (night 9, `spikes/06`, `08`, critic): killed three ways.
  Engine-first there are 8+ costly mistakes in only 3 families (Italian 27, QG
  9, King's pawn 9 at 1400), so per family fails the rule set before the test.
  Reframed as one "1.e4 e5 at your level" set (78 distinct items across u1400
  and 1400) and spiked at 390 px: it works, but **it already exists**
  (openingpuzzles.com: Stockfish-checked opening puzzles and "5...Nxd5: 49% of
  players rated 1200–1400 fall for it"), half its items are trivia or famous
  traps, and it is a one-off quiz. Survives only as an optional "punish it" step
  at a pause of idea 1, with engine output in production.
- 2026-11-25 (night 8): the data-only rule found 216 at 1400 across 13 families
  with 5+, but score is not soundness (Dragon 7...Ng4).

### 11. Say how often this line actually happens — `killed` 2026-11-26

- 2026-11-26 (night 9): the copy test kills it. On obscure pages the number is
  "1 in 28,000" (French Tarrasch 3...Be7 4.Ngf3) to "1 in 160,000" (Najdorf
  13.f5 Bxg5+): it says the line is deep, not that it is rare (every 12-ply line
  is that rare, night 8). The relative form, the share at the parent, is already
  in the parent's Next moves. What a visitor could use instead is where their
  level leaves the line and what it plays there: idea 7.

On a line page: "At your level, opponents allow this in about 1 game in 70; the
usual game goes 6.Bg5 instead" with a link. Honest about obscure lines that
people land on from Google. Looks wrong (tells a visitor the page is rarely
relevant) — that is why it is here.

- Data: reach is computable for every named line, but as an upper bound (10% of
  steps unknown). Riskiest: the number is wrong where steps are missing, and it
  might push the visitor away rather than on.

- 2026-11-25 (night 8, data): strict rule (vs the most played alternative with
  15%+ share, gap 8+ points, 6+ below the rest; position 1,000+ games): 131 at
  u1400, 216 at 1400, 256 at 1800; families with 5+: 10, 13, 18. Enough for a
  set in ~10 families, not 31.
- **The kill risk found: score is not soundness.** Sample at 1400: the Dragon's
  7...O-O (the main line) is flagged against 7...Ng4 (60%), a move that loses a
  piece to 8.Bb5+ when White sees it — it scores well because 1400s don't. The
  QGD Exchange "Bd3 46% vs Be2 55%" is a quiet preference, not a trap. A
  data-only "better move" can teach an unsound move. Needs an engine check
  (Stockfish is a dependency: owner's yes) or a restriction to mistakes whose
  punishment the data itself shows (41 of 164 by spike 02). Night 9 tests the
  second: how many sound-looking items survive it, by family.

### 16. Gambit honesty — `killed` 2026-11-25

Gambits dominate the trap videos (Stafford, Rousseau, Englund). Per gambit: does
it actually score at your level, and where does it stop working as you climb?
Data exists in the shards for the early moves. Riskiest: a narrow audience; may
be idea 8 in a costume.

### Video-first study unit — `killed` 2026-11-24

Watch a video, then play the line. Killed by the owner in minutes: videos are
long family lectures that are not about the position, and a fitting line video
exists for only 3–10% of lines (night 7's count). The test that would have
killed it — does the content exist for the lines it must cover? — was not run
before it went to the owner. That is the lesson the new manual is built on.
