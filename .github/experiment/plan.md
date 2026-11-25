# Plan

Phase: **1 — Discover** (nights 1–5). Gate A at the end.

## Next

**Waiting on Gate A, revision 1** (`gates/gate-a.md`, top section; asked in
#249 on 2026-11-25). The owner's first answer (2026-11-24) was "possibly" with
questions, so the recommendation became a board-first play-through (video
optional, from ~8 ply, default line Italian Center Attack). Until the owner
answers A, a night writes one journal line and exits. When it passes: Phase 2
starts with step 0 `[local]` abandon read, then the play-through prototype, with
the answers to B, 3 and 4 applied first. Push the state branch once a night
(Vercel builds every push).

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
6. ~~Gate A~~ — written night 6; revised night 7 after the owner's questions
   (board first); awaiting the owner.

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

- Gate A questions 1–5 in `gates/gate-a.md` (answer in #249).

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
