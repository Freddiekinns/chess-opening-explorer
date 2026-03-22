# Active Context

**Date:** 2026-03-22

## Current Task: TASK016 Design Overhaul - Opening Book Navigator Redesign

**Status:** In progress. Build clean.

**Done so far (this session):**

- Redesigned OpeningNavigator with breadcrumb hierarchy (opening names instead
  of move notation), "Opening book" title, popularity bars, and contextual
  "Alternatives (move N)" labelling
- Polished OpeningNavigator rows: sentence case labels, popularity-sorted
  continuations/alternatives, and shorter bars so more of each opening name is
  visible
- Added `gamesPlayed` to tree-service API (from popularity_stats data)
- Frontend uses games played for bars/counts, falls back to descendantCount
- Removed unused `currentMoveIndex`/`onMoveClick` props (breadcrumb uses Links)
- Removed "Active line" section — breadcrumb shows current position instead
- Decided against win rate bars (misleading for learners) — games played is the
  clearer signal of popularity and line trustworthiness

**Previous work (same branch):**

- OpeningNavigator component, WinRateBar, board column widened
- Plans below board, description below navigator
- Studies + Videos full-width, tabs removed, learning resources polish
- Top bar navigation (chunks 1–5)

**Remaining:**

- Visual polish pass on navigator and overall page
- Mobile responsive refinements
- Fix broken tests (deferred to end per user instruction)

## Previous Task: TASK016 Chunks 1-5 (2026-03-21) - DONE

Top bar navigation replacing sidebar. Deleted GlobalHeader, FloatingBackButton,
ContentHeader, TopBarContext, LandingHeader. ~9KB dead CSS removed.
