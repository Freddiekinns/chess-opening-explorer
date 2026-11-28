# Journal

Newest first. Template in `operating.md`.

## Night 11 — 2026-11-28 — the owner's Gate B reply answered: parts drill, "they leave the line", puzzles that look like the opening

Run date: Saturday 01:00 UTC. That is Friday night: runs are Monday-to-Friday
nights at 01:00 the next morning, and the content routines own Sunday 19:00 to
Monday 14:00. Night 10's plan said "Monday 01:00", which falls inside the
content window, so I read it as Tuesday. This is my reading, not the owner's
(see Assumed).

Owner (#249, 2026-11-27 23:15): "the memorisation is good". Better if a part you
get wrong repeats until right, then once through. The puzzles are "interesting
but not necessarily connected", unless "a clever way" is found. "We can further
explore these opening drills as desired." Weekly usage was 18%. Copied to
`questions.md`.

Plan: build what the owner asked for (parts). Test two "clever ways" to connect
the last step to the opening where each would break: a stricter puzzle filter
(22) and a new step where the opponent leaves the line (21). Widen the drill
ideas. Result that would change my mind: too few lines covered, or answers that
are trivial or unsound.

Tested:

- **Parts drill** (`spikes/14`): 61% of popular lines have 3–4 learner moves, so
  parts of three would change nothing. Built error-driven parts of two: a part
  with a miss repeats until clean, then once through. Walked at 390 px; part
  markers added after the critic.
- **Near puzzles** (`spikes/15`): night 10's puzzles kept a median 69% of the
  line's board and started 5 moves on, which is what the owner saw. Ranking by
  the line's moved pieces, plus a reachability rule (pawns, developed minors,
  castling rights, the last move, dedupe), leaves 364 lines with a puzzle (194
  with three), starting a median 2 moves on.
- **They leave the line** (`spikes/16`): of 9,995 opponent moves off the line
  (10%+ at 1400), 1,630 are in-family from ply 4. 812 have a clear reply, and
  279 of 287 are sound by Stockfish 16. A misses-named check (idea 26): 82% of
  learner positions have a 10%+ alternative.
- **Critic (Opus, high)**: no wrong reply in ~60 read; shares exact at 1400. It
  found four problems, all fixed tonight: shares true only at 1400 (now shown
  only there); 330 of 610 questions easy (dropped, leaving 279 pages and 309
  questions); Stockfish's best refused in 38 positions (within 15 cp now
  counts); sibling puzzles on the Fried Liver, Traxler and Maróczy (the
  reachability rule).
- **Per band** (data only, no push): `spikes/16`, Per band.

Killed / promoted: 21 is promising and in the prototype; 20, 22 and 26 are in
the prototype. The night 10 puzzle selection is replaced. The "castle" and
recapture questions are dropped.

New ideas: 20–27 in `ideas.md` (drills: parts, off the line, near puzzles,
punish the mistake, the other side, mixed lines, the likely miss, pick from
three).

Assumed: Saturday 01:00 is a run night (above). Parts of two. The step is shown
at 1400 only until a per-band file exists. A miss in the once-through does not
loop (question 9).

Installed in the container only: Stockfish 16 (apt), chess.js 1.0.0 and
hyparquet 1.8.0 (scratchpad npm), and the Lichess puzzle parquet files (885 MB,
Hugging Face). `package.json` and the lockfile are unchanged.

Builds: three Vercel builds, one more than the owner's "two a night". There was
a state checkpoint push (the Stop hook asked for it mid-run), PR #252 once, and
the end push. Next time the checkpoint should wait until #252 is pushed, or fold
into the end push.

PR #252 was updated by fast-forward (commits ea3b865d and two before it).
`test:all` (1,279), `build` and `format:check` pass (Haiku verifier, twice). CI
was not watched: there are no subscriptions (the AGENTS.md rule on wake-ups).

Next: `plan.md`. Undone tonight: the per-band file in the component, because
building it needs a fourth build or waits on the owner's verdict on 21 (question
8). The data for it was measured tonight.

Checkpoint: past ~80 main calls I went on, because the critic's four findings
were fixable tonight and the owner would hit the first one in ten seconds.

## Night 10 — 2026-11-27 — Gate A passed; the play-through is built as a Gate B prototype on PR #252

Plan: answer the owner's Gate A reply first; test whether the puzzles fit d4 and
obscure lines (night 9's Next item 2); then build the clickable prototype Gate B
asks for. A result that would change my mind: puzzles that do not fit outside
1.e4 e5, which would cut stage 3.

Owner (#249, 2026-11-26 09:24): yes to board-first; Stockfish and the Lichess
puzzles allowed (careful about page performance on Vercel's free tier); two
builds a night fine; the owner is the only tester. Copied to `questions.md`;
questions 1–5 closed.

Tested:

- **Puzzle fit on seven lines** (`spikes/12`): structural lines have hundreds
  (London 569, Najdorf 708, Caro Advance 1,094 at ≤1600). The King's Indian is
  thin (83 and 72 in all). Long tactical lines fail: all 155 Frankenstein–
  Dracula puzzles happen inside the line. A tolerant pawn rule admits sibling
  lines (Center Attack: 2 of the top 3 were c3/d3 games).
- **The prototype, built in the real app** (`spikes/13`, branch
  `feat/exp-play-through`, draft PR #252): `?lab=playthrough` opens watch →
  memory → three CC0 puzzles; a new `GET /api/openings/line-bands` (shard
  lookup); a 338 KB puzzle file fetched only at the memory step, 516 lines.
  Walked at 390 px on four lines: Center Attack, Caro Advance at u1400, KID
  Orthodox, Polerio. Seven screenshots in the spike folder. Ten component tests
  and two route tests; `test:all`, `build`, `build:vercel` pass, and CI is green
  on #252.
- **Critic (Opus)** before anything reached the owner. It found five problems,
  all fixed the same night:
  - shares were of the top six moves, not all games (34% shown, 32% true);
  - 47% of puzzles were solved by the other side;
  - the line's move was missing from 113 of 839 pauses;
  - "wins" didn't say whose;
  - on sub-variation pages, 7 of 18 puzzles came from sibling lines.

  Fixes: per-side puzzles; a developed-minor-piece check; a name-based side rule
  (Center Attack White, Traxler Black).

- **Fit re-measured (Sonnet, legal-reachability test)** on 12 new sub-variation
  pages: 14 of 36 fit the exact sub-line, 19 are siblings in the same variation,
  3 unrelated. The honest claim is "a game in the same variation" (33 of 36).
  The puzzle screen says that; the button still says "from games like this",
  which is to be fixed on the next push (`plan.md`).
- **A reason to continue** (`spikes/13/next.js`): 776 of 1,592 popular long
  lines end where a top-three move leads to another line of the same grade.

Killed / promoted: idea 1 passed Gate A and is now a prototype; idea 19 is in
it, its fit is measured and qualified. The tolerant pawn rule, puzzles after
long tactical lines and the bundled puzzle file were dropped.

New ideas: (a) next line, (b) rotating puzzles, (c) a re-test in a few days.
These are the three return reasons in `gates/gate-b.md`; (c) asks question 7.

Assumed: Intermediate (1400) when no level is saved; "wins" without draws is
fine for comparing moves at one stop; the name's last telling word picks the
side.

Installed in the container only: Stockfish 16 (apt, unused tonight), chess.js
1.0.0 and hyparquet 1.8.0 (scratchpad npm), and the three Lichess puzzle parquet
files (885 MB, Hugging Face). `package.json` and the lockfile are unchanged.
`build:vercel` rewrote sitemaps in the working tree; they were reverted and
never committed.

Mistakes:

- The first build divided shares by the top six moves. The critic caught it, and
  it is close to the fabricated-data rule.
- The side default and the puzzle side were not thought through until the critic
  counted them.
- A first draft of the gate document carried a made-up game count (1,548);
  replaced by the real 1,914 before commit.

Gate B went to the owner (`gates/gate-b.md`, one comment in #249). PR #252 was
auto-subscribed and then unsubscribed once CI was green (`AGENTS.md`).

Next: Monday (night 11), the owner's Gate B answer first; spike return reasons
(a) and (b); the copy fix on the next push. Undone tonight: none of these could
be done without either the owner's phone test (Gate B) or a third preview build
tonight. Spiking (a) and (b) locally was possible but would change the prototype
under the owner while they test it; better after their answer.

Checkpoint: at ~80 main calls I went on, because the critic's findings were
fixable tonight and a prototype with them unfixed would fail a ten-second phone
test.

Cost: 01:01–02:27 UTC (86 minutes; the Sonnet fit agent alone ran ~55 minutes).
Main tool calls ~125. Subagents 5, ~270k tokens: Haiku verifier ×2 (~28k), Opus
critic (~87k), Sonnet fit re-measure (~155k). Web: Hugging Face API and 3
downloads, the GitHub API.

## Night 9 — 2026-11-26 — the engine kills the trap set, and the play-through becomes a session with Lichess's own puzzles

Plan: test idea 17/8 for soundness with a container-only Stockfish (the owner
allowed it on 2026-11-25); spike idea 15; test idea 11's copy. A result that
would change my mind: a sound mistake set across 5+ families.

Tested:

- **Ideas 8 and 17, soundness** (`spikes/06`). Stockfish 16 at depth 18 on night
  8's 164 data-only "mistakes": 58 real, 54 not mistakes, 38 mixed, 14 with an
  engine-worse "better" move (unsound sacrifices that score because 1400s defend
  badly). Then engine-first over every named position with 1,000+ games at 1400
  (4,699) and u1400 (3,229), confirmed at depth 20: 94 and 83 costly common
  mistakes, 140 distinct, 78 of them in 1.e4 e5 (~37% of u1400 games). Only the
  Italian (27), QG and King's pawn (9) have 8+.
- **The trap set as a "1.e4 e5 at your level" spike** (`spikes/08`, 390 px):
  avoid it, then punish it, with real W/D/L. Readable, but the engine tolerance
  needs care (0.4 rejects playable 5...b5 and 5...Nd4; 0.8 lets the mistake in).
- **The critic (Opus)** confirmed 94/54, corrected 143 to 140, read 18 items
  (half good lessons, a third trivia or duplicates) and ranked the objections.
  **A search found openingpuzzles.com already does it** ("Fried Liver …
  5...Nxd5: 49% of players rated 1200–1400 fall for it").
- **Idea 18, gambit verdict** (`spikes/09`): unsound gambits score ~50% at every
  band (Stafford −1.7, 52% at 1400, 48% at 2200). True, small.
- **Idea 15, band paths** (`spikes/07`): the bands play different openings
  (u1400 Fried Liver, 1400 c3/d4 Giuoco, 2200 Pianissimo; QG accepted below
  1800). u1400 data ends at ply 2–4 off 1.e4 e5. Information, not an activity.
- **Idea 11** killed by its copy: "1 in 160,000" says deep, not rare.
- **Idea 20** quick count: confirmed mistakes per 100 games entering a family at
  u1400: Petroff 17, Italian 4.4, London 0.
- **Idea 1, first spike** (`spikes/10`): play-through of the Center Attack at
  390 px. Revision 1's split rule pauses at 5 of 10 steps; opponent-only splits
  give 1–3 pauses on 88% of 706 long lines. The end pause ("what next", then 29%
  answer 6...Ng4) is the strongest. Memory step spiked: works, and is Practice
  in another place. Guess-first pauses fail (40% coin tosses).
- **Idea 19, Lichess CC0 puzzles** (`spikes/11`): a third of the file has ~98k
  opening-phase puzzles, every one tagged with family and variation; 909 of
  1,212 variation tags equal our page names; the Center Attack's parent
  variation has 476 at ≤1600, 87% with its c3/d4 structure. Added as stage 3 of
  the play-through: watch → memory → three puzzles ≈ 5–7 minutes.

Killed / promoted: 8 (data-only), 11, 17 killed; 12-at-pauses failed. 1 promoted
to `promising` (pauses generalise; the session problem has a content answer). 19
`promising` as the card's last step; 18 `promising` (small). New ideas: 18,
19, 20. Assumed: the 1400 band (average 1628) stands for "your level"; depth
18–20 is enough to call a 1-pawn mistake; the CC0 puzzle file is usable once the
owner allows the data step. Installed in the container only: Stockfish 16 (apt),
chess.js 1.0.0 and hyparquet 1.8.0 (scratchpad npm), one 295 MB parquet file of
Lichess puzzles (Hugging Face). Nothing installed was committed; `package.json`
and the lockfile are unchanged. Mistakes I made: a sweep crashed on a checkmate
position and lost 10 minutes of output (fixed to write line by line); the first
spike accepted only the engine's top moves, which would have taught that
playable moves are wrong. Updated `gates/gate-a.md` with a night 9 addendum and
added question 5 (engine output or CC0 puzzles on the site). Commented once in
#249. Next: night 10 runs the session on a d4 line and an obscure line, to see
whether the puzzles still fit. Checkpoint: at ~100 main tool calls I went on,
because the session question was testable tonight and was the plan's next item.
Cost: container clock 01:00–~02:10 UTC (it barely moved across some long steps;
the engine runs alone measured ~35 minutes of `time`), main tool calls ~120,
subagents 1 (Opus critic ~76k tokens), web pages 4 (2 searches, 2 fetches of
openingpuzzles.com; lichess.org refused 1) plus Hugging Face API calls. Stopped
because the night's plan and its follow-ups are done and written up; the rest
(more lines, another band) is better done fresh on night 10.

## Night 8 — 2026-11-25 — named lines are rarely reached, but so is every line; the common mistake is real but lives on ~500 popular pages

Plan: widen `ideas.md` to ten-plus, then test the riskiest data assumption of
idea 1 (do its pauses say anything, on lines learners meet?) and of whatever the
data turned up. A result that would change my mind: band data too thin to
caption, or ideas that only work on pages nobody lands on.

Tested:

- Idea 1, does a learner meet the named line? (`spikes/01`). At 1400 a named 9+
  ply line is reached in a median ~1.3% of games; median 4 band splits per line.
  I first read this as weakening idea 1; **the critic overturned it**: the
  opponent's most played path only reaches ~4%, so every long line is rare. The
  fair finding is "the splits are the content", which Revision 1 already uses.
  Idea 1 stands as it was.
- Idea 8, the common mistake at your level (new; `spikes/02`, `03`, `05`). The
  data rediscovers the Fried Liver, Stafford, Blackburne–Kostić, Englund and the
  Petrov copycat unprompted; 164 such moves at 1400, 34 at 2200; 89 survive a
  stricter rule and most replicate across bands. A Sonnet spike put the panel on
  the page at 390 px: readable, but "scores 35%" is jargon and "better by top
  score" picked a sideline over the book move. The critic's test nearly killed
  it as a page feature: of the 69% of pages with under 2,000 games at 1400, none
  has a mistake on or near it. Narrowed to ~500 popular pages or a family trap
  set (idea 17).
- Idea 11, "how often this line happens" (`spikes/04`): multiplying move shares
  is wrong on 81% of obscure lines (unnamed steps); reframed as games reaching
  the page ÷ games at the family root, available on 9,421 pages at 1400.
- Data reach for 7/13/15: the shards stop at the named tree, but the page
  already calls the band-aware `/api/explorer` proxy (CDN 24 h) off it, so these
  are not blocked — a cold walk spends the token's 25 req/min.
- Idea 16, gambit honesty: scores at the gambit move vary under 6 points across
  bands. Killed, folded into 8.
- Idea 17, trap set per family (late in the night): the strict rule finds 216 at
  1400 across 13 families with 5+, but the sample shows the kill risk — score is
  not soundness. It flags the Dragon's main move 7...O-O against 7...Ng4, which
  scores 60% at 1400 only because 8.Bb5+ goes unseen. A data-only "better move"
  can teach a bad move; needs an engine (a dependency) or only mistakes whose
  punishment the data shows.
- Bands differ: the top move at u1400 differs from 2200 in 39% of well-played
  positions (feeds 12 and 15). Killed / promoted: 16 killed. 8 narrowed (not
  promoted). 1 restored. 17 added. New ideas: 7, 11–15, 17. Assumed: the 1400
  band (average rating ~1628) stands for "a learner"; games weighting is not
  visitor weighting (the critic's point — where visitors land is a `[local]`
  PostHog read). Mistakes I made: a hand-typed FEN in the spike brief (subagent
  caught it); the spike subagent rendered one made-up number (100 − 85) in a
  screenshot, deleted before commit; the reach claim was overstated until the
  critic checked it. Nothing went to the owner: nothing has survived its tests
  yet, and Gate A Revision 1 is not changed by tonight's evidence. Next: night 9
  (01:00 UTC) — idea 17 restricted to mistakes whose punishment the shards show
  (count by family; read every item for soundness), and idea 15 (spike the
  u1400-vs-2200 path at 390 px). `[local]`: which opening pages visitors land
  on, which decides 8 against 11. Cost: container clock 19:43–~20:00 UTC (the
  clock looked slow against the work done; treat minutes as unknown), main tool
  calls ~68, subagents 2 (Sonnet spike ~59k, Opus critic ~71k = ~130k tokens),
  web pages 1 (production at 390 px). The limit hit was none; stopped because
  the next tests that would decide 8 and 11 need the owner's PostHog or a
  dependency (engine), and 15 and 17 are queued for night 9 with their test
  written down. Under an hour by the container clock: say so plainly, the owner
  should judge it against the usage %.

## Local session — 2026-11-25 — the experiment's method rewritten with the owner

Did: the owner reviewed week 1 and found the runs too short (~2% of the week a
night against an 8% ceiling, 6–15 minutes), too shallow and not autonomous: desk
research, one idea shrunk by each critic, nights told to exit while a gate was
open, and a video-first idea with a hole the owner found in ten seconds.
Diagnosis: the files caused it — ceilings everywhere and no reason to keep
going, "nothing is designed before A", "a night waiting on the owner exits", and
no step that tests an idea where it would break. Rewrote the charter's gates and
budget, rewrote `operating.md` around a widen–test–narrow loop with throwaway
spikes allowed before any gate, added `ideas.md` (six seeded, the video idea
recorded as killed), rewrote `plan.md`, and updated the routine prompt. Decided:
gates guard what reaches users, not thinking; testing fits each idea; Opus 5.5
at medium for the routine, Claude picks subagent models and effort and may write
its own agents and skills; 8% is a maximum. Next: night 8 widens the ideas to
ten and tests the top two or three. Not a night entry.

## Night 7 — 2026-11-25 — product manager: Gate A, revision 1

Did: read the owner's two replies in #249 (Gate A "possibly", with questions;
every push builds a Vercel preview on the free plan). Measured where line videos
exist from `video-index.json`, `popularity_stats.json` and the ECO files: of the
positions with 5,000+ games, a line video (15 minutes or less, title names the
line) exists for 10% of lines up to 4 ply and 3–4% of lines from 9 ply. Wrote
Revision 1 at the top of `gates/gate-a.md`, ran the critic and answered it with
a shard coverage count. Commented in #249. Decided: board first. A play button
animates the line and pauses at up to three band splits (top move under 60%,
second over 20%) with captions from the `position-stats` shards. Then play it
from memory, then done. Video is optional, and the unit is offered from about 8
ply. Default line: Italian Center Attack (10 ply). The critic caught my draft
naming the rate-limited explorer proxy as the source. The bands come from the
shards, which cover all 12,377 positions. Also found that `vercel.json` excludes
only `dependabot/**`, so `overnight/` never stopped previews. `operating.md` now
says push once a night, and questions.md 4 asks to exclude it. Recorded the 2%
weekly figure there too. Assumed: the title match is a fair proxy for "covers
this line". Next: wait for Gate A (A, B, 3, 4). Cost: minutes ~12 by container
clock, tool calls ~27, subagents 1 (critic, ~57k tokens), web pages 0.

## Night 6 — 2026-11-24 — product manager: Gate A

Did: read `research/01`–`05`, the open issues and PRs, and #241's Rev 5.1
backlog note. Wrote `gates/gate-a.md`, ran the critic, re-checked its video
numbers against `video-index.json` (they hold) and answered it in the file.
Commented in #249 asking for Gate A. Decided: recommend a study unit for **one
line** (default Giuoco Piano, an 11-minute video, 3…Nf6 marked "not covered"):
watch, then play once from memory with a wrong-move message, then two or three
"what your level plays" questions, then a visible done. The critic changed it.
The unit gives a visit an end but no reason to return, so that claim is
withdrawn. Gate B is a usability check, and return is tested only with outside
testers. The family lecture video (22 minutes, leading 258 of the 413 Italian
pages) does not fit a ten-minute unit. #241's 2026-11-10 "no trainer" decision
is now put to the owner as a question with no default. Assumed: #196 and #241
stand as the issues describe them. Slice 1 waits for Gate B unless the owner
says yes to building it early. Next: wait for Gate A. Until it passes, a night
writes one line and exits. `[local]`: read `practice_abandon` before designing.
Cost: minutes ~6 by container clock, tool calls ~25, subagents 1 (critic, ~78k
tokens), web pages 0.

## Extra run, unit 2 — 2026-11-23 (~14:00 UTC) — researcher: your games (night 5)

Did: a fresh subagent read the deviation-trainer PRD, the Analyse code, the
backlog, #195/#207 and nine product and coaching pages and returned a brief;
wrote `research/05-your-games.md` from it; ran the critic and answered it.
Decided: slice 2 stalled on sequencing only (backlog rev 4); every competitor
compares games against a repertoire you build first; Analyse has 15 users a
month, so own games are an optional later layer, not the front door or the
return hook. Gate A will recommend: `?practice=` (#195's seam) + Practice fixes

- #196 memory first, then one family unit as the Gate B prototype. Assumed:
  competitors' marketing pages describe them truly (none tried). Refused:
  lichess.org pages; OpeningTree returned only its title. Next: night 6, Gate A
  — Tuesday 01:00 UTC. Cost (whole run): minutes ~15 by container clock, tool
  calls ~65, subagents 3 (~178k tokens: critic 50k, brief 75k, critic 53k), web
  pages 21 (12 + 9 by subagent; +8 searches).

## Extra run — 2026-11-23 (13:52 UTC) — researcher: the free chess book (night 4)

Did: profiled the generated book (`analysis_json` on all 12,377 positions, the
content ledger, families); read #228–236; played Practice on production at 390
px (`gates/night4/`); read 12 primary pages (Wikibooks ×3, Chess.com's Italian
page, a Move by Move extract as text, Chessbook, three coaching articles, Chassy
& Gobet 2011); wrote `research/04-free-chess-book.md`; ran the critic and
answered it in the file. Decided: the free chess book exists (Wikibooks, pulled
into Lichess's explorer), good at the top of the tree and thin below it; what
ours lacks is a chapter's shape — key positions, plans shown in games,
questions, the why. We can build the questions from real explorer data, not the
prose. Practice silently rejects a wrong move, ends at "Complete!" with nothing
next, and on the Italian its popularity-picked extension drills 4.Nc3 Nxe4. The
critic shrank the candidate again: Practice fixes + #196 first, then one unit
for one family as the Gate B prototype; no 31-family book. Assumed: one Practice
page is indicative of the mechanism, not its frequency. Refused: lichess.org,
chessable.com (403); stackexchange and reddit (fetch tool). Also noted: a stray
`git checkout origin/main --` detached HEAD mid-run; caught before any commit,
nothing lost. Next: night 5, your games (unit 2 of this run, by subagent brief).
Cost: minutes ~10 (container clock), tool calls ~55, subagents 1 (critic, ~50k
tokens), web pages 12 (+5 searches; 6 refused).

## Extra run — 2026-11-23 (13:41 UTC) — researcher: why learners use YouTube (night 3)

Did: profiled `video-index.json` and the production page at 390 px; read 11
primary pages (two papers, a press release, five forum threads and blogs, two
product pages, a developer write-up); wrote `research/03-youtube.md` with a
phone screenshot in `gates/night3/`; ran the critic and answered it in the file.
Decided: being where learners watch is not the gap; being where they practise
what they watched is — every learner fix found leaves YouTube to produce the
moves, and testing after a video beats rewatching at a week. But 86% of our top
videos are 28-minute family lectures shared by 20+ pages, and on a phone the
gallery is closed two screens down. Candidate for Gate A: a family-level unit
(short video → play the line → review, building on #196/#199); the critic shrank
it and flagged Practice's 5-of-13 finish rate as the weak step. Assumed: forum
testimony and non-chess lab studies transfer (a hypothesis for testers).
Refused: `lichess.org` 403s WebFetch and curl even with Full access;
`youtube.com` serves Google's captcha. Also fixed `operating.md`: post with
`-F body=@file`; the 13:36 comment in #249 holds a file path, not its text.
Next: night 4, the free chess book, plus a read of the Practice flow. Cost: tool
calls ~35, subagents 1 (critic), web pages 11 (+5 searches; 4 refused).

## Extra run — 2026-11-23 (13:35 UTC) — researcher: night 2's two claims, deepened

Did: tried to read the primary pages behind night 2's load-bearing claims;
`lichess.org` and `chessbook.com` are refused by the cloud allowlist, so ran
eight targeted searches and read one GitHub page instead; added a "Revisited"
section to `research/02-how-others-teach.md` and marked the claims it changes.
Decided: "no free site joins all four steps" is wrong as stated — HollowLeaf's
Repertoire Builder and ChessAtlas give own games + repertoire + drill free; our
edge is no account, every position and many creators' videos, starting from the
page a learner lands on. The return claim holds as a pattern with a third
mechanism (daily ritual + streak, Chess.com's Daily Puzzle); no retention
numbers exist in public. Assumed: developer listings describe the products truly
(unverified, nothing hands-on). Next: night 3 (YouTube), Tuesday 01:00 UTC;
hands-on check of Repertoire Builder and ChessAtlas before Gate A. Cost: tool
calls ~17, subagents 0, web pages 1 (+8 searches; 3 fetches refused).

## Night 2 — 2026-11-23 — researcher: how others teach openings

Did: surveyed Chessable, Chessbook, Lichess studies, Aimchess, Chess.com
Practice and the Move by Move books, plus learner forum advice; wrote
`research/02-how-others-teach.md`, pushed in two parts as the owner asked.
Decided: a session ends when a finite unit is done, and learners return only
when something changes while they are away (reviews come due, or new games); no
free site joins video → written book → drill → own games for one opening, and we
hold three of the four. Assumed: search summaries and listings are good enough
for a first pass (nothing clicked or signed into); the video index's top
creators moved to night 3, where they fit. Next: night 3, why learners use
YouTube and not sites like ours. Cost: tool calls ~14, subagents 0, web pages 0
(7 searches, no page fetches).

## Night 1 — 2026-11-22 — researcher: the learner's journey today

Did: walked three learners (London beginner, KID club player, Google arrival on
an obscure line) through the code and data; wrote
`research/01-journey-today.md`. Decided: the site is a reference, not a lesson;
nothing persists to bring someone back; `/analyse` already links into pages with
`ref=personal&username=…` and the page ignores it, the cheapest seam to join.
Assumed: the owner's chat message ("you can break tonight's rule") is the yes to
run on a Sunday; production was unreachable through the proxy, so page order was
read from code, not clicked. Next: night 2, how others teach openings. Cost:
tool calls ~17, subagents 0, web pages 0 (the owner said ~30% of the week was
left, so tonight ran lean and skipped the reviewer).

## Skipped — 2026-11-22 (Sunday, 22:43 UTC) — not a run night

Did: nothing. The routine fired on a Sunday night; the charter runs the
experiment Monday to Friday nights only, because the content routines spend what
is left from Sunday 19:00 UTC. Exited without work. Not a night entry, so it
does not set the one-run-a-day lock. Next: Night 1 (the learner's journey today)
on the first scheduled run, 01:00 UTC Tuesday.

## Night 0 — 2026-11-22 — setup (local session with the owner)

Did: agreed the experiment with the owner; read PostHog, Vercel and Search
Console into `baseline.md`; wrote the charter, the operating manual and the
plan. Decided: one nightly routine, Monday to Friday, state on
`overnight/experiment-state`, inbox as one GitHub issue; Claude picks the
feature after five nights of research. Assumed: ~8% of the weekly allowance per
night is affordable alongside the content routines; to be checked against the
owner's figures in week 1. Next: night 1, the learner's journey today.
