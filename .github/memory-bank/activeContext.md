# Active Context

**Date:** 2026-02-02

## Current Focus: Related Openings UX Improvements - COMPLETE

Enhanced Related Openings section to distinguish same-named variations and improve loading performance.

## Session Summary (2026-02-02)

### Enhancement: Move Sequence Display

**Problem:** Related openings with the same name (e.g., multiple "Caro-Kann Advance Variation" entries) were indistinguishable.

**Solution:** Display move sequences below each opening name.

**Implementation:**
- Added `moves` and `showMoves` props to `VariationItem` component
- `formatMoves()` utility truncates long sequences (8 moves desktop, CSS-based mobile truncation)
- Native `title` tooltip shows full moves on hover
- Monospace font, muted color for visual hierarchy

### Performance: Parallel Data Fetching

**Problem:** Related Openings section loaded noticeably slower than the rest of the page due to waterfall request pattern.

**Root Cause:** `RelatedOpeningsTeaser` fetched its own data via `useRelatedOpenings` hook AFTER the component mounted.

**Solution:** Fetch related openings in parallel with main opening data.

**Implementation:**
- `RelatedOpeningsTeaser` now accepts optional `relatedData` and `relatedLoading` props
- When provided, skips internal fetch (backward compatible)
- `OpeningDetailPage` starts both fetches simultaneously from `useEffect`

### Files Changed

| File | Change |
|------|--------|
| `packages/web/src/components/detail/VariationItem.tsx` | Added moves display with truncation |
| `packages/web/src/components/detail/RelatedOpeningsTeaser.tsx` | Accept pre-fetched data props |
| `packages/web/src/components/detail/RelatedOpeningsModal.tsx` | Pass moves to VariationItem |
| `packages/web/src/components/detail/RelatedOpeningsTab.tsx` | Pass moves to VariationItem |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Parallel fetch for related openings |
| `packages/web/src/styles/simplified.css` | Styling for moves display |

### Technical Details

**New VariationItem Props:**
```typescript
moves?: string           // Move sequence to display
showMoves?: boolean      // Toggle move display (default: false)
```

**Move Truncation:**
- Desktop: Up to 8 moves, then "..."
- Mobile (<480px): CSS max-width 180px for tighter truncation
- Full moves shown in native browser tooltip on hover

**Parallel Fetch Pattern:**
```typescript
useEffect(() => {
  if (fen) {
    const decodedFen = decodeURIComponent(fen)
    loadOpening(decodedFen)        // Main opening
    loadRelatedOpenings(decodedFen) // In parallel
  }
}, [fen])
```

## Previous Work (2026-01-31)

### Practice Mode Mobile & Visual Enhancements
- Fixed mobile tap-to-move (upgraded react-chessboard to v5.8.6)
- Added Lichess-style visual indicators (previous move, legal moves)

## Current Status

Related Openings improvements complete. Branch `claude/distinguish-opening-variations-0ihi9` ready for merge to main.
