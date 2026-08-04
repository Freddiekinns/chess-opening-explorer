# Active Context

**Date:** 2026-08-04

## Current Task: Search that answers in milliseconds, on all three surfaces

Reported: the hero returns instantly, the top bar "hangs and loads", and the two
give different answers. Both halves were real.

**The server was slow; the hero was hiding it.** Every text query ran through
Fuse over name/moves/style_tags/**description** — bitap across 12,377 half-page
descriptions. Warm: "sicilian" 1,046ms, "king's indian defense" 2,489ms,
"queen's gambit declined" 2,829ms. It bought nothing either — "sicilian" matched
4,269 of 12,377 openings, and the re-ranking downstream existed to undo that.

- `search/NameIndex.js`: literal name matching, banded (exact phrase → whole
  words → last word being typed → substring), each band ordered by
  `games_analyzed`. **2–6ms.**
- `search()` is five passes, first to speak wins: move, ECO, name, meaning,
  spelling. Deleted the heuristics that guessed instead (`looksLikeOpeningName`,
  `isAmbiguousSemanticTerm`, `tryNameSearchFirst`) — "aggressive openings" was
  ruled ambiguous and sent to fuzzy name search, returning the Andersspike in
  2.4s. Now 62ms, semantic.
- Fuse keeps `name` + `style_tags` only: typos 850–1,400ms → 100–270ms, and the
  dropped keys changed the result set by 4 openings in 1,753.
- Two saturating popularity terms → `log10(games)/N`: semantic capped at 1,000
  games (style searches ran in corpus order), move search at 500M ("e4" too).
- Search responses projected to what a row draws: **55 KB → 4.4 KB**.

**The client difference was one prop.** `lib/searchIndex.ts` holds one slice for
all three surfaces, fetched on the first character rather than on mount — the
landing page no longer spends 207 KB on every visitor. Client and server rank by
the same bands, pinned by `local-server-parity.test.ts`, which imports the
server's CommonJS module directly. One request per query: the plain-search
fallback found nothing semantic search missed across 389 sampled queries. PGN
lookup now loads the full index when its modal opens, so it identifies openings
outside the popular thousand — it could not before. Verified in the browser on
all three surfaces; 590 frontend + 844 backend tests pass.

## Previous Task: Review pass over the seven-PR UX stack

Six defects fixed on the stack tip: a TopBar keyboard crash on an empty list, a
stale-response race in `useOpeningSearch`, an `AbortError` shown as an error, a
0%/0%/0% bar for `null` stats, a permanent "Loading Lichess data…" on mobile,
and an invisible Discover grid under reduced motion. Left deliberately: two
`useRepertoireToast` instances overlap at one fixed slot. Detail in
`archive.md`.

`main` is merged into the stack tip. Merge order for the seven PRs is in
`progress.md` → What's Left; do not squash inside the stack.
