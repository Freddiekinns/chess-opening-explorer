# Active Context

**Date:** 2026-07-20

## Current Task: Opening-detail & analyse UI tweaks (branch `claude/opening-details-ui-tweaks-9tddbh`)

Three small UX fixes:

- **Popularity captions on both move lists.** The opening book's alternatives
  list already had a "Most popular alternatives" caption; continuations had
  none. Added a matching **"Most popular next moves"** sub-label under the
  continuations heading, on **both** surfaces — desktop `OpeningNavigator`
  (`.sectionSublabel`, new; both sections now captioned) and mobile
  `MobileDataSurface` (`.bookSubheading`).
- **Mobile show-more threshold 5 → 3.** `MobileDataSurface`
  `ROWS_COLLAPSED_LIMIT` now 3 so continuations/alternatives collapse sooner
  (desktop `OpeningNavigator` limits unchanged at 5).
- **Consistent mobile Analyse cards.** The family header + expanded variation
  rows now read as the same card as the individual (flat-view) opening cards:
  name top-left, **"Games N"** top-right, full-width bar, worded legend ("50%
  win · 0% draw · 50% loss"). Families keep the disclosure chevron + a "N lines"
  sub-line (no move list). Extracted the card bar + worded legend into a shared
  **`PerfBar`** component used by both the flat `.mobileCard` and `FamilyRow`,
  so they can't drift. `FamilyRow` mobile hides the desktop `DistributionBar`/GP
  number and shows `PerfBar` + a "Games N" label; desktop layout unchanged.
  (Supersedes the earlier `.variationMeta` "N games" line.)

**Files:** `OpeningNavigator.tsx`+css, `mobile/MobileDataSurface.tsx`+css,
`personal/PerfBar.tsx`+css (new), `personal/FamilyRow.tsx`+css,
`personal/PersonalOpeningStats.tsx`+css (mobileCard → PerfBar), four test files.
Design-system lockstep: opening-detail preview cards
`components-opening-detail-mobile` + `-right-column` gained the captions (the
Analyse surfaces have no preview cards). No token changes. **Verified:** 325
frontend tests green; tsc/ESLint/Prettier clean; Playwright screenshot of the
mobile Analyse dashboard (family + variations) at 390px.

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
