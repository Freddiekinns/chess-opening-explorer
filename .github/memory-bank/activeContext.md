# Active Context

**Date:** 2026-01-30

## Current Focus: Practice Mode Click-to-Move Enhancement

Added click-to-move functionality to the practice mode chessboard for better mobile UX.

## Session Summary (2026-01-30)

### Major Feature Delivered

#### Practice Mode: Click-to-Move Support
Mobile users can now tap to move pieces in practice mode instead of only drag-and-drop:

**How it works:**
1. **First tap** on your piece → selects it (blue highlight) and shows legal move squares (lighter blue)
2. **Second tap** on a legal destination → executes the move
3. **Tap elsewhere** → deselects the piece

**Implementation details:**
- Both click-to-move AND drag-and-drop work simultaneously
- Uses `react-chessboard`'s built-in `onSquareClick` handler
- Legal moves calculated via `chess.js`'s `moves({ square, verbose: true })`
- Selection cleared on: move execution, exit practice, color switch, restart

### Files Changed

| File | Change |
|------|--------|
| `packages/web/src/pages/OpeningDetailPage.tsx` | Added click-to-move state, handlers, and effects |
| `packages/web/src/pages/__tests__/practice-mode.test.tsx` | Added 3 new tests for click-to-move |

### Technical Details

**New State Variables:**
```typescript
const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
const [legalMoves, setLegalMoves] = useState<string[]>([])
```

**New Functions:**
- `getLegalMovesForSquare(square)` - Returns array of legal destination squares
- `handleSquareClick({ piece, square })` - Core click-to-move logic
- `validateAndHandleMoveFromClick(source, target)` - Executes move from click
- `clearSelection()` - Resets selection state

**Visual Feedback:**
- Selected piece square: `rgba(66, 135, 245, 0.5)` (blue)
- Legal move squares: `rgba(66, 135, 245, 0.25)` (lighter blue)

### Test Results
- Frontend (Vitest): 135 tests passing (15 in practice-mode.test.tsx)
- TypeScript: compiles cleanly

## Previous Work (Same Day)

### Personal Opening Explorer - Complete
- Chess.com API integration
- Actionable Insights UI (win rate by color, best/worst openings)
- UX polish (progress bar, note visibility, win-rate indicators)

## Architecture Decisions

### AD-014: Click-to-Move in Practice Mode
Mobile UX improvement: support both click-to-move and drag-and-drop in practice mode.
- Both methods work simultaneously (no toggle needed)
- Selected piece and legal moves are visually highlighted
- Selection state is cleared on state transitions (move, exit, color switch)

## Current Status

Practice mode now supports click-to-move for mobile users. Ready for testing.
