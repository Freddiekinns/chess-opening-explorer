# Progress: Chess Opening Explorer

## What's Done (newest first)

- **GSC Sitemap "Couldn't fetch" Fix** (2026-05-20, PR #32): Re-added
  `sitemap.xml`/`robots.txt` to the `middleware.ts` matcher exclusions. The
  2026-03-29 SEO refactor broadened the matcher and dropped them, routing the
  static sitemap through the Edge `return fetch(request)` round-trip — GSC
  reported "Couldn't fetch / Type: Unknown" from the 30 Apr submission. Needs
  deploy + GSC re-submit to confirm.

- **Opening Detail Layout — Sticky Board + FEN Polish** (2026-04-19): Switched
  two-column grid from `align-items: stretch` to `start` with sticky left column
  so the board stays visible while scrolling. Removed navigator nested scroll.
  FEN font: monospace → DM Sans at 13px (16px mobile). Build clean.

- **Primary Domain Migration** (2026-03-29): Switched repo SEO outputs from
  mixed `openingbook.com` / `openingbook.vercel.app` values to
  `https://openingbook.xyz`. Added shared site config, updated canonical/OG/
  JSON-LD tags, updated `robots.txt` and committed sitemap URLs, added
  middleware redirect from `openingbook.vercel.app` to `.xyz`, and refreshed
  README live-site link. `npm run build:vercel` clean.

- **Mobile Footer + Landing Card Polish** (2026-03-29): Fixed mobile footer
  overlap with bottom tab bar by unifying nav height spacing and adding footer
  clearance above the fixed tabs. Fixed popular opening card thumbnails on
  mobile so the chessboard stays square and fills the thumbnail rail without
  dark bars. Frontend build clean.

- **TASK016 Phase B — Design Token Migration & Polish** (2026-03-28): "Warm
  Editorial Dark" design system fully applied. Replaced ~80 hardcoded colours in
  `simplified.css` with design tokens. Analyse page overhauled: distribution
  bars now use chess-thematic result colours (amber/grey/cream), card labels
  subdued, orange dominance removed. Surface elevation scale warmed (#1a1816 →
  #363330). Nav bar height 60px, logo/nav items 16px. Detail page section
  headers use headline font at 16–18px. Landing page staggered entrance
  animations added. Repertoire section entrance animation added. 14 CSS module
  files migrated to design tokens by background agents.
- **Footer Standardisation** (2026-03-28): MIT LICENSE added to repo root;
  footer consolidated with brand, copyright, MIT mention, and survey link;
  `FeedbackSection` component removed from all pages.
- **Backend Test Cleanup** (2026-03-22): Removed expected console noise from
  route/service tests and fixed Jest worker teardown risk by unref'ing the
  global cache cleanup interval. Backend suite clean at 43/43 suites.
- **TASK016 — Test Suite Repair** (2026-03-22): Fixed 3 broken practice-mode
  Vitest specs after practice controls moved to CSS Modules. Added
  `aria-pressed` to color toggles and mocked audio asset fetches in tests.
- **TASK016 — Design Overhaul** (2026-03-21, in progress): Top bar nav, sidebar,
  bottom tabs, detail page restructure with OpeningNavigator, stacked sections
  replacing tabs, plus home page redesign with MiniBoard thumbnails and Analyse
  page mobile dashboard redesign. Chunks 1–8 done. Chunk 9 remaining (global
  polish).
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

- **TASK016 chunk 9**: Global polish pass (broken tests, dead CSS, focus rings)
- **Bottom nav investigation**: User flagged bottom nav may be missing on
  Analyse page — needs verification
- **TASK006 — Coverage**: Backend 90%+, frontend 70%+ targets
- **Advanced Filtering**: Filter by win rate, draw rate, etc.
- **Tooltip Abstraction**: Central ARIA tooltip component

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
- **16 broken tests**: Deferred during TASK016 design overhaul (to be fixed at
  end)
