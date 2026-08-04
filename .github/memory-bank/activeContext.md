# Active Context

**Date:** 2026-08-04

## Current Task: Search that answers in milliseconds, on all three surfaces

Reported symptom: the hero returns instantly, the top bar "hangs and searches
and loads", and the two give different answers. Both halves were real.

**The server was slow, not the top bar.** Every text query ran through Fuse over
name/moves/style_tags/**description** with `ignoreLocation` — bitap across
12,377 half-page descriptions. Measured warm: "sicilian" 1,046ms, "king's indian
defense" 2,489ms, "queen's gambit declined" 2,829ms, "aggressive openings"
2,397ms. The hero hid it behind a locally held index slice; the other two had
nothing to hide it with. It bought nothing either — "sicilian" matched 4,269 of
12,377 openings, and the re-ranking passes downstream existed to undo that.

- `search/NameIndex.js`: literal name matching, banded (exact phrase → whole
  words → last word being typed → substring), each band ordered by
  `games_analyzed`. **2–5ms.**
- `search()` is now five passes, first to speak wins: move, ECO, name, meaning,
  spelling. Deleted the routing heuristics that guessed instead
  (`looksLikeOpeningName`, `isAmbiguousSemanticTerm`, `tryNameSearchFirst`) —
  "aggressive openings" contains "aggressive" so it was ruled ambiguous and sent
  to fuzzy name search, returning the Andersspike in 2.4s. Now 62ms, semantic.
- Fuse keeps `name` + `style_tags` only. Typo queries 850–1,400ms → 100–270ms;
  the dropped keys changed the result set by 4 openings in 1,753.
- Two saturating popularity terms fixed to `log10(games)/N`: the semantic path
  capped at 1,000 games (so style searches were in corpus order) and move search
  at 500M (so "e4" was too).
- Search responses projected to what a row draws: **55 KB → 4.4 KB**.

**The client difference was one prop.** `lib/searchIndex.ts` holds one shared
slice for all three surfaces, fetched on the first character rather than on
mount — so the landing page no longer spends 207 KB on every visitor. Client and
server now rank by the same bands, pinned by `local-server-parity.test.ts`,
which imports the server's CommonJS module directly. One request per query: the
plain-search fallback found nothing semantic search missed across 389 sampled
queries. The PGN lookup now loads the full index when its modal opens, so it
identifies openings outside the popular thousand (it could not before).

Verified in the browser on all three surfaces; 590 frontend + 844 backend tests
pass.

## Previous Task: Review pass over the seven-PR UX stack

Six defects found and fixed on the stack tip: TopBar search crashed on
ArrowDown+Enter with an empty list; stale search responses repainted the list;
`AbortError` reported as a user-facing error; `OpeningCard` drew 0%/0%/0% for
openings with no stats; `MobileDataSurface` said "Loading Lichess data…"
forever; `.opening-card` invisible under `prefers-reduced-motion`. Not fixed
deliberately: two `useRepertoireToast` instances on the landing page overlap at
the same fixed slot — a proper fix is one shared toast host. Full detail in
`archive.md`.

`main` is merged into the stack tip. Merge order for the seven PRs is in
`progress.md` → What's Left; do not squash inside the stack.
