# Plan

Phase: **Discover, by testing** (revised 2026-11-25). Gate A is a discussion the
owner is offered once an idea has survived the tests that could have killed it
(`operating.md`, The loop). Nights never idle while waiting on the owner.

## Next

**Night 10 (Friday 01:00 UTC).** Night 9 (`journal.md`) installed a
container-only Stockfish, killed the trap set (8 data-only, 17, 11), spiked
Revision 1 for the first time (`spikes/10`) and added an addendum to
`gates/gate-a.md`. Revision 1 is still the pick; Gate A still waits on the owner.

1. **Owner replies first** (Gate A; question 5, engine output on the site).
2. **The session question** (Gate B's design, testable before A): a 10-ply card
   is 2–3 minutes. What strings cards into a session? Spike a three-card Italian
   chapter at 390 px, choosing lines by what each band actually meets
   (`spikes/07`: u1400 meets the Two Knights and the Fried Liver, 1400 the
   c3/d4 Giuoco, 2200 the Pianissimo). Test: does card 2 feel like a next step
   or a repeat?
3. **Idea 12 as a pause:** at an opponent split, ask "what do most of your
   opponents play here?" before showing the bars. Spike it in `spikes/10`'s
   page; judge whether guessing teaches or is trivia.
4. **Idea 19:** coverage of Lichess's CC0 puzzles by opening tag, from a mirror
   that is not lichess.org (the Hugging Face dataset viewer), counted against
   our 31 families, and whether those puzzles happen in the opening phase.
5. **Return reason** is still the weakest part of the charter goal (idea 3):
   one cheap test of what would change while a learner is away.
6. Raise or lower the run limits from the owner's usage % if posted.

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

- **Which opening pages do visitors land on?** PostHog, landing pageviews by
  page over 60 days, split by games at the 1400 band (popular vs obscure).
  Decides idea 8 (popular pages only) against idea 11 (obscure pages).

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
