# Plan

Phase: **1 — Discover** (nights 1–5). Gate A at the end.

## Next

**Night 6 — Gate A** (queue item 6). Write `gates/gate-a.md` from
`research/01`–`05`: the recommendation (first slice `?practice=` + Practice
fixes + #196 memory; then one family unit as the Gate B prototype), the
alternatives turned down (deviation trainer first, the 31-family written book,
Practice fixes without memory, more per-page plan text), the critic's case
answered, the success measure (owner and testers, analytics as sanity check),
and a rough slice plan. Comment in #249.

Before Gate A, every candidate is checked against the open issues that already
cover parts of it (`gh api` the issue list): #195 personal strip, #196 practice
memory, #197 divergence callout, #199 "Start here", #207 sparring, #209 unnamed
continuations, #228–233 common plans, #244 video ranking by views. Build on them
or say why not.

## Queue

Phase 1 — Discover (one research file each):

2. ~~How others teach openings~~ — done, night 2.
3. ~~Why learners use YouTube and not sites like ours~~ — done, extra run
   2026-11-23. Candidate: a family-level study unit (short video → play the line
   → review), pending Practice's drop-off and night 4/5.
4. ~~What the free chess book needs~~ — done, extra run 2026-11-23. The book
   exists (Wikibooks); ours lacks a chapter's shape. Candidate shrunk: Practice
   fixes (wrong-move message, show the line first, band-aware extension) + #196,
   then one family unit.
5. ~~Your games~~ — done, extra run 2026-11-23. Own games are a later optional
   layer; #195's `?practice=` is the shared seam.
6. **Gate A.** Two or three candidate features, a recommendation, the critic's
   case against it answered, the success measure, and a rough slice plan.
   Comment in the inbox.

Phase 2 — Design (after Gate A; nights ~7–9): prototype, iterate on the owner's
notes, Gate B.

Phase 3 — Build (after Gate B; nights ~10–15): slices as PRs behind an unlinked
route or flag, Gate C per PR.

Phase 4 — Retrospective: `retro.md`.

## Before Gate A

- Check open PRs as well as issues before recommending
  (`gh api repos/Freddiekinns/chess-opening-explorer/pulls`). Night 4 found
  Practice silently rejects a wrong move; PR #241 (`feat/practice-hint-ladder`,
  open) already draws an arrow after the third wrong move. Gate A's "Practice
  fixes" must build on #241, not duplicate it. #234–236 (common plans) are open
  too.
- Night 2's claims were revisited on the extra run (`research/02`, "Revisited"):
  own games + repertoire + drill are free elsewhere (HollowLeaf Repertoire
  Builder, ChessAtlas), so Gate A must argue our edge as no account and every
  position, not "the only free site". Still unverified hands-on — see the local
  item below, or a night once `lichess.org` and `chessbook.com` are allowed
  (questions.md 2).

## Local items `[local]`

- Find out what the w/c 2026-11-09 spike was (PostHog: landing pages, user
  agents and session lengths of US direct visitors to `/`).
- What is `/assets/` (11 pageviews)?
- Walk night 1's three journeys on a real phone (fold positions were read from
  code, not seen).
- Try HollowLeaf's Repertoire Builder and ChessAtlas free tiers (~15 min): does
  either start without building a repertoire first, and how good is the game
  check? (Cloud cannot reach `lichess.org` or `chessbook.com`.)
- Search Console: are landing queries exact line names (lookup) or "how to play
  X" (study)? Decides who a study unit serves (`research/03`, critic 3).
- Do Hanging Pawns' and Naroditsky's videos carry chapter timestamps? (Cloud
  gets YouTube's captcha.) Decides whether "jump to this line" is cheap.
- Read `practice_abandon` `{moves, of}` in PostHog: where do the 8 of 13 stop?
  Decides which Practice fix comes first (`research/04` §3).
- Week 1: owner posts weekly usage % in the inbox each morning.
