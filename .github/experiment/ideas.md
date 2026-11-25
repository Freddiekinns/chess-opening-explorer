# Ideas

Every idea for making the site more useful to learners, with its status and what
testing it showed. Method in `operating.md` (The loop). Keep at least ten live
ideas while in discovery. Statuses: `untested`, `testing`, `promising`,
`killed`. Newest evidence first under each idea.

Seeded 2026-11-25 from week 1's research and Gate A (ideas 1–6). Night 8 widened
it (7–17) and tested 1, 7, 8, 11 and 16 against the data (`spikes/01`–`05`).

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

### 8. The common mistake at your level — `testing` (narrowed)

On a page, name the move players at your level commonly get wrong in the next
few moves of this opening, what scores better, and (where data reaches) the
punishing reply. Then let the learner try it: set up the position, find the
better move or the punishment. Data only, nothing written.

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

### 1. Board-first play-through of a named line — `testing`

A play button animates the line, pausing where players at your level split,
captioned from the `position-stats` shards; then play it from memory; then done.
(`gates/gate-a.md`, Revision 1.)

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

### 11. Say how often this line actually happens — `untested`

On a line page: "At your level, opponents allow this in about 1 game in 70; the
usual game goes 6.Bg5 instead" with a link. Honest about obscure lines that
people land on from Google. Looks wrong (tells a visitor the page is rarely
relevant) — that is why it is here.

- Data: reach is computable for every named line, but as an upper bound (10% of
  steps unknown). Riskiest: the number is wrong where steps are missing, and it
  might push the visitor away rather than on.

### 12. Guess what your level plays — `untested`

A position from your opening; guess the most played move at your band, then see
the split and the scores. A daily one gives a reason to return without an
account (local streak). Riskiest: is guessing popularity a learning activity or
trivia? Needs a spike and a human.

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

- 2026-11-25 (night 8, data): of 2,250 positions with 1,000+ games at both u1400
  and 2200, the most played move differs in 879 (39%): 1.d4 d5 vs Nf6, 1.d4 Nf6
  2.Bf4 vs 2.c4, French 2.Nf3 vs 2.d4, French Advance 3.e5 vs 3.Nc3. The u1400
  top move is under 60% in 1,673 (74%), so a guess is rarely obvious.

### 17. A trap set per family — `untested`

From any page in a family (obscure ones included), "the N mistakes players at
your level make in the Italian": each a position to solve — find the better move
or the punishment. A finite session with an end, built from idea 8's data.
Riskiest: only ~3 families have enough (Italian 46, QG 19, Sicilian 16 at 1400
by the loose rule; fewer by the strict one), and the punishing reply is in the
shards for 41 of 164.

## Killed

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
