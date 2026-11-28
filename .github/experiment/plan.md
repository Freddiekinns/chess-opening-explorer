# Plan

Phase: **Gate B, Revision 1 waiting on the owner** (Gate A passed 2026-11-26;
prototype on draft PR #252, `gates/gate-b.md`; first phone test 2026-11-27).
Previously: Discover, by testing (revised 2026-11-25).

## Next

**Night 12 (Tuesday 01:00 UTC).** Runs fall on Monday-to-Friday nights, at 01:00
the morning after; Saturday 01:00 is Friday night, and the content routines own
Sunday 19:00 to Monday 14:00. Night 11 answered the owner's Gate B reply with
Revision 1 on PR #252: the parts drill, "they leave the line" and near puzzles
(`gates/gate-b.md`).

1. **Owner replies first:** questions 8 and 9 (and 6, 7).
2. **"Off the line" per band.** Night 11 measured the other bands (`spikes/16`,
   Per band). Build the file per band and let the component pick the learner's
   level. Push to #252 only together with an owner-requested change (each push
   is a build).
3. **Gate C plan** once Gate B says yes. It is three small PRs: the route; the
   component behind its flag; the data files with their generators under
   `tools/` (positions, engine and puzzle filter, documented as a data step,
   since the owner allowed the CC0 file and Stockfish output). The generators
   must not live only in `spikes/`.
4. **Lines with no Test step** (1,039 of 1,592, including the Center Attack and
   the Najdorf): is there a third connected test? Candidates are idea 23 (punish
   the common mistake) and idea 25 (the line and its next line, mixed).
5. `[local]` option for exact fit: export the 1914 puzzle games' moves from
   lichess.org on the owner's machine (the cloud is refused).

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
- After night 10: owner reports that night's weekly usage %, to check the new
  limits in `operating.md`.
