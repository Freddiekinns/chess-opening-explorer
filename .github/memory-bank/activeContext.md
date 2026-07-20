# Active Context

**Date:** 2026-07-20

## Current Task: Opening-detail & analyse UI tweaks (branch `claude/opening-details-ui-tweaks-9tddbh`)

**Follow-up (post-#54-merge):** move lists weren't showing under opening names
on phones — `.mobileCardMoves` (since May) and `.variationMoves` (added by #54)
were both `display:none` at ≤480px, so real phones saw name+bar only while the
highlight cards still showed moves. Removed both hides (moves stay on their own
row, ellipsis-truncated). Also stepped family/variation names down to 14px at
≤480 to match `.mobileCardName`, completing the font-scale unification on small
screens. Branch restarted from `main` (PR #54 already merged) → new PR.

**Shipped in #54 (merged):** "Most popular next moves" caption under
continuations (desktop + mobile); mobile show-more 5→3; unified mobile Analyse
cards (family header + variations match the flat card via a shared `PerfBar`);
move-list + name styling aligned across grouped/flat lists (full move line, not
first-two-pairs); mobile font-size sweep (names 15px/600, desktop variation
"Games N" 13→14px). Files: `OpeningNavigator`, `MobileDataSurface`, `PerfBar`
(new), `FamilyRow`, `OpeningRow`, `PersonalOpeningStats`,
`familyAggregation.ts`, `personalStatsLib.ts` + css/tests. **Verified:**
frontend tests green; Prettier clean; Playwright screenshots (both mobile
views).

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
