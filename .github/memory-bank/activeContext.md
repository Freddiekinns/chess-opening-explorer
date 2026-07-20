# Active Context

**Date:** 2026-07-20

## Current Task: Opening-detail & analyse UI tweaks (branch `claude/opening-details-ui-tweaks-9tddbh`)

UX fixes:

- **Popularity captions on both move lists.** Added a **"Most popular next
  moves"** sub-label under the continuations list to parallel the existing "Most
  popular alternatives", on **both** desktop `OpeningNavigator`
  (`.sectionSublabel`, new; both sections captioned) and mobile
  `MobileDataSurface` (`.bookSubheading`).
- **Mobile show-more threshold 5 → 3**
  (`MobileDataSurface ROWS_COLLAPSED_LIMIT`; desktop unchanged).
- **Consistent mobile Analyse cards.** Family header + expanded variations now
  read as the same card as the flat opening cards: name top-left, **"Games N"**
  top-right, full-width bar, worded legend. Extracted a shared **`PerfBar`**
  (bar + worded legend) used by both `.mobileCard` and `FamilyRow` so they can't
  drift; `FamilyRow` mobile hides the desktop `DistributionBar`/GP number,
  desktop unchanged.
- **Move list + name styling aligned across both lists.** Threaded `moves`
  through `OpeningAggInput`/`FamilyVariationRow` (dropped by `toAggInput`) so
  variations show a move list; aligned the grouped list to the flat rows —
  variation names use the same `OpeningNameSplit` treatment/size (family
  stripped, it's the header), and **both** lists render the **full** move line
  (was first-two-pairs, which hid the naming move) shown as space allows. Deep
  lines still truncate on the narrow desktop 2-col (width limit; mobile shows
  them full). Removed dead `getOpeningMovesDisplay`; a `direction:rtl`
  left-truncate was tried + reverted (mangled the notation).

**Files:** `OpeningNavigator`, `mobile/MobileDataSurface`, `personal/PerfBar`
(new), `FamilyRow`, `OpeningRow`, `PersonalOpeningStats`,
`familyAggregation.ts` + `personalStatsLib.ts` + css/tests. Design-system
lockstep: opening-detail preview cards gained the captions (Analyse surfaces
have no preview cards). No token changes. **Verified:** 326 frontend tests
green; tsc/ESLint/Prettier clean; Playwright screenshots (mobile + desktop).

## Previous Task: Opening detail mobile overhaul (PR #53, branch `claude/mobile-ui-opening-details-ph33t8`)

Claude Design "Opening Details Mobile 2a — one data surface" at ≤767px:
`useIsMobile()` matchMedia hook branches `OpeningDetailPage` into a mobile tree
(AD-012), desktop keeps its two columns. Mobile = compact header + save toast,
board control row with inline move strip + **PositionSheet** FEN sheet, clamped
editorial Overview/plans, one **MobileDataSurface** card (sticky level pills +
stats + breadcrumb + Continuations/alternatives), master-games/resources
accordions, and a full-screen **SearchOverlay** (recents + repertoire + surprise
me). Also: desktop right column reordered Overview → stats → book; scroll fix
(`ScrollToTop` + horizontal-only move-strip scroll). 323 frontend tests (35
new). **Full detail in `archive.md`.**
