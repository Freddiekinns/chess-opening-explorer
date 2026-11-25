# Journal

Newest first. Template in `operating.md`.

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
from memory, then done. Video is optional, and the unit is offered from about
8 ply. Default line: Italian Center Attack (10 ply). The critic caught my draft
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
