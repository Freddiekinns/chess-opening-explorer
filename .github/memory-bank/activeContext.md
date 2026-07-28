# Active Context

**Date:** 2026-07-28

## Current Task: UX review phase 4 — opening detail desktop (`ux/phase-4-detail-desktop`)

Fifth of six phases implementing the 2026-07 UX review. Stacked on
`ux/phase-3-filter-bar` (PRs #58–#61 still open into `feat/ux-review`).

The level filter sat inside the stats card, did **not** reach the master games
in that same card, and silently drove a separate card outside it. There was no
way to learn what it governed by using it. Phase 4 draws the answer as a border.

- **New `ExplorerCard`**: raised header band (title "Opening explorer", source
  line, `LevelLens`) over stats + breadcrumb + next moves + alternatives.
  Everything the pills govern is inside; nothing outside moves.
- **`WinRatePanel` is now presentational** — no pills, no master games, and no
  fetch of its own. It takes the page's `ExplorerQuery`, which was already
  requesting the same fen/band pair for the book. `WinRateBar` retired with it.
- **Shared `MasterGamesCard`** (card + accordion variants) replaces
  `MobileMasterGames` and the duplicate masters fetch. On mobile it moves below
  Learning resources, so both breakpoints share one block order.
- **One labelling module** (`lib/explorerStats.ts`) — source line, "Games ·
  1400–1800", "Most popular at 1400–1800" — imported by both breakpoints so they
  cannot drift. Snapshot fallback says "Saved snapshot", never "Lichess".
- **Every reveal names its payload**: moves / games / videos / studies / plans.
- **The explorer error beacon moved into `useExplorerQuery`.** It lived in
  `WinRatePanel`, which never renders on mobile — every mobile band failure was
  invisible to analytics.

**Copy deviates from the mock twice, both because we lack the data:** master
games are sourced "Over-the-board masters" (the proxy applies no rating filter,
so "2,400+ Elo" would be invented) and the reveal is "Show N more games" (we
hold ≤15 top games, deduped, so "All 47" is unstatable).

**Verified:** 441 frontend, 833 backend, clean build; live at 1360 and 390 —
filter scope, source line and captions all track the pills; the board sticks and
releases at the rail's end. **Spec/plans:** `docs/superpowers/{specs,plans}/`

## Previous Task: UX review phase 3 — faceted filter bar (PR #61)

Level · Style · Family · Sort replacing two unlabelled pill rows; one
`/api/openings/browse` request feeds grid, count and facets; URL-param state;
mobile sheet portalled to `<body>`. **Detail in `archive.md`.**
