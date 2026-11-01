# Active Context

**Date:** 2026-11-01

## Current Task: #205, rank by your level (merged #216; #219 open)

Plan: `docs/superpowers/plans/2026-10-29-level-ranking.md`, Phase 3, on
`feat/your-level`. `hooks/useMyLevel.ts` is the saved band, live across
components and tabs; its setter tracks `band_select` with a surface. Discover
gets a "Your level" facet (first, divided off, outside Clear filters and the
URL) and "Popular with intermediate players". Search takes `?band=` on both
halves (`searchService.gamesFor`, `NameIndex.search(q, gamesOf)`, a slice per
band) with a "Ranked for intermediate players · Change" line on all three
surfaces. Saved Masters ranks as All. Owner's call (2026-11-01, reversing
ranges-only): levels are named Beginner/Intermediate/Advanced/Expert everywhere,
the Lichess range beside the name in the menu (heading "Lichess rating") and in
the note by the count, so chess.com players pick by name. The words name players
only: the Difficulty facet is retired (#206), `?level=` is ignored. Not built:
setting the level from Analyse (#205 step 2), the rating input, the rest of #206
(Theory: Light/Moderate/Heavy; scores well at your level). Stacked on it,
`feat/level-words-search`: a level word in a query ranks by that band instead of
filtering on the LLM tag ("openings for beginners" = Discover's list). Next:
review `data/popularity-2026-10` when October lands, then Task 3c.

## Previous Task: #208, progressive content review

Pages now have a review record: `data/content-review/ledger.json`, keyed by FEN,
with the date, a verdict and a hash of the description and plans. A page is due
again when its text changes or after 12 months. Seeded with the 105
brief-audited roots (2026-10-11). Batch 2026-11-01: PostHog views since
2026-09-24 (142 paths, 132 pages), top 50 by people reviewed, 17 fixed in
`api/data/eco/` (mostly bishop colours and pieces that aren't there; three
misread positions). 76 visited pages still due. Runbook:
`tools/content-review/README.md`. #208 stays open; #188 should export the
viewed-pages list so step 1 stops needing Chrome.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
