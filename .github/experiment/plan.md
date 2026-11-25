# Plan

Phase: **Discover, by testing** (revised 2026-11-25). Gate A is a discussion the
owner is offered once an idea has survived the tests that could have killed it
(`operating.md`, The loop). Nights never idle while waiting on the owner.

## Next

**Night 8 (Wednesday 01:00 UTC), the first under the new manual:**

1. Widen `ideas.md` to at least ten live ideas (it holds six). Deliberately from
   different learners and moments; include some that look wrong.
2. For the two or three most promising, write their kill assumptions and test
   the riskiest of each, using the cheapest test that fits that idea. Idea 1
   (board-first play-through) is still with the owner as Gate A Revision 1. Test
   it anyway: does an animated walk with band pauses actually say something a
   learner cares about, on real lines, on a phone? A spike in the container
   answers that better than the gate document did.
3. Record results, kill or promote, journal; push a checkpoint and at the end.
   Night 8 is the calibration night: lower limits (`operating.md`), cheaper
   models for bulk work.

If the owner answers Gate A Revision 1 in #249, that answer goes into idea 1; a
yes does not stop the other ideas being tested before anything is built.

## Later

- A discussion document (`gates/<name>.md`, ≤2 pages) when an idea is ready.
- Gate B: a clickable prototype on a Vercel preview.
- Gate C: production PRs behind an unlinked route or flag.
- Retrospective: `retro.md`, after 15 working nights (from night 1, 2026-11-22).

## Carried from week 1

- Check open PRs as well as issues before recommending
  (`gh api repos/Freddiekinns/chess-opening-explorer/pulls`). PR #241
  (`feat/practice-hint-ladder`) already draws an arrow after the third wrong
  move; #234–236 (common plans) are open too.
- Own games + repertoire + drill are free elsewhere (HollowLeaf Repertoire
  Builder, ChessAtlas; `research/02`, "Revisited"); our edge is no account and
  every position, not "the only free site". Unverified hands-on.

## Local items `[local]`

- Gate A Revision 1 questions (A, B, 3, 4) in `gates/gate-a.md` (answer in
  #249), now one input among the ideas rather than a blocker.
- Find out what the w/c 2026-11-09 spike was (PostHog: landing pages, user
  agents and session lengths of US direct visitors to `/`).
- What is `/assets/` (11 pageviews)?
- Walk night 1's three journeys on a real phone.
- Try HollowLeaf's Repertoire Builder and ChessAtlas free tiers (~15 min).
- Search Console: are landing queries exact line names (lookup) or "how to play
  X" (study)? Decides who a study unit serves.
- Do Hanging Pawns' and Naroditsky's videos carry chapter timestamps? (Cloud
  gets YouTube's captcha.) Tests idea 5.
- Read `practice_abandon` `{moves, of}` in PostHog: where do the 8 of 13 stop?
  Tests idea 2.
- After night 8: owner posts that night's weekly usage % in #249, to tune the
  limits in `operating.md`.
