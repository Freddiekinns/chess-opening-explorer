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
   board-first play-through; B: Center Attack line or one the owner plays; 3: is
   one play-through plus #196 memory inside the "no trainer" decision; 4: slice
   1 before Gate B. _Meanwhile (revised 2026-11-25): nothing is built as a PR
   until A is answered, but idea 1 and the others keep being tested
   (`ideas.md`). Then Center Attack / memory left out / slice 1 waits._

4. **Vercel builds for `overnight/**`.** Every push to the state branch builds a
   preview on the owner's free plan. May a run add `"overnight/**": false` to
   `vercel.json`'s `git.deploymentEnabled` (state branch, and a one-line PR to
   `main` so the content routines' branches stop too)? Or the owner sets it in
   Vercel's dashboard. _Default: no file change; runs push twice a night (a
   checkpoint and the end), since unpushed work is lost if a long run is cut off
   (2026-11-25)._

## Decided

- 2026-11-25 evening — **Free to carry on.** "It should be free to carry on, but
  it shouldn't just stop if it can or thinks it should carry on." The old limits
  (80 calls, 500k subagent tokens) become checkpoints where the run decides; a
  higher safety net (150 calls, 1M tokens, 4 hours) guards the 8% maximum until
  a night is measured; the 90-minute floor is a minimum, not a stopping point.
  (Owner, in chat.)

- 2026-11-25 ~20:20 UTC — **After night 8: keep going, and an engine is
  allowed.** Night 8 was better (17 ideas, five spikes, a critic that overturned
  a claim) but stopped at 13 minutes with doable work left as "Next". Agreed:
  (1) do the "Next" items you can do tonight, tonight; (2) a 90-minute floor
  unless a limit comes first or everything left is blocked — how to reach it is
  the run's own call, not "delegate more" (owner, later the same evening: it
  should find the way that works best, not use subagents by force); (3) the
  charter allows tools installed in the run's container only (Stockfish, spike
  packages), never committed and never in `package.json` or the lockfile.
  (Owner, in chat.)

- 2026-11-25 ~19:45 UTC — **Extra run: night 8, early** (charter: Extra runs).
  The owner wants to see how a night runs under the rewritten method, so night 8
  runs now instead of at 01:00 UTC. Its journal heading is "Night 8 —
  2026-11-25". The 01:00 UTC run on 2026-11-26 is then night 9. Everything else
  as `operating.md` says, including night 8 as the calibration night. (Owner, in
  chat.)

- 2026-11-25 — **Work deeper and more autonomously.** The owner, in a local
  session: runs use almost no usage, are short, do not think deeply and are not
  autonomous; they should research, generate ideas, test them early, think them
  through, and bring a considered idea to discuss, not one the owner punctures
  in ten seconds. Testing fits each idea (where that idea would break), not a
  fixed checklist. The routine stays Opus 5.5 at medium effort; Claude picks
  models and effort for subagents and may write its own agents and skills. ~8%
  of the week a night is the maximum, not a target, but runs can be much longer.
  Charter (gates, budget) and `operating.md` rewritten; `ideas.md` added;
  routine prompt updated. (Owner, in chat.)

- 2026-11-24 — **Gate A, first answer: "possibly", with questions.** Videos
  can't be sourced per line; the unit pays only on medium-to-long lines; 11
  minutes is overkill for the Giuoco Piano; it leans on video quality; animate
  the line on the board behind a play button instead. Night 7 revised Gate A to
  a board-first play-through (`gates/gate-a.md`, Revision 1). Also: night 6 used
  ~2% of the week. (Owner, #249.)

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
