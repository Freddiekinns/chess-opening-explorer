# Plan

Phase: **1 — Discover** (nights 1–5). Gate A at the end.

## Next

**Night 3 — why learners use YouTube and not sites like ours** (queue item 3).
Start with the creators `api/data/video-index.json` ranks highest (31 MB: read
its shape with a streaming or `head -c` look, never whole). Night 2's finding to
test: learners already run video → written book → drill → own games across four
sites, and hop video to video and forget (`research/02-how-others-teach.md`).
What would make our page the place they watch, then keep going?

Before Gate A, every candidate is checked against the open issues that already
cover parts of it (`gh api` the issue list): #195 personal strip, #196 practice
memory, #197 divergence callout, #199 "Start here", #207 sparring, #209 unnamed
continuations, #228–233 common plans. Build on them or say why not; night 1
proposed three shapes that overlap #195 and #196 without citing them.

## Queue

Phase 1 — Discover (one research file each):

2. ~~How others teach openings~~ — done, night 2.
3. ~~Why learners use YouTube and not sites like ours~~ — now Next.
4. **What the free chess book needs.** The common plans as they stand
   (#228–236), what a real opening book chapter has that a plan list lacks, and
   what can be built from data we already hold without new pipelines.
5. **Your games.** The deviation-trainer PRD, what shipped from slice 1, and why
   slice 2 never started; how others (Aimchess, Chessbook, Lichess insights)
   connect games to study.
6. **Gate A.** Two or three candidate features, a recommendation, the critic's
   case against it answered, the success measure, and a rough slice plan.
   Comment in the inbox.

Phase 2 — Design (after Gate A; nights ~7–9): prototype, iterate on the owner's
notes, Gate B.

Phase 3 — Build (after Gate B; nights ~10–15): slices as PRs behind an unlinked
route or flag, Gate C per PR.

Phase 4 — Retrospective: `retro.md`.

## Before Gate A

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
- Week 1: owner posts weekly usage % in the inbox each morning.
