# Plan

Phase: **Gate B, waiting on the owner's phone test** (Gate A passed 2026-11-26;
prototype on draft PR #252, `gates/gate-b.md`). Previously: Discover, by testing
(revised 2026-11-25). Gate A is a discussion the owner is offered once an ##
Next

**Night 11 (Monday 01:00 UTC; Friday is the week's last night).** Night 10 built
the Gate B prototype (`spikes/13`, PR #252, `feat/exp-play-through`) and wrote
`gates/gate-b.md`. Nothing goes to production before the owner's Gate B answer.

1. **Owner replies first:** Gate B questions 6 and 7 in `questions.md`.
2. **Return reason, spiked** (the critic's first objection): (a) "next line"
   after the end pause (776 of 1,592 lines have one; `spikes/13/next.js`) and
   (b) rotating puzzles from the pool. Spike both in the container on top of
   `feat/exp-play-through`; push to #252 only if the owner has not started
   testing (ask first), else keep local with screenshots.
3. **Puzzle fit, residual:** pawns and minor pieces cannot separate lines that
   differ only in where a developed piece went (Polerio 5...Na5 vs Fritz 5...Nd4
   both leave b8). A cheap extra check: the piece the line's last moves placed
   must be on its square or have moved on (not on a square the sibling uses).
   Measure on a sample before changing the file.
4. **Gate C plan** once Gate B says yes: three small PRs (route, component
   behind its flag, puzzle file + its generator under `tools/`), each with
   tests. The generator becomes a documented data step (the owner allowed the
   CC0 file); it must not live only in `spikes/`.
5. Do not re-push #252 needlessly: every push builds a preview. **On the next
   push, fix the button copy** "3 puzzles from games like this" → "3 puzzles
   from the <variation>" (`spikes/13`: 14 of 36 fit the exact sub-line, 33 the
   variation).
6. `[local]` option for exact fit: export the 1914 puzzle games' moves from
   lichess.org on the owner's machine (the cloud is refused), keep only puzzles
   whose game passed through the page's position.

Decided 2026-11-26): safety net ~180 main calls, no time floor; finish the Next
items you can do tonight (item 2 is one).

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
