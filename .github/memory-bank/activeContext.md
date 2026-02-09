# Active Context

**Date:** 2026-02-09

## Current Focus: Related Openings Placement

Keep the related openings teaser directly under the chessboard on desktop while moving it to the bottom once the layout stacks.

## Session Summary (2026-02-09)

### Update: Related Openings Placement

**Problem:** When the layout collapsed to one column, the related openings teaser was still positioned under the board, leaving a large gap.

**Solution:** Render a desktop-only teaser beneath the board and a mobile/tablet-only teaser at the bottom, switching visibility at the stacked breakpoint.

**Implementation:**
- Rendered the teaser inside the left column for desktop and a second instance after the right column for stacked layouts
- Added CSS module visibility toggles to swap at the 1024px breakpoint

**Files Changed:**
| File | Change |
| --- | --- |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Desktop + stacked layout placements |
| `packages/web/src/pages/OpeningDetailPage.module.css` | Responsive visibility rules |

## Current Status

Related openings placement aligned for desktop and stacked layouts; ready for verification.
