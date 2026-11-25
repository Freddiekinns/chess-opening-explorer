# Questions

Open questions first. Each has the default a run will act on if the owner has
not answered by the next night. Answered ones move to **Decided** with the date.

## Open

1. **Testers.** Can the owner name 2–3 people (club players, friends) who would
   try a prototype for ten minutes? _Default: the owner is the only tester._

2. **Network allowlist.** The cloud refuses `lichess.org` and `chessbook.com`
   (and likely other chess sites), so research reads search summaries, not
   pages, and nothing can be tried hands-on. Add `lichess.org`, `chessbook.com`,
   `chessable.com`, `chess.com` and `chessly.com` to the environment's allowed
   domains? _Default: carry on from search results, mark such claims unverified,
   and leave hands-on checks as `[local]` items._

3. **Gate A, revision 1** (`gates/gate-a.md`, 2026-11-25). A: yes or no to the
   board-first play-through; B: Center Attack line or one the owner plays; 3:
   is one play-through plus #196 memory inside the "no trainer" decision; 4:
   slice 1 before Gate B. _Default: a gate, so no work until A is answered;
   then Center Attack / memory left out / slice 1 waits._

4. **Vercel builds for `overnight/**`.** Every push to the state branch builds a
   preview on the owner's free plan. May a run add `"overnight/**": false` to
   `vercel.json`'s `git.deploymentEnabled` (state branch, and a one-line PR to
   `main` so the content routines' branches stop too)? Or the owner sets it in
   Vercel's dashboard. _Default: no file change; runs push once a night._

## Decided

- 2026-11-24 — **Gate A, first answer: "possibly", with questions.** Videos
  can't be sourced per line; the unit pays only on medium-to-long lines; 11
  minutes is overkill for the Giuoco Piano; it leans on video quality; animate
  the line on the board behind a play button instead. Night 7 revised Gate A
  to a board-first play-through (`gates/gate-a.md`, Revision 1). Also: night 6
  used ~2% of the week. (Owner, #249.)

- 2026-11-24 — **Deploy less often.** Each run triggers a Vercel deployment on
  the free plan; deploy only occasionally. Runs now push once a night; question
  4 asks to exclude `overnight/**`. (Owner, #249.)

- 2026-11-23 ~13:50 UTC — **Extra run** (charter: Extra runs), ten minutes
  before the weekly reset. The night's work as `operating.md` now says: the
  plan's next items, up to two units, with the usage-proxy limits. Running past
  the reset is fine. Tuesday 01:00 UTC takes whatever comes after. (Owner, in
  chat.)

- 2026-11-23 afternoon — **Extra run** (charter: Extra runs). Unit of work: the
  plan's next item, night 3 (why learners use YouTube and not sites like ours),
  under the new run limits in `operating.md` (read in depth, critic if budget is
  left) and with Full network access. Tuesday 01:00 UTC then takes the item
  after it. (Owner, in chat.)

- 2026-11-23 13:35 UTC — **Extra run** (charter: Extra runs). Unit of work: the
  plan's "Before Gate A" item, done properly. Read the primary pages (not search
  summaries) behind night 2's two load-bearing claims: learners return only when
  something changes while they are away; no free site joins video, book, drill
  and own games for one opening. Try the free tiers where they need no account
  (Lichess studies and practice, Chessbook's site, Chessable's free pages).
  Revise `research/02-how-others-teach.md` with what holds and what does not.
  Take the time it needs. Night 3 (YouTube) stays next, for Tuesday 01:00.
  (Owner, in chat.)

- 2026-11-23 — Run night 2 now, Monday ~13:20 UTC, in the last 40 minutes before
  the weekly reset, to use what is left of the week; Tuesday 01:00 UTC is then
  night 3. Usage may run out mid-run: push the research file after each section,
  not only at the end. (Owner, in chat; one-off, charter unchanged.)

- 2026-11-22 — Night 1 may run on Sunday despite the Mon–Fri rule, lean, as ~30%
  of the week is left. (Owner, in chat; one-off, charter unchanged.)

- 2026-11-22 — Claude chooses the feature; theme is "useful to learners";
  research before design, design before build. (Owner, setup session.)
