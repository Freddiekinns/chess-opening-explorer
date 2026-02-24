# [TASK007] - Intermittent Mobile Overflow on Opening Detail (Surprise Me Loop)

**Status:** In Progress  
**Created:** 2026-02-23  
**Owner:** AI assistant session with user report

## Problem Summary

On mobile, the opening detail page intermittently shifts horizontally so content
appears pushed off-screen to the right. The issue is not deterministic.

### Key User Observation

- The problem **does not** reproduce when navigating from the landing page to an
  opening.
- The problem **does** reproduce when repeatedly using **Surprise me** from the
  **mobile search/overlay** while already on an opening detail page.
- Frequency improved after fixes, but bug still reproduces (example: “got
  through 3 openings then broke”).
- Viewport is currently locked, so horizontal scroll is not possible, but content appears shifted as if left
  edge is clipped and subsequent components render outside viewport bounds. 

## Reproduction Path (Current Best Known)

1. Open an opening detail page on mobile.
2. Open the mobile search menu (magnifier icon in header).
3. Use Surprise me / select openings repeatedly from this mobile detail flow.
4. After several transitions, page may render with horizontal
   right-shift/overflow behavior.

## Expected Behavior

- Layout remains anchored to viewport width.
- No horizontal scroll offset carryover between detail-page route transitions.
- Board, FEN controls, tabs, and subsequent cards remain fully within viewport.

## Actual Behavior

- Intermittent horizontal shift to the right after detail→detail navigation on
  mobile.
- Appears as if left edge is clipped and subsequent components render outside
  viewport bounds.
- Not consistently reproducible on every transition.

## Scope / Impact

- Affects mobile UX and confidence in detail page stability.
- Trigger path appears linked to overlay + keyboard + in-place route param
  updates.

## What Was Tested and Changed

### 1) Tab overflow hardening

- Wrapped tab buttons in a non-scrolling track and applied mobile horizontal
  scrolling only to tab row.
- Added right-edge fade indicator in module CSS.

Files:

- packages/web/src/pages/OpeningDetailPage.tsx
- packages/web/src/pages/OpeningDetailPage.module.css

### 2) Board and controls overflow hardening

- Constrained chessboard container and internal wrapper widths to 100%.
- Allowed mobile wrap for board navigation and FEN action row.
- Ensured FEN input can shrink/wrap safely.

Files:

- packages/web/src/pages/OpeningDetailPage.module.css

### 3) Route transition stability in detail page

- Added `key` to `Chessboard` bound to opening FEN to force remount on opening
  change.
- On FEN route change: reset horizontal scroll offsets and close mobile overlay.

Files:

- packages/web/src/pages/OpeningDetailPage.tsx

### 4) Overlay/keyboard transition stability

- Added safe overlay close helper that blurs active element before close.
- Before selecting opening from mobile overlay: reset horizontal scroll.
- Added short delay (180ms) before navigation to allow viewport/keyboard settle.

Files:

- packages/web/src/components/shared/MobileSearchOverlay.tsx

### 5) Page/global overflow guards

- Added overflow guard on detail page container.
- Added html/body/#root horizontal overflow guards.

Files:

- packages/web/src/styles/simplified.css

## Validation Performed

- Web build repeatedly passed (`tsc && vite build`).
- Frontend tests passed:
  - 12 test files passed, 1 skipped
  - 135 tests passed

## Current Status

- Issue reproduces less often but still present.
- Bug remains open due intermittent failures in the same mobile detail
  navigation path.

## Recommended Next Debug Step

Add a temporary runtime overflow probe (development-only) that logs first
offending element when
`document.documentElement.scrollWidth > window.innerWidth` after each
detail-route transition:


- capture selector path/class list
- capture element `scrollWidth/clientWidth/boundingClientRect`
- capture `window.visualViewport` metrics

This should identify the exact element causing the residual width expansion.

## Related Commit(s)

- `e3ddf54fd` — fix(frontend): harden mobile detail navigation layout
- Additional uncommitted continuation: global overflow guards in
  `simplified.css` (to be committed as follow-up)
