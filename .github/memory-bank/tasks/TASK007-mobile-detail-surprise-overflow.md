# [TASK007] - Mobile Overflow on Opening Detail Page

**Status:** Resolved  
**Created:** 2026-02-23  
**Resolved:** 2026-02-23  
**Owner:** AI assistant session with user report

## Problem Summary

On mobile, certain opening detail pages overflow horizontally. Content-heavy
openings (e.g., QGD: Anti-Neo-Orthodox with 5+ related variations) always
overflow, while simpler openings (e.g., Scandinavian: Modern) never do.

## Root Cause

The .two-column-layout CSS Grid used grid-template-columns: 1fr, which resolves
to minmax(auto, 1fr). When RelatedOpeningsTeaser was moved from inside
.right-column (which had min-width: 0) to being a direct child of the grid, the
teaser intrinsic minimum width could expand the grid track beyond the viewport
on mobile.

Multiple layers of overflow: hidden on ancestors were ineffective because the
grid containers **grew to fit** -- nothing actually overflowed them.

## Fix Applied

Three CSS changes in packages/web/src/styles/simplified.css:

1. Changed 1fr to minmax(0, 1fr) at all breakpoints
2. Added .two-column-layout > \* { min-width: 0; } wildcard rule
3. Removed ineffective overflow-x: hidden from #root and .detail-page-body

## Regression Test

Playwright e2e test at ests/e2e/mobile-overflow.spec.ts verifies no horizontal
overflow at 375px viewport with 6 related siblings.

## Validation

- TypeScript check passed
- Vite build passed
- 135 frontend tests passed (12 files)
- User confirmed fix on real mobile device

## Previous Mitigation Attempts (Did Not Fix)

### 1) Tab overflow hardening

- Wrapped tab buttons in a non-scrolling track and applied mobile horizontal
  scrolling only to tab row.

### 2) Board and controls overflow hardening

- Constrained chessboard container and internal wrapper widths to 100%.

### 3) Route transition stability in detail page

- Added key to Chessboard bound to opening FEN to force remount.

### 4) Overlay/keyboard transition stability

- Blur active element before close, delay navigation for keyboard settle.

### 5) Page/global overflow guards

- Added overflow-x guards on #root, .detail-page-body, .two-column-layout, ody
  -- none clipped because containers grew.

## Related Commits

- 3ddf54fd -- fix(frontend): harden mobile detail navigation layout
