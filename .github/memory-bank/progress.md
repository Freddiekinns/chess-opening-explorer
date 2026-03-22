# Progress: Chess Opening Explorer

## What's Done (newest first)

- **TASK016 — Design Overhaul** (2026-03-21, in progress): Top bar nav, sidebar,
  bottom tabs, detail page restructure with OpeningNavigator, stacked sections
  replacing tabs. Chunks 1–5 done, chunk 6 in progress.
- **TASK015 — Opening Tree Navigation** (2026-03-18): Vertical indented tree
  replacing flat related openings list. Backend tree-service + 2 routes,
  frontend OpeningTree component with ARIA keyboard nav. 9 dead files deleted.
- **User Journeys Doc** (2026-03-19): Created `user-journeys.md` as source of
  truth for all main user flows.
- **Video Overindexing Fix** (2026-03-16): 2-word alias minimum, cross-opening
  title check, minMatchScore 40→60, sub-variation penalty.
- **TASK012 — Video Pipeline Overhaul** (2026-03-15): Unified pipeline with 3
  modes (incremental/full/rematch). Scorer fixes, 5 new channels, parallel RSS.
  1,700+ videos indexed.
- **TASK011 — Search Bandwidth & Vercel Limits** (2026-03-14): Eliminated 24.8
  MB `/all` preload. Server-side search, CDN cache headers on all routes.
- **TASK010 — Local Repertoire** (2026-03-13): Star openings,
  localStorage-backed "My Repertoire" section. useSyncExternalStore, cross-tab
  sync.
- **Sort Controls** (2026-03-12): Segmented pill bar for personal opening stats
  (Most played / Best / Worst).
- **TASK009 — SEO** (2026-02-28): Vercel Edge Middleware + React 19 metadata +
  JSON-LD for all 12,377 opening pages.
- **TASK007 — Mobile Overflow Fix** (2026-02-23): CSS Grid `minmax(0, 1fr)` fix.
  Playwright regression test.
- **Coverage Reporting** (2026-02-23): Vitest coverage enabled for frontend.
- **State Persistence** (2026-02-23): sessionStorage for Analyse page form
  inputs + dashboard results.
- **TASK004 — Course Discovery Pipeline** (2026-02-18): Two-step Lichess study
  import. 6,142 entries across 2,255 FENs from 440 studies.
- **Practice Mode** (2026-01-30): Interactive move trainer with click + drag,
  hints, audio, Lichess-style visual indicators.
- **Personal Opening Explorer**: Chess.com + Lichess integration, insights
  dashboard, sort controls, session cache.
- **PGN Identification**: Modal for pasting PGN to identify openings. 36 unit +
  28 integration tests.

## What's Left

- **TASK016 chunk 6 remaining**: Visual polish, mobile refinements, fix 16
  broken tests
- **TASK006 — Coverage**: Backend 90%+, frontend 70%+ targets
- **Advanced Filtering**: Filter by win rate, draw rate, etc.
- **Design System Tokens**: CSS variables for accent gradients and spacing
- **Tooltip Abstraction**: Central ARIA tooltip component

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
- **16 broken tests**: Deferred during TASK016 design overhaul (to be fixed at
  end)
