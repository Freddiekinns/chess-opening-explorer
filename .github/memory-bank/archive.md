# Memory Bank Archive

Historical session summaries preserved for reference. This file is **never
loaded into context automatically** — read on demand only.

---

## Opening Family Rollups — Full Design History (branch `feature/opening-family-rollups`)

Feature: group a player's analysed openings by family on the Analyse page, with
per-family W/D/L and expandable per-variation breakdown. Shipped state lives in
`activeContext.md` / `progress.md`; this records the iteration path.

- **Phase 1 (2026-05-08):** 28-family taxonomy + ~140 override rules →
  build-time `family_id` enrichment on every ECO record (98.45% coverage).
  `GET /api/families` (routed via `pathResolver` for Vercel) serves family
  list + `opening_count`; `family_id` exposed on `/api/openings/search-index`
  (full mode, +10.36% raw, inside the 20% bandwidth gate; `s-maxage` bumped
  3600→86400). Initial Variation/Family toggle + `groupByFamily()` helper;
  client-side aggregation, `family_display_name` joined client-side.
- **Leader-dot redesign (2026-05-09):** Replaced Phase-1 UI with editorial
  leader-dot rows (dotted leader, display-weight result-coloured WR%,
  Best/Needs-work sub-meta), an `InlineLinkSwitch` primitive driving page-global
  VIEW + per-column ORDER switchers, `UncategorisedFootnote`, and a `useCountUp`
  WR% animation. Adopted the `design-system/` bundle as canonical brand
  reference. **Rejected on review** — unclear win/loss read, mismatched fonts,
  confusing expand percentages.
- **Distribution-bar redesign (2026-06-06):** Rebuilt `FamilyRow` around the
  shared `DistributionBar` (the liked W/D/L graph), used in both family and
  all-openings views. Dropped the WR% count-up + sub-meta.
- **Controls evolution (2026-06-06):** Restored production pills over the
  `InlineLinkSwitch` text links → then replaced the segmented family/all toggle
  with a single `Group by family` chip (clashed visually) → then, after
  measuring that 3 sort pills + chip wrap even at ~452px desktop columns,
  replaced visible sort pills with a compact `SortMenu` dropdown on both
  breakpoints. Final row: `[⊞ Group by family] [⇅ Sort ▾]`,
  group-left/sort-right, per-column state, family default. Deleted
  `AnalyseToolbar`, `SectionToolbar`, `InlineLinkSwitch`, `SortBar` and their
  CSS/tests along the way.

---

## TASK016: Design Overhaul — Chunks 1–5 (2026-03-21)

### Chunk 5: Search in TopBar on detail pages — DONE

- Route-aware `TopBarSearch` in `TopBar.tsx` with debounced server-side search
- "Surprise me!" button, "Discover" force-highlighted on detail pages
- Mobile search overlay, grid `1fr auto 1fr` centering
- Deleted `GlobalHeader.tsx`, `FloatingBackButton.tsx`, `ContentHeader.tsx`,
  `TopBarContext.tsx`; removed ~9KB dead CSS

### Chunk 3: Remove old navigation — DONE

- Removed `<LandingHeader />` from `LandingPage.tsx` and `AnalyseGamesPage.tsx`
- Deleted `LandingHeader.tsx` entirely (no remaining references)
- Removed all `.landing-header*` styles + responsive media query from
  `simplified.css`
- Reduced hero section `padding-top` from `100px` to `var(--space-8)` (desktop)
  and `var(--space-6)` (tablet/mobile)
- `GlobalHeader.tsx` kept for now (search logic useful for ContentHeader in
  chunk 5)

### Chunk 2: Responsive sidebar — collapse + bottom tabs — DONE

- `BottomTabBar.tsx` + `BottomTabBar.module.css` — fixed bottom nav (56px), two
  items (Discover, Analyse), hidden above 640px, orange active text
- Updated `App.tsx` — added `<BottomTabBar />` to layout
- Updated `simplified.css` — added `padding-bottom: 56px` on mobile

### Chunk 1: Layout shell — sidebar + content area grid — DONE

- `Sidebar.tsx` + `Sidebar.module.css` — persistent left sidebar with "Opening
  Book" wordmark, two nav items using `NavLink`, orange left-border indicator
- Updated `App.tsx` — `<Sidebar />` + `<main className="app-content">` wrapper
- Updated `simplified.css` — `.app` changed to CSS grid (`200px 1fr`),
  responsive breakpoints (64px at 900px, hidden at 640px)
- **Decision:** Dropped "OB" monogram — plain wordmark is cleaner.

---

## TASK015: Opening Tree Navigation (2026-03-18)

**Problem:** Related openings displayed as flat list grouped by ECO code. Users
couldn't see the tree structure — "what branches from here?" or "what could I
have played instead?" were unanswerable.

**Solution:** Vertical indented tree (file-explorer style) with collapsible
breadcrumb header, showing ancestor chain, current node (highlighted), siblings,
and children. Replaces `RelatedOpeningsTeaser` entirely.

**Backend:** `tree-service.js` with pre-built index (~99ms build, cached 1hr).
Two maps: `moveIndex` and `childrenMap`. Routes: `GET /fen/:fen/tree` and
`GET /fen/:fen/tree/children`. 20 backend test assertions.

**Frontend:** `OpeningTree.tsx` + `OpeningTree.module.css`. Collapsed breadcrumb
bar with clickable pills. Expanded: vertical indented tree (max-height 400px).
Current node: orange left border. Keyboard navigation (ARIA treeview). Lazy-load
children on expand. JS-driven height animation with `prefers-reduced-motion`. 15
Vitest tests.

**Integration:** Replaced `RelatedOpeningsTeaser` in `OpeningDetailPage.tsx`.
Inline fetch pattern matching existing page data loaders.

**Cleanup:** Deleted 9 dead files (RelatedOpeningsTeaser, RelatedOpeningsModal,
RelatedOpeningsTab, VariationItem, OpeningFamily, useRelatedOpenings, 3 tests).

**Files Created:**

- `packages/api/src/services/tree-service.js`
- `packages/web/src/hooks/useOpeningTree.ts`
- `packages/web/src/components/detail/OpeningTree.tsx` + `.module.css`
- `tests/unit/tree-service.test.js`
- `packages/web/src/components/detail/__tests__/opening-tree.test.tsx`

---

## Documentation Upgrade: User Journeys (2026-03-19)

Created `.github/memory-bank/user-journeys.md` with detailed breakdowns of
Landing Page, Opening Detail Page, and Analyse Page. Updated README.md and
CLAUDE.md to reference it.

---

## Video Pipeline Overindexing Fix (2026-03-16)

**Problem:** Matcher too generous — videos appeared on wrong openings.

**Root Causes:**

1. `StaticFileGenerator` received string instead of options object (wrong output
   path)
2. `parseAliases()` created single-word fragments that matched too broadly
3. Content-only false positives from description mentions

**Fixes:** Options object fix, 2+ word alias minimum,
`titleMentionsDifferentOpening()` rejects cross-opening matches, `minMatchScore`
raised from 40→60, sub-variation penalty (-15).

**Also discovered:** Two `video-index.json` copies — pipeline writes to
`api/data/`, API reads from `packages/api/src/data/`.

---

## TASK012: Video Pipeline Overhaul (2026-03-15)

**Problem:** Two separate pipeline implementations with divergent logic, scorer
bugs, missing channels, no full rebuild or zero-cost re-scoring mode.

**Solution:** Unified single pipeline with three modes: incremental (RSS), full
(YouTube API catalogue rebuild), rematch (re-score only, zero API cost).

**Scorer Fixes:** Removed broad `'vs'` penalty, added targeted player-vs-player
regex. agadmator promoted to goodEducator. chess24 demoted to entertainment.
Added chessbrah, ben finegold to goodEducators.

**Config:** Added 5 channels (John Bartholomew, ChessExplained, PowerPlayChess,
Remote Chess Academy, TheChessWebsite). Parallelized RSS fetching.

**New Modes:** `channel-discovery.js` for full catalogue, mode-based dispatch in
`index.js`. npm scripts: `pipeline`, `pipeline:full`, `pipeline:rematch`.

**Cleanup:** Deleted `channel-first-video-pipeline.js`,
`channel-first-indexer.js`. Tests: 626 passing (10 scorer, 7 channel-discovery,
4 pipeline-modes).

---

## TASK011: Optimize Search Bandwidth & Vercel Limits (2026-03-14)

**Problem:** Vercel Fast Origin Transfer hit 20.39 GB (10 GB limit).
`/api/openings/all` (24.8 MB) fetched on every mount × crawler traffic = 96.8
GB.

**Fix:** CDN cache headers on all API routes. GlobalHeader: server-side search
(zero preload). OpeningDetailPage: `/search-index` (1.6 MB, 94% reduction).
147/147 frontend tests, all backend suites pass.

---

## TASK010: Local Repertoire via Browser Storage (2026-03-13)

**Feature:** Star openings from detail page, access in "My Repertoire" on
landing page. localStorage-backed with `useSyncExternalStore`, same-tab +
cross-tab sync. StarButton with CSS pulse animation. RepertoireSection with
compact cards. Safe localStorage write handling. 12 hook tests. 147/147 tests.

---

## Sort Controls for Personal Opening Stats (2026-03-12)

Sort by "Most played", "Best first", "Worst first" in Analyse page. Segmented
pill control between insights card and opening lists. UX copy improvements.

---

## TASK009: SEO — Get Opening Pages Indexed by Google (2026-02-28)

**Problem:** All 12,377+ pages served identical HTML. Google indexed only home
page.

**Solution:** Build-time SEO lookup generator → `seo-lookup.json` (1.7MB).
Vercel Edge Middleware injects unique `<title>`, `<meta>`, OG, Twitter Card
tags. React 19 native metadata + JSON-LD structured data in page components.
135/135 frontend tests pass.

---

## TASK007: Mobile Horizontal Overflow (2026-02-23)

**Root Cause:** CSS Grid `1fr` resolves to `minmax(auto, 1fr)`. When
`RelatedOpeningsTeaser` moved to direct grid child without `min-width: 0`,
intrinsic width expanded the track beyond viewport.

**Fix:** `minmax(0, 1fr)` at all breakpoints +
`.two-column-layout > * { min-width: 0; }`. Removed ineffective
`overflow-x: hidden`. Playwright regression test added.

---

## TASK004: Course Discovery Pipeline (2026-02-18)

Two-step pipeline: `discover-popular.js` (search Lichess, 500+ likes) →
`add-studies.js` (fetch PGN, match FENs to ECO). 630 curated studies, 6,142
entries across 2,255 FENs. Removed deprecated author-based pipeline. 491 tests
across 35 suites.

---

## Earlier Work (2026-01-30 – 2026-02-10)

- **Practice Mode:** Click-to-move + drag-and-drop, Lichess-style visual
  indicators (previous move highlight, legal move dots, capture rings).
- **Personal Opening Explorer:** Chess.com + Lichess integration, actionable
  insights dashboard, sort controls, session cache persistence.
- **PGN Opening Identification:** Modal on landing page, chess.js parsing,
  deepest match finding.
- **Related Openings UI:** Inline expandable teaser, JS height animation,
  unified card header pattern, ECO pill metadata.
- **State persistence:** Form inputs + dashboard results cached in
  sessionStorage.
- **AD-015:** Previous move highlighting (yellow-green) separate from selection
  (bright yellow).
