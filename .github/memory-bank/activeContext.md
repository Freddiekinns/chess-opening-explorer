# Active Context

**Date:** 2026-07-20

## Current Task: Opening-detail & analyse UI tweaks (branch `claude/opening-details-ui-tweaks-9tddbh`)

UX fixes:

- **Popularity captions on both move lists.** Added a **"Most popular next
  moves"** sub-label under continuations to parallel "Most popular
  alternatives", on desktop `OpeningNavigator` (`.sectionSublabel`, new) +
  mobile `MobileDataSurface` (`.bookSubheading`). Mobile show-more threshold 5 →
  3 (`MobileDataSurface ROWS_COLLAPSED_LIMIT`; desktop unchanged).
- **Consistent mobile Analyse cards.** Family header + expanded variations read
  as the same card as the flat opening cards (name top-left, **"Games N"**
  top-right, bar + worded legend) via a shared **`PerfBar`** used by both
  `.mobileCard` and `FamilyRow`; `FamilyRow` mobile hides the desktop
  `DistributionBar`/GP number, desktop unchanged.
- **Move list + name styling aligned across both lists.** Threaded `moves`
  through `OpeningAggInput`/`FamilyVariationRow` so variations show a move list;
  aligned grouped→flat — variation names use the same `OpeningNameSplit`
  treatment (family stripped), and both render the **full** move line (was
  first-two-pairs, which hid the naming move). Deep lines still truncate on the
  narrow desktop 2-col (mobile shows full). Removed dead
  `getOpeningMovesDisplay`; a `direction:rtl` left-truncate was tried + reverted
  (mangled notation).
- **Mobile Analyse font-size sweep.** Unified card-name scale: family +
  variation names were 14px (variation 500 wt) vs the flat `.mobileCard`'s
  15px/600 → aligned both to 15px/600 on mobile. Also aligned the desktop
  variation "Games N" count 13px→14px (`--text-sm`→`--text-base`) to match
  family/flat. The `x% win` legend was already one shared `PerfBar` (12px, 11px
  ≤480) — the perceived difference was the surrounding name scale, now unified.

**Files:** `OpeningNavigator`, `mobile/MobileDataSurface`, `personal/PerfBar`
(new), `FamilyRow`, `OpeningRow`, `PersonalOpeningStats`,
`familyAggregation.ts` + `personalStatsLib.ts` + css/tests. Design-system
lockstep: opening-detail preview cards gained the captions. No token changes.
**Verified:** frontend tests green; Prettier clean; Playwright screenshots.

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
