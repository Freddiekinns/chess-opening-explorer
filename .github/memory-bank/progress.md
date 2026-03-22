# Progress: Chess Opening Explorer

## What Works

- **Core Opening Data:** The full database of 12,377+ openings is integrated and
  served via the API. Lightweight search index available at
  `/api/openings/search-index` (1.6 MB).
- **Search:** Multi-layered search (Semantic, Fuzzy, Exact) via server-side
  `/api/openings/semantic-search`. Landing page hero has full search bar. Detail
  page TopBar has debounced server-side search (zero preload) + "Surprise me"
  button. Backend responds in 1-5ms.
- **Edge Caching:** All API routes have `Cache-Control` headers in
  `vercel.json`. Static data cached 1h at CDN edge with 24h
  stale-while-revalidate. Search endpoints cached 5min. Crawler traffic served
  from CDN, not origin lambdas.
- **Popularity Stats:** The system successfully processes Lichess game data to
  calculate and display opening popularity scores.
- **Video Pipeline:** Unified pipeline with three modes: `incremental` (RSS,
  default), `full` (YouTube API catalogue rebuild), and `rematch` (re-score
  only, zero API cost). 16 trusted channels configured. Scorer fixes: agadmator
  promoted to goodEducator, chess24 demoted to entertainment, targeted
  player-vs-player penalty replaces broad "vs" penalty. Parallel RSS fetching.
  Over 1,700 videos indexed. Anti-overindexing: 2-word minimum for alias
  fragments, cross-opening title check rejects content-only false positives,
  sub-variation penalty for generic family matches, minMatchScore raised to 60.
  Backfill script (`tools/video-pipeline/scripts/backfill-views.js`) restores
  view counts and thumbnails from YouTube API after rematch.
- **Course Recommendations:** The backend data and API endpoint\n
  (`/api/courses/:fen`) for course recommendations are complete. courses.json\n
  contains 6,100+ study chapters across 2,255 FENs from 440+ Lichess studies,\n
  all curated with like counts. Each entry is matched to the deepest ECO\n
  position from the study chapter\u2019s PGN moves.
- **Course Discovery Pipeline:** Two-step architecture for importing Lichess
  studies into `courses.json`. Step 1: `discover-popular.js` searches Lichess
  for popular studies (500+ likes), classifies as opening-related, outputs new
  URLs. Step 2: `add-studies.js` reads `curated-studies.txt`, fetches
  metadata+PGN via Lichess API, matches chapters to ECO openings by FEN, and
  writes to `courses.json`. Supports `--resume`, `--dryRun`, `--limit`,
  `--verbose`. Currently 6,142 entries across 2,255 FENs from 440 studies. All
  entries are `curated: true` with like counts. 491 tests across 35 suites. Run
  via `npm run course:discover` (discovery) or `npm run course:import` (import).
- **Studies Tab (Frontend):** `StudiesGallery` component on opening detail page
  showing curated Lichess studies with "Open" links (chapter-level when
  available), show-more toggle, and Lichess/Chessable search links. Tab order:
  Overview → Plans → Studies → Videos. Branch: `feat/studies-tab`.
- **Unified Architecture:** The monorepo structure with shared packages and the
  Vercel deployment pattern are implemented and working.
- **Frontend Foundation:** The React/Vite frontend is set up with routing, a
  basic layout, and the critical single CSS file architecture.
- **Opening Detail Layout:** Right column now prioritizes opening moves and win
  rate, with segmented win-rate bar styling aligned to landing page patterns.
- **Related Openings UI:** Consolidated inline expandable teaser with smooth JS
  height animation, unified card header pattern, contextual mainline callout
  (variation view), ECO pill metadata (accessible & de-emphasized), passing test
  coverage (navigation, structure, UI).
  - Move sequences displayed below opening names to distinguish same-named
    variations
  - Parallel data fetching eliminates loading delay (fetched alongside main
    opening)
  - Frontend test consolidation: Removed legacy tab component & duplicate root
    Jest UI test; now all related openings UI tests live under `packages/web`
    (Vitest).
  - Placement tuned so teaser sits under the board on desktop and moves to the
    bottom when the layout stacks
- **Practice Mode (Move Trainer):** Interactive practice mode on opening detail
  page where users can:
  - Play opening moves by dragging OR tapping pieces on the board
  - Receive immediate feedback (correct moves accepted, incorrect rejected)
  - Get hints (amber highlight on piece to move) after 2 failed attempts or
    manually
  - Toggle between playing as White or Black (board flips accordingly)
  - Hear audio feedback (move sounds, completion chime)
  - See progress counter and completion state
  - **Visual indicators (Lichess-style):** Previous move highlighting, dots for
    legal moves, rings for captures
  - **Mobile tap-to-move:** Works on real mobile devices (react-chessboard
    v5.8.6)
  - 15 passing tests covering the full practice flow
- **PGN Opening Identification:** Users can paste PGN games/moves to identify
  openings:
  - Modal accessible via "Or search by PGN" link on landing page
  - Parses full PGN (headers, comments, variations stripped automatically)
  - Validates moves and generates FEN positions using chess.js
  - Finds deepest matching opening in database
  - Shows exact vs partial match info (when game extends beyond known openings)
  - Direct navigation to opening detail page
  - 36 unit tests + 28 integration tests
- **Personal Opening Explorer:** Complete feature for analysing personal game
  history:
  - **Dedicated Analyse page:** Separate `/analyse` route with its own hero
    section
  - **Multi-platform support:** Chess.com (default) and Lichess
  - **Game filtering:** Rated rapid/blitz/classical only (excludes bullet,
    daily, variants)
  - **Actionable insights dashboard:**
    - Win rate comparison by color (White vs Black)
    - Best opening identification (highest win rate, 2+ games)
    - Weakest opening identification (needs work, 2+ games)
    - Clickable cards linking directly to opening detail pages
  - **Opening breakdown:** Top 10 openings per color with W/D/L stats
  - **Sort controls:** Segmented pill bar (Most played / Best first / Worst
    first) between insights card and opening lists, shared across desktop
    columns and mobile tabs
  - **Win-rate visualization:** Green gradient indicator on each row
  - **Performance:** Server-side caching (10 min), client-side session cache
  - **Responsive design:** Adapts from desktop to mobile layouts
  - **Navigation:** Back button from opening detail returns to correct source
    page (Discover or Analyse)
  - **Test coverage:** 21 Chess.com service tests, 9 route tests, 132 frontend
    tests

- **Local Repertoire (TASK010):** Users can star openings from the detail page
  and access them in a "My Repertoire" section on the landing page.
  localStorage-backed with same-tab + cross-tab sync, no backend required.
  Compact card design with ECO badge, complexity tag, clamped name, and
  monospace moves. Responsive horizontal scroller. Star toggle with CSS pulse
  animation. Safe localStorage write handling. 12 hook tests. Branch:
  `feature/local-repertoire`.

## What's Left to Build

- **Coverage Improvements:** Increase backend coverage to meet 90% thresholds
  and raise frontend coverage toward 70%+ (see TASK006).
- **Advanced Filtering:** The client-side filtering capabilities can be expanded
  (e.g., filter by win rate, draw rate, etc.).
- **Design System Tokenization:** Extract accent bar gradient & spacing into CSS
  variables for theme agility.
- **Tooltip Abstraction:** Central component for consistent ARIA + styling
  (currently native title attributes).

- **SEO & Google Indexing:** Vercel Edge Middleware injects unique `<title>`,
  `<meta description>`, canonical URL, Open Graph, and Twitter Card tags for
  every opening page at the edge layer (before JS runs). React 19 native
  document metadata manages client-side meta tags for SPA navigation. JSON-LD
  structured data on opening detail pages. Build-time SEO lookup generator
  creates a 1.7MB compact FEN-to-metadata map from ECO data.

## Current Status

- **TASK016 Design Overhaul — in progress.** Top bar navigation replaces sidebar
  (chunks 1–5 done). Detail page restructured: tabs removed, stacked sections,
  OpeningNavigator component, widened board column (chunk 6 in progress).
  Learning resources section polished: search pills inline with heading, empty
  columns hidden, font sizing improved. Remaining: visual polish, mobile
  refinements, broken tests.
- The project is in a solid state with a robust backend and data pipeline.
- Personal Opening Explorer is complete with multi-platform support and polished
  UI.
- SEO infrastructure deployed: unique meta tags for all 12,377 opening pages,
  Open Graph tags for social sharing, JSON-LD structured data.
- The core data-heavy features are largely complete on the backend.

## Known Issues

- **React 19 / Testing Library Compatibility:** There was a known issue with
  React 19 and `@testing-library/react`. While component fixes have been
  implemented, this is an area to watch during future upgrades.

## Recently Resolved

- **TASK011 — Search Bandwidth & Vercel Limits (2026-03-14):**
  `/api/openings/all` (24.8 MB) was fetched on every page mount, causing 96.8 GB
  origin transfer from crawler traffic. Fixed by adding CDN cache headers to all
  API routes and eliminating the large preload from GlobalHeader (server-side
  search) and OpeningDetailPage (switched to 1.6 MB search-index).
- **TASK007 — Mobile Overflow on Opening Detail (2026-02-23):** Content-heavy
  openings overflowed horizontally on mobile due to CSS Grid `1fr` resolving to
  `minmax(auto, 1fr)` and a grid child missing `min-width: 0`. Fixed with
  `minmax(0, 1fr)` + wildcard `min-width: 0` on grid children. Regression test
  added.
