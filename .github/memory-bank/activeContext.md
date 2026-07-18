# Active Context

**Date:** 2026-07-18

## Current Task: Opening detail mobile overhaul (branch `claude/mobile-ui-opening-details-ph33t8`)

Implemented Claude Design handoff **"Opening Details Mobile 2a — one data
surface"** for the opening detail page at ≤767px. Desktop is untouched: a
`useIsMobile()` matchMedia hook (`hooks/useMediaQuery.ts`, safe desktop default
in jsdom/SSR) branches `OpeningDetailPage` into a mobile layout.

**Mobile layout (top → bottom):**

- Compact left-aligned header (family cream / variation orange, 20px), swipeable
  tag row, star with a "Saved to repertoire" toast.
- Board card with one control row: `‹‹ ‹ ›` nav, inline scrollable move strip,
  Practice button, and a `…` button opening **PositionSheet** (bottom sheet:
  FEN + Copy + Analyse on Lichess — replaces the inline FEN block).
- Overview with 3-line clamp + Read more.
- **MobileDataSurface** — merges WinRatePanel + OpeningNavigator into one card:
  W/D/L gradient strip, sticky scrollable LevelLens pills (`scrollable` prop;
  card uses `overflow: clip` so sticky works), level stats with loading dim +
  snapshot fallback (via new `useExplorerQuery` exposing loading/failed),
  collapsible one-line breadcrumb, Continuations + "Instead of X" stacked
  two-line rows (shared move-list rules extracted to `lib/openingBook.ts`).
- **MobileMasterGames** collapsed accordion (lazy masters fetch, shared cache).
- CommonPlans new `mobileGroups` layout (White/Black/Both accent cards, 3
  shown + toggle).
- **MobileResources** accordion (Videos/Studies rows with match-specificity
  subtitles → existing galleries) + swipeable external search pills.

**Files:** `components/detail/mobile/` (4 components + css + tests),
`useMediaQuery.ts`, `useExplorerResult.ts` (adds `useExplorerQuery`),
`lib/openingBook.ts`, `LevelLens` scrollable variant, `CommonPlans`
mobileGroups, page + module css. Design-system lockstep: preview card
`components-opening-detail-mobile.html`, mock in
`project/explorations/opening-details-mobile-2a.dc.html`. No token changes.

**Verified:** 312 frontend tests green (24 new); ESLint/tsc/Prettier clean;
Playwright at 390/320px (zero horizontal overflow, sticky pills, sheet, toast,
breadcrumb, practice mode) and 1280px (desktop unchanged).

## Previous Task: Mobile landing filter UI fix (merged, PR #52)

Category filter collapses into a `CategoryFilter` dropdown at ≤767px; level
stays a swipeable pill row with a right-edge fade. Desktop unchanged.
