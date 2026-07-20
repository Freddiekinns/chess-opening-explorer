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
- **Per-variation games count on mobile analyse.** Expanded `FamilyRow`
  variations hid their games count at ≤768px (`.variationGames` display:none);
  added a mobile-only `.variationMeta` line ("N games", singularised) mirroring
  the family header's meta line.

**Files:** `OpeningNavigator.tsx`+css, `mobile/MobileDataSurface.tsx`+css,
`personal/FamilyRow.tsx`+css, three test files (+4 tests). Design-system
lockstep: preview cards `components-opening-detail-mobile` + `-right-column`
gained the captions. No token changes. **Verified:** 325 frontend tests green.

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
