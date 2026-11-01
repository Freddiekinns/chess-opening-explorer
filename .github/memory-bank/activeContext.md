# Active Context

**Date:** 2026-11-01

## Current Task: #205, rank by your level (PR open)

Plan: `docs/superpowers/plans/2026-10-29-level-ranking.md`, Phase 3, on
`feat/your-level`. `hooks/useMyLevel.ts` is the saved band, live across
components and tabs; its setter tracks `band_select` with a surface. Discover
gets a "Your level" facet (first, divided off, outside Clear filters and the
URL), "Popular at 1400–1800" and "212K games at 1400–1800" on cards. Search
takes `?band=` on both halves (`searchService.gamesFor`,
`NameIndex.search(q, gamesOf)`, a slice per band) with a "Ranked for … · Change"
line on all three surfaces. Owner's call: the menu is headed "Lichess rating",
no chess.com note or conversion. Saved Masters ranks as All. Not built: setting
the level from Analyse (#205 step 2), the rating input. Next: #206 (retire
Difficulty, label bands by range everywhere), then review the
`data/popularity-2026-10` branch when October's file lands, then Task 3c.

## Previous Task: #204, dated per-band stats (merged #213, #214)

Stats are the last 3 Lichess monthly files (Jul–Sep 2026, blitz/rapid/
classical), combined into `popularity_stats.json`, `popularity-bands.json` and
256 `position-stats/` shards; the detail page reads Lichess bands from the page
response. The monthly refresh task is registered and commits to a local
`data/popularity-YYYY-MM` branch.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
