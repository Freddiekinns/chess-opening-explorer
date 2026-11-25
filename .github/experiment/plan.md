# Plan

Phase: **Discover, by testing** (revised 2026-11-25). Gate A is a discussion the
owner is offered once an idea has survived the tests that could have killed it
(`operating.md`, The loop). Nights never idle while waiting on the owner.

## Next

**Night 9 (Thursday 01:00 UTC).** Night 8 (`journal.md`) widened `ideas.md` to
17 and tested 1, 7, 8, 11, 15, 16, 17 against the shards. Nothing is ready for
the owner yet; Gate A Revision 1 stands unchanged by the evidence.

1. **Idea 17 / 8 soundness.** Score is not soundness (Dragon 7...Ng4). Restrict
   to mistakes whose punishment the shards show; count by family; read every
   item by hand for whether the "better" move is sound. The owner allowed a
   container-only engine (charter, 2026-11-25): install Stockfish in the run's
   container and check each "better" move with it, committing nothing installed.
   If under ~5 families survive, 17 dies and 8 is a small feature for popular
   pages.
2. **Idea 15 spike.** The u1400 vs 2200 main path side by side, at 390 px, on
   three families (Italian, French, 1.d4 Nf6). Data reach via the shards first;
   note where the proxy would be needed.
3. **Idea 11 copy.** "About 1 in N games that start <root> reach this position"
   on three obscure pages: does it lead anywhere (a "usual game goes X" link)?
4. Raise or lower the run limits in `operating.md` from the owner's usage %.

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
