# Active Context

**Date:** 2026-03-21

## Current Focus: TASK016 Design Overhaul — Chunk 4b Complete

### Chunk 4b: Replace sidebar with top bar (2026-03-21)

**What was done:**

- Created `TopBar.tsx` + `TopBar.module.css` — 56px sticky top bar replacing
  sidebar
- Logo left ("Opening Book"), nav centred (Discover, Analyse) using CSS Grid
  `1fr auto 1fr` for true-centre alignment
- Text-only nav items (dropped icons — cleaner for 2-item horizontal nav)
- Orange underline active state (conventional for horizontal navs)
- Focus-visible outlines on logo and nav items
- Removed all sidebar `margin-left` rules from `.app-content`
- Deleted `Sidebar.tsx` + `Sidebar.module.css`
- Mobile: nav hidden below 640px, bottom tabs unchanged

**Next:** Chunk 5 — detail page ContentHeader (with search).

### Chunk 3: Remove old navigation (2026-03-21)

**What was done:**

- Removed `<LandingHeader />` from `LandingPage.tsx` and `AnalyseGamesPage.tsx`
- Deleted `LandingHeader.tsx` entirely (no remaining references)
- Removed all `.landing-header*` styles + responsive media query from
  `simplified.css`
- Reduced hero section `padding-top` from `100px` to `var(--space-8)` (desktop)
  and `var(--space-6)` (tablet/mobile) — the 100px was for the old header
  overlay
- `GlobalHeader.tsx` kept for now (search logic useful for ContentHeader in
  chunk 5)

### Chunk 2: Responsive sidebar — collapse + bottom tabs (2026-03-21)

**What was built:**

- `BottomTabBar.tsx` + `BottomTabBar.module.css` — fixed bottom nav (56px), two
  items (Discover, Analyse), hidden above 640px, orange active text
- Updated `App.tsx` — added `<BottomTabBar />` to layout
- Updated `simplified.css` — added `padding-bottom: 56px` on mobile to prevent
  content being covered by the tab bar

**Build:** clean. **Tests:** 163/163 pass.

### Chunk 1: Layout shell — sidebar + content area grid (2026-03-21)

**What was built:**

- `Sidebar.tsx` + `Sidebar.module.css` — persistent left sidebar with "Opening
  Book" wordmark (plain text, no monogram), two nav items (Discover, Analyse)
  using `NavLink` for active state, orange left-border indicator on active item
- Updated `App.tsx` — `<Sidebar />` + `<main className="app-content">` wrapper
- Updated `simplified.css` — `.app` changed from flex column to CSS grid
  (`200px 1fr`), responsive breakpoints (64px at 900px, hidden at 640px)

**Decision:** Dropped "OB" monogram — plain wordmark is cleaner. Logged in
TASK016 section 10.

---

## Previous: TASK015 Opening Tree Navigation — Complete

## Session Summary (2026-03-18)

### Feat: Opening Tree Navigation (TASK015)

**Problem:** Related openings displayed as a flat list grouped by ECO code
(`RelatedOpeningsTeaser`). Users couldn't see the tree structure — "what
branches from here?" or "what could I have played instead?" were unanswerable.

**Solution:** Vertical indented tree (file-explorer style) with collapsible
breadcrumb header, showing ancestor chain, current node (highlighted), siblings,
and children. Replaces `RelatedOpeningsTeaser` entirely.

**Phase 1 — Backend:**

- Created `tree-service.js` with pre-built index from ECO data (~99ms build,
  cached 1hr via global cache service)
- Two maps: `moveIndex` (normalizedMoves → entry) and `childrenMap` (parentMoves
  → children[])
- `getTreeContext(fen)` returns
  `{ current, ancestors[], children[], siblings[] }` with full ancestor chain
  including each ancestor's siblings
- `getChildren(fen)` for lazy-loading expansion
- Added routes: `GET /fen/:fen/tree` and `GET /fen/:fen/tree/children`
- 20 backend test assertions passing

**Phase 2 — Frontend Hook:**

- Created `useOpeningTree.ts` with `TreeNode`, `AncestorNode`, `TreeContext`
  types
- Returns `{ data, loading, error, fetchChildren }`

**Phase 3 — Frontend Component:**

- Created `OpeningTree.tsx` + `OpeningTree.module.css`
- Collapsed state: breadcrumb bar with ancestor chain as clickable pills
- Expanded state: vertical indented tree (max-height 400px, scrollable)
- Current node: orange left border + subtle orange background
- Keyboard navigation: ↑↓→← Home/End Enter (standard ARIA treeview)
- Lazy-load children on expand via `onFetchChildren` callback
- JS-driven height animation with `prefers-reduced-motion` support

**Phase 4 — Integration:**

- Replaced `RelatedOpeningsTeaser` with `OpeningTree` in `OpeningDetailPage.tsx`
- Inline fetch pattern (not hook) matching existing page data loaders
- Removed mobile/desktop split — tree works at all breakpoints

**Phase 5 — Tests:**

- 15 Vitest frontend tests passing (breadcrumbs, expand, highlight, ARIA,
  keyboard, loading)
- 20 Jest backend assertions passing (parsing, parent lookup, tree context,
  children, leaf/root nodes)

**Phase 6 — Cleanup:**

- Deleted 9 dead files: `RelatedOpeningsTeaser.tsx`, `RelatedOpeningsModal.tsx`,
  `RelatedOpeningsTab.tsx`, `VariationItem.tsx`, `OpeningFamily.tsx`,
  `useRelatedOpenings.ts`, and 3 related test files
- Removed `OpeningFamily` export from barrel
- Removed `.relatedTeaserDesktop`/`.relatedTeaserMobile` CSS classes
- TypeScript compiles clean, build succeeds, 132/158 tests pass (26 failures are
  pre-existing: practice-mode, LineTypePill, App routing)

**Files Created:**

| File                                                                 | Purpose                      |
| -------------------------------------------------------------------- | ---------------------------- |
| `packages/api/src/services/tree-service.js`                          | Tree index + context service |
| `packages/web/src/hooks/useOpeningTree.ts`                           | Data hook + TypeScript types |
| `packages/web/src/components/detail/OpeningTree.tsx`                 | Tree component               |
| `packages/web/src/components/detail/OpeningTree.module.css`          | Tree styles                  |
| `tests/unit/tree-service.test.js`                                    | Backend tests                |
| `packages/web/src/components/detail/__tests__/opening-tree.test.tsx` | Frontend tests               |

**Files Modified:**

| File                                                  | Change                                      |
| ----------------------------------------------------- | ------------------------------------------- |
| `packages/api/src/routes/openings.routes.js`          | Added 2 tree routes                         |
| `packages/web/src/pages/OpeningDetailPage.tsx`        | Swapped RelatedOpeningsTeaser → OpeningTree |
| `packages/web/src/pages/OpeningDetailPage.module.css` | Removed dead CSS classes                    |
| `packages/web/src/components/detail/index.ts`         | Updated exports                             |

**Files Deleted:**

| File                                                           | Reason                          |
| -------------------------------------------------------------- | ------------------------------- |
| `packages/web/src/components/detail/RelatedOpeningsTeaser.tsx` | Replaced by OpeningTree         |
| `packages/web/src/components/detail/RelatedOpeningsModal.tsx`  | Dead code (no consumers)        |
| `packages/web/src/components/detail/RelatedOpeningsTab.tsx`    | Dead code (no consumers)        |
| `packages/web/src/components/detail/VariationItem.tsx`         | Only used by deleted components |
| `packages/web/src/components/detail/OpeningFamily.tsx`         | No-op stub, no consumers        |
| `packages/web/src/useRelatedOpenings.ts`                       | Replaced by useOpeningTree      |
| 3 related test files                                           | Tests for deleted components    |

---

## Current Focus: Documentation Upgrade (User Journeys) — Completed

**Task:** Create a source of truth for all main user journeys and functionality.

**Completed Steps:**
- Created [.github/memory-bank/user-journeys.md](.github/memory-bank/user-journeys.md) with detailed breakdowns of the Landing Page, Opening Detail Page, and Analyse Page.
- Updated [README.md](README.md) with a new Project Context section referencing the memory bank.
- Updated [CLAUDE.md](CLAUDE.md) to include `user-journeys.md` as a critical file to read at the start of a session.

---

## Previous: Video Pipeline Overindexing Fix — Completed

**Problem:** Spot-checking after TASK012 full pipeline run revealed the matcher
was too generous — videos appeared on wrong openings. Three root causes:

1. **Path mismatch** — `StaticFileGenerator` received a string instead of
   options object, writing to `tools/public/api/openings/` instead of
   `public/api/openings/` where consolidation reads.
2. **Toxic short aliases** — `parseAliases()` split on `,`/`;`/`/`, creating
   single-word fragments like `"Accepted"` that matched far too many videos.
3. **Content-only false positives** — Videos whose descriptions mentioned many
   openings got matched via content (e.g., Wade Gambit video matched Latvian
   Gambit via description mention + educator bonus).

**Fixes applied:**

- **Fix 1:** `regenerateStaticFiles()` now passes `{ databasePath, outputDir }`
  object to `StaticFileGenerator`
- **Fix 2:** Alias splitting requires 2+ words per fragment
- **Fix 3:** New `titleMentionsDifferentOpening()` rejects content-only matches
  where title names a different gambit/defense/attack
- **Fix 4:** Raised `minMatchScore` default from 40 to 60
- **Fix 5:** Sub-variation penalty (-15) when variation-specific words absent
  from title
- **Backfill:** Created `scripts/backfill-views.js` to restore view counts and
  thumbnails from YouTube API after rematch (which loses this metadata)

**Also discovered:** Two copies of `video-index.json` exist — pipeline writes to
`api/data/` but API reads from `packages/api/src/data/`. Must copy after
regeneration.

**Tests:** 633 passing (7 new matcher tests), all existing tests green.

---

## Previous: Video Pipeline Overhaul (TASK012) — Completed

## Session Summary (2026-03-15, Part 1)

### TASK012: Video Pipeline Overhaul

**Problem:** Two separate video pipeline implementations (RSS-based in
`tools/video-pipeline/` and channel-first in `packages/api/src/services/`) with
divergent logic, scorer bugs (agadmator wrongly penalised, `vs` pattern too
broad), missing channels, and no way to do a full historical rebuild or
zero-cost re-scoring.

**Solution:** Unified into a single pipeline with three modes.

**Phase 1 — Scorer Fixes:**

- Removed `'vs'` from gameAnalysisTerms; added targeted player-vs-player regex
  (only penalizes `"Magnus vs Hikaru"`, not `"Sicilian vs French"`)
- Removed hard-coded agadmator -50 penalty
- Moved agadmator from entertainmentChannels to goodEducators (+100 net swing)
- Removed chess24 from premiumEducators (stays in entertainmentChannels)
- Added chessbrah, ben finegold to goodEducators
- Removed duplicate chess.com from goodEducators

**Phase 2 — Config + Filter + Parallel RSS:**

- Added 5 channels to config: John Bartholomew, ChessExplained, PowerPlayChess
  (Daniel King), Remote Chess Academy, TheChessWebsite
- Removed `rapid` from candidate-filter exclusions
- Added highlights exclusion pattern
- Parallelized RSS fetching with Promise.allSettled

**Phase 3 — New Modes:**

- Created `channel-discovery.js` (YouTube API full-catalogue with UC→UU
  conversion, pagination, rate limiting)
- Refactored `index.js` into mode-based dispatch: incremental/full/rematch
- Added npm scripts: `pipeline`, `pipeline:full`, `pipeline:rematch`
- Duration guard for integer seconds (supports rematch mode)

**Phase 4 — Cleanup:**

- Deleted `channel-first-video-pipeline.js`, `channel-first-indexer.js`, and
  orphaned test
- Removed `videos:channel-first` script
- Updated all documentation (CLAUDE.md, README files, agent workflows, memory
  bank, project overview)

**Tests:** 626 passing, 10 new test cases for scorer, 7 for channel-discovery, 4
for pipeline-modes.

---

## Session Summary (2026-03-14)

### Fix: Optimize Search Bandwidth & Vercel Data Limits (TASK011)

**Problem:** Vercel Fast Origin Transfer hit 20.39 GB (10 GB limit). Root cause:
`GlobalHeader.tsx` and `OpeningDetailPage.tsx` fetched `/api/openings/all` (24.8
MB) on every mount. Crawler traffic (~3,900 pages) amplified this to ~96.8 GB.
No API routes had `Cache-Control` headers.

**Solution:** Two-phase fix shipped in one commit.

**Phase 1 — Edge Caching:**

- Added `Cache-Control` headers to all API routes in `vercel.json`
- Static data: `s-maxage=3600, stale-while-revalidate=86400`
- Search endpoints: `s-maxage=300, stale-while-revalidate=600`

**Phase 2 — Eliminate large preloads:**

- GlobalHeader: replaced 24.8 MB preload with 300ms debounced server-side
  `/api/openings/semantic-search` (zero bytes on load, ~5 KB per query)
- OpeningDetailPage: switched from `/all` to `/search-index` (1.6 MB, 94%
  reduction)
- SearchBar: fixed `handleGo` to use current suggestions when `openingsData` is
  empty
- Updated 4 test files to mock `/search-index` instead of `/all`

**Files Changed:**

| File                                                  | Change                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| `vercel.json`                                         | Cache-Control headers for all API routes |
| `packages/web/src/components/layout/GlobalHeader.tsx` | Debounced server-side search             |
| `packages/web/src/pages/OpeningDetailPage.tsx`        | `/all` → `/search-index`                 |
| `packages/web/src/components/shared/SearchBar.tsx`    | `handleGo` resilience for empty data     |
| 4 test files                                          | Mock URL updates                         |

**Validation:** 147/147 frontend tests, all backend suites pass, TypeScript
clean.

---

## Session Summary (2026-03-13)

### Feat: Local Repertoire via Browser Storage (TASK010)

**Feature:** Users can "star" openings from the detail page and access them in a
"My Repertoire" section on the landing page, using localStorage for account-less
persistence.

**Implementation:**

1. **`useRepertoire` hook** (`packages/web/src/hooks/useRepertoire.ts`):
   localStorage-backed repertoire with `toggle`, `remove`, `isSaved` (O(1) via
   Set), `count`. Shared external-store sync for same-tab consumers plus
   cross-tab sync via `storage` event. Stores lightweight `RepertoireEntry`
   objects (~200 bytes each).

2. **`StarButton` component**
   (`packages/web/src/components/shared/StarButton.tsx`): Presentational star
   with inline SVG, filled/outline states, CSS scale-pulse animation on toggle,
   `stopPropagation` for use inside clickable cards.

3. **Detail page star**: Inline with h1 title using `align-items: baseline` for
   optical alignment with large display text.

4. **"My Repertoire" section**
   (`packages/web/src/components/landing/RepertoireSection.tsx`): Compact custom
   cards (not full OpeningCard) showing ECO + complexity badge, 2-line clamped
   name, monospace moves. Responsive sizing
   (`flex: 1 0 200px; max-width: 300px`) fills available width, horizontal
   scroll when needed. Empty state with star icon and hint text.

5. **OpeningCard star support**: Optional `showStar`/`isStarred`/`onStarClick`
   props for future use in search results or other card contexts.

### Fix: Repertoire Hook Sync + Storage Safety Follow-up

**Problem:** The initial `useRepertoire` implementation only synchronized via
the browser `storage` event, so multiple hook consumers in the same tab could
drift out of sync. It also let `localStorage.setItem()` exceptions bubble out of
the update path.

**Fix:** Refactored the hook to a shared external-store pattern backed by
`useSyncExternalStore`, with module-level subscribers for same-tab updates and a
safe write path that preserves prior state when persistence fails.

**Validation:** Targeted hook regression suite passes (`12/12`).

**Branch:** `feature/local-repertoire` **Validation:** 147/147 frontend tests
(12 hook tests), TypeScript clean, Prettier formatted.

---

## Session Summary (2026-03-12)

### Feat: Sort Controls for Personal Opening Stats

**Feature:** Users can sort their opening breakdown by "Most played", "Best
first", or "Worst first" in the Analyse Games page.

**Implementation:**

1. **Sort logic** (`sortAgg`): Extended with a `SortMode` type
   (`'frequency' | 'best' | 'worst'`). "Best first" sorts by win rate
   descending, "Worst first" by win rate ascending, "Most played" (default) by
   game count.

2. **Segmented pill control:** Three-button pill group rendered as a standalone
   element between the insights summary card and the opening lists. Wrapped in a
   `.personal-sort-bar__pills` container with subtle background/border for
   visual grouping. Active pill uses green accent (`rgba(16,185,129)`).

3. **Placement fix:** Sort controls were originally buried inside the insights
   card (wrong hierarchy). Moved to a standalone centered row between insights
   and the "As White" / "As Black" columns, so the control is visually
   associated with the content it affects.

4. **UX copy improvements:** Friendlier microcopy throughout — "Loaded your
   saved results", "Analysing your games...", "Analysis complete",
   "Top-performing opening", better error messages.

**Files Changed:**

| File                                                            | Change                                            |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `packages/web/src/components/personal/PersonalOpeningStats.tsx` | Sort state, `SortMode` type, pill UI, copy tweaks |
| `packages/web/src/styles/simplified.css`                        | Sort bar + pill styles                            |

**Validation:** TypeScript build passes (`tsc --noEmit` clean).

## Session Summary (2026-02-28)

### SEO: Get Opening Pages Indexed by Google (TASK009 — Done)

**Problem:** All 12,377+ opening pages served identical HTML (`<title>`,
`<meta description>`, empty `<div id="root">`). Google treated them as
duplicates and only indexed the home page.

**Solution:** Vercel Edge Middleware + React 19 native document metadata.

**Implementation:**

1. **Build-time SEO lookup generator** (`scripts/generate-seo-lookup.js`): Reads
   all 5 ECO files, outputs compact 1.7MB `seo-lookup.json` keyed by raw FEN
   with `[name, eco, shortMoves]` arrays. Hooked into `build:vercel`.

2. **Vercel Edge Middleware** (`middleware.ts`): Intercepts `/opening/*` and
   `/analyse` routes, fetches `seo-lookup.json` (cached), injects unique
   `<title>`, `<meta description>`, canonical URL, Open Graph, and Twitter Card
   tags into the HTML before it reaches the browser/crawler.

3. **React 19 native metadata** (no library needed — `react-helmet-async`
   doesn't support React 19): Added `<title>`, `<meta>`, `<link>`, OG/Twitter
   tags, and JSON-LD structured data directly in page components. React 19
   automatically hoists these to `<head>`.

4. **Improved `index.html` baseline**: Better default description, added
   `og:site_name`, `og:type`, `twitter:card` base tags.

**Files Changed:**

| File                                           | Change                                   |
| ---------------------------------------------- | ---------------------------------------- |
| `scripts/generate-seo-lookup.js`               | New: SEO lookup generator                |
| `middleware.ts`                                | New: Vercel Edge Middleware              |
| `package.json`                                 | Added generate step to `build:vercel`    |
| `packages/web/index.html`                      | Improved meta tags baseline              |
| `packages/web/src/pages/OpeningDetailPage.tsx` | React 19 metadata + JSON-LD              |
| `packages/web/src/pages/LandingPage.tsx`       | React 19 metadata                        |
| `packages/web/src/pages/AnalyseGamesPage.tsx`  | React 19 metadata                        |
| `.gitignore`                                   | Added `seo-lookup.json` (build artifact) |

**Validation:** TypeScript build passes, 135/135 frontend tests pass.

## Session Summary (2026-02-23)

### Fix: Mobile Horizontal Overflow on Opening Detail (TASK007 — Resolved)

**Problem:** On mobile, certain opening detail pages overflowed horizontally.
The bug was content-dependent — openings with many related variations (e.g., QGD
with 5+ siblings) always broke, while simpler openings never did.

**Root Cause:** CSS Grid `1fr` resolves to `minmax(auto, 1fr)`. When
`RelatedOpeningsTeaser` was moved from inside `.right-column` (had
`min-width: 0`) to a direct child of `.two-column-layout`, the teaser's
intrinsic width could expand the grid track beyond the viewport. Multiple
`overflow: hidden` guards were ineffective because the containers **grew to
fit** rather than overflowing.

**Fix (3 CSS changes in `simplified.css`):**

1. Changed `1fr` → `minmax(0, 1fr)` at all grid breakpoints
2. Added `.two-column-layout > * { min-width: 0; }` wildcard rule
3. Removed ineffective `overflow-x: hidden` from `#root` and `.detail-page-body`

**Regression Test:** Playwright e2e test (`mobile-overflow.spec.ts`) at 375px
viewport with 6 related siblings, asserting no horizontal overflow.

**Validation:** TypeScript check, Vite build, 135/135 frontend tests,
user-confirmed on real mobile device.

**Files Changed:**

| File                                     | Change                                  |
| ---------------------------------------- | --------------------------------------- |
| `packages/web/src/styles/simplified.css` | Grid track fix + wildcard min-width     |
| `tests/e2e/mobile-overflow.spec.ts`      | New regression test                     |
| `tests/e2e/utils/mockApi.ts`             | Configurable related siblings for mocks |

### Update: Coverage Reporting Enabled

**Problem:** Frontend coverage reports were missing; backend coverage reports
were generated but not consistently documented.

**Solution:** Enabled Vitest coverage reporting in the web workspace and
documented coverage commands and report locations.

**Implementation:**

- Added Vitest coverage config for HTML and JSON summary output
- Installed `@vitest/coverage-v8` in `packages/web`
- Generated backend and frontend coverage reports
- Added coverage instructions to README
- Created `TASK006` to drive coverage improvements

**Files Changed:**

| File                                                    | Change                                   |
| ------------------------------------------------------- | ---------------------------------------- |
| `packages/web/package.json`                             | Add Vitest coverage config + dependency  |
| `packages/web/vite.config.ts`                           | Add Vitest coverage config               |
| `README.md`                                             | Add coverage commands + report locations |
| `.github/memory-bank/tasks/TASK006-coverage-updates.md` | New task                                 |
| `.github/memory-bank/tasks/_index.md`                   | Index task                               |

### Fix: PersonalOpeningStats State Persistence

**Problem:** Navigating from `/analyse` to an opening page (`/opening/:fen`) and
back required re-entering username and re-running analysis, because all state
lived in local `useState` and was destroyed on unmount.

**Solution:** Persist the four form inputs (`username`, `platform`, `limit`,
`activeTab`) to `sessionStorage` and auto-restore dashboard results on mount.

**Implementation:**

- Added `FORM_STATE_KEY` constant and `readSavedFormState()` helper
- Lazy-initialised all four `useState` calls from `sessionStorage` so `cacheKey`
  is correct on the very first render
- `useEffect` saves form state to `sessionStorage` on every change
- Mount-only `useEffect` reads saved state, checks the matching dashboard cache,
  and restores results without user interaction
- `prefillUsername` prop still takes priority over saved state for username

**Files Changed:**

| File                                                            | Change                               |
| --------------------------------------------------------------- | ------------------------------------ |
| `packages/web/src/components/personal/PersonalOpeningStats.tsx` | State persistence via sessionStorage |

## Previous Focus: TASK004 - Course Discovery Pipeline Complete

The course discovery pipeline has been fully rebuilt with a clean two-step
architecture on branch `feat/studies-tab`. All data is imported and the pipeline
is consolidated.

## Session Summary (2026-02-18)

### Course Discovery Pipeline: Full Rebuild & Import

**Architecture:** Two-step pipeline replacing the old author-based approach:

1. **Discover** (`discover-popular.js`): Search Lichess for popular studies
   (500+ likes), classify as opening-related, output new URLs
2. **Import** (`add-studies.js`): Read `curated-studies.txt`, fetch
   metadata+PGN, match chapters to ECO openings by FEN, write `courses.json`

**Data Results:**

| Metric          | Value                             |
| --------------- | --------------------------------- |
| Curated studies | 630 URLs in curated-studies.txt   |
| Studies fetched | 440 (97 failed: 58 404s, 39 403s) |
| FEN positions   | 2,255 unique                      |
| Course entries  | 6,142 total                       |
| All curated     | Yes (no auto_discovered entries)  |
| All have likes  | Yes                               |

**Discovery Phase:**

- Searched 46 opening terms on Lichess study search
- Found 441 unique studies with 500+ likes
- 431 classified as opening-related (10 correctly excluded: endgames, puzzles)
- 294 new studies not already in curated list
- Appended to curated-studies.txt and imported

**Cleanup & Consolidation:**

- Removed deprecated files: `index.js` (author pipeline), `quality-filter.js`,
  `authors.json`, `quality-filter.test.js`
- Updated integration tests (removed quality-filter tests)
- Updated `course-merger.js` JSDoc
- Rewrote `tools/course-discovery/README.md` for new architecture
- Updated npm scripts (`course:discover` → `discover-popular.js`)
- Added state file patterns to `.gitignore`
- Deleted stale `api/data/courses.json` (was 692 bytes, unused)
- All 35 test suites (491 tests) passing

### Files Changed

| File                                                   | Change                           |
| ------------------------------------------------------ | -------------------------------- |
| `tools/course-discovery/add-studies.js`                | Main importer (created earlier)  |
| `tools/course-discovery/discover-popular.js`           | Discovery tool (created earlier) |
| `tools/course-discovery/lib/lichess-fetcher.js`        | Updated metadata endpoint        |
| `tools/course-discovery/lib/course-merger.js`          | Updated JSDoc                    |
| `tools/course-discovery/README.md`                     | Complete rewrite                 |
| `tools/course-discovery/config/curated-studies.txt`    | 630 study URLs                   |
| `tools/course-discovery/config/discovered-studies.txt` | 294 discovered URLs              |
| `packages/api/src/data/courses.json`                   | 6,142 entries across 2,255 FENs  |
| `package.json`                                         | Updated npm scripts              |
| `tests/integration/course-pipeline.test.js`            | Removed quality-filter tests     |
| `.gitignore`                                           | Added state file patterns        |
| `api/data/courses.json`                                | Deleted (stale)                  |
| `tools/course-discovery/index.js`                      | Deleted (deprecated)             |
| `tools/course-discovery/lib/quality-filter.js`         | Deleted (deprecated)             |
| `tools/course-discovery/config/authors.json`           | Deleted (deprecated)             |
| `tests/unit/quality-filter.test.js`                    | Deleted (deprecated)             |

## Session Summary (2026-02-10)

### TASK004 Planning Complete

- **Constraints identified:** Lichess study search has no API (scraping ruled
  out), Chessable scraping violates ToS, LLM curation too expensive/error-prone.
- **Approach:** Known-author pipeline using `GET /api/study/by/{username}` + PGN
  parsing + FEN matching against ECO database.
- **Pipeline files:** `tools/course-discovery/` with orchestrator,
  lichess-fetcher, pgn-matcher, course-merger, and authors config.
- **Search links:** Runtime generation of Lichess + Chessable search URLs added
  to course-service and routes.
- **Patterns reused:** StateManager, Logger, yargs from existing pipelines.
- **Frontend deferred:** CourseGallery component planned but not part of this
  implementation phase.

### Earlier: Roadmap Planning

- **Action:** Created `TASK004` and `TASK005` to document the new roadmap.
- **Stockfish Analysis:** Plan for a hybrid Lichess Cloud Eval + Stockfish WASM
  analysis system.
- **Mistake Trainer:** New feature to analyze personal games for opening
  blunders.

## Session Summary (2026-02-09)

### Update: Related Openings Placement

**Problem:** When the layout collapsed to one column, the related openings
teaser was still positioned under the board, leaving a large gap.

**Solution:** Render a desktop-only teaser beneath the board and a
mobile/tablet-only teaser at the bottom, switching visibility at the stacked
breakpoint.

**Implementation:**

- Rendered the teaser inside the left column for desktop and a second instance
  after the right column for stacked layouts
- Added CSS module visibility toggles to swap at the 1024px breakpoint

**Files Changed:** | File | Change | | --- | --- | |
`packages/web/src/pages/OpeningDetailPage.tsx` | Desktop + stacked layout
placements | | `packages/web/src/pages/OpeningDetailPage.module.css` |
Responsive visibility rules |

## Session Summary (2026-02-01)

### Rollback: Increase Max Games Feature

- **Action:** Rolled back `main` branch to remove the "increase max games"
  feature (commit `4c6070bd0`).
- **Rationale:** User requested to revert to the previous version and remove
  this specific feature.
- **Scope:**
  - Reset `packages/api` services and routes to clamp games at 200.
  - Reset `packages/web` UI components (PersonalOpeningStats) to max 200.
  - Force pushed the rollback to `origin/main`.

### Enhancement: Lichess-Style Visual Indicators

**Previous:** Blue highlights for selection, no previous move indicator.

**New (matching Lichess/Chess.com):**

- **Previous move highlight:** Yellow-green `rgba(186, 202, 68, 0.4)` on both
  from/to squares
- **Selected square:** Bright yellow `rgba(255, 255, 0, 0.5)`
- **Legal moves (empty squares):** Small dark dot via radial gradient (22%
  radius)
- **Legal moves (capture squares):** Hollow ring via radial gradient (65% outer
  ring)

### Files Changed

| File                                           | Change                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/web/package.json`                    | react-chessboard ^5.1.0 → ^5.8.6                                                                             |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Added lastMoveSquares state, updated visual effects, lowered dragActivationDistance to 5, removed @ts-ignore |

### Technical Details

**New State:**

```typescript
const [lastMoveSquares, setLastMoveSquares] = useState<{
  from: string;
  to: string;
} | null>(null);
```

**Updated Effects:**

- `handleCorrectMove`: Sets lastMoveSquares after user move AND opponent
  auto-move
- `startPractice`: Sets lastMoveSquares when auto-playing white's first move
  (black player)
- `exitPractice`: Clears lastMoveSquares

**Chessboard Options:**

- `dragActivationDistance: 5` (lowered from 15 - library now handles tap vs drag
  properly)

### Test Results

- Frontend (Vitest): 15 practice-mode tests passing
- TypeScript: compiles cleanly (no errors after removing @ts-ignore)

## Previous Work (2026-01-30)

### Practice Mode: Click-to-Move Support

- Both click-to-move AND drag-and-drop work simultaneously
- Uses react-chessboard's built-in onSquareClick handler
- Legal moves calculated via chess.js

### Personal Opening Explorer - Complete

- Chess.com API integration
- Actionable Insights UI (win rate by color, best/worst openings)

## Architecture Decisions

### AD-015: Previous Move Highlighting

Show last move persistently (yellow-green) to help users track game flow in
practice mode.

- Separate from selection highlighting (bright yellow)
- Cleared on exit/restart, updated after each move pair

## Current Status

Related openings placement aligned for desktop and stacked layouts; ready for
verification.

### Update: Test Suite Stabilization

**Problem:** Jest failures from outdated video pipeline/database test imports
and coverage config.

**Solution:** Repointed tests to current module paths, retired obsolete pipeline
tests, and aligned Jest coverage to the active database path.
