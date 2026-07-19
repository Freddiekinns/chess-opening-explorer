# Active Context

**Date:** 2026-07-18

## Current Task: Opening detail mobile overhaul (PR #53, branch `claude/mobile-ui-opening-details-ph33t8`)

Implemented Claude Design handoff **"Opening Details Mobile 2a — one data
surface"** at ≤767px. A `useIsMobile()` matchMedia hook (safe desktop default in
jsdom/SSR) branches `OpeningDetailPage` into a mobile tree (AD-012 in
context.md); desktop keeps its two-column layout.

**Mobile layout (top → bottom):**

- Compact left-aligned header, swipeable tag row, star + "Saved to repertoire"
  toast; board card with a control row (`‹‹ ‹ ›`, Practice, `…` →
  **PositionSheet** bottom sheet with FEN/Copy/Analyse) above a full-width move
  row — a horizontal carousel (auto-scrolled to the current move) that expands
  to the whole line as a wrapped notation grid (`renderMoveNodes` shared by
  both).
- **Editorial reading zone**: Overview + Common plans share sentence-case
  section headings over un-carded left-rule prose (matched font/voice); Overview
  has a 4-line clamp + Read more. The data surface is the page's one card.
- **MobileDataSurface**: W/D/L gradient strip, sticky scrollable LevelLens pills
  (card uses `overflow: clip` so sticky works), level stats with loading dim +
  snapshot fallback (new `useExplorerQuery` exposes loading/failed), collapsible
  breadcrumb, Continuations + "Instead of X" stacked rows (shared rules
  extracted to `lib/openingBook.ts`).
- **MobileMasterGames** collapsed accordion; CommonPlans `mobileGroups` layout
  (un-carded left-rule sub-sections); **MobileResources** accordion + swipeable
  search pills.
- **SearchOverlay** replaces TopBar's bare mobile search: empty state = Recent
  (`lib/recentOpenings.ts`, recorded on detail views) + My repertoire (cap 5) +
  Surprise me; live results with Searching…/no-results states. Legacy unused
  `MobileSearchOverlay` + global CSS removed.

**Also in this PR:** desktop right column reordered Overview → stats → book
(lens sits directly above the data it governs); scroll fix — `ScrollToTop` on
route change + move strip scrolls its container horizontally only
(`scrollIntoView` was pulling the page down to the board on load).

**Files:** `components/detail/mobile/` (4 components), `SearchOverlay`,
`useMediaQuery`, `useExplorerQuery`, `openingBook.ts`, `recentOpenings.ts`,
LevelLens `scrollable`, CommonPlans `mobileGroups`, App `ScrollToTop`, page +
css. Design-system lockstep: preview cards `components-opening-detail-mobile`
(new) + right-column (reordered), 2a mock in `project/explorations/`. No token
changes. Docs: user-journeys (mobile experience + search overlay), context.md
AD-012.

**Verified:** 323 frontend tests (35 new); tsc/ESLint/Prettier clean; Playwright
at 390/320/1280px incl. search overlay states and scroll-to-top.

## Previous Task: Mobile landing filter UI fix (merged, PR #52)

Category filter collapses into a `CategoryFilter` dropdown at ≤767px; level
stays a swipeable pill row. Desktop unchanged.
