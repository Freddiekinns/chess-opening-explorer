# Active Context

**Date:** 2026-01-31

## Current Focus: Practice Mode Mobile & Visual Enhancements - COMPLETE

Fixed mobile tap-to-move bug and added Lichess/Chess.com-style visual indicators to practice mode.

## Session Summary (2026-01-31)

### Bug Fix: Mobile Tap-to-Move

**Problem:** Tap-to-move wasn't working on real mobile devices (only drag worked).

**Root Cause:** Outdated `react-chessboard` library (v5.1.0). The bug was fixed in v5.2.2 (Aug 2025) per GitHub issue #206.

**Solution:** Upgraded `react-chessboard` from `^5.1.0` to `^5.8.6`.

### Enhancement: Lichess-Style Visual Indicators

**Previous:** Blue highlights for selection, no previous move indicator.

**New (matching Lichess/Chess.com):**
- **Previous move highlight:** Yellow-green `rgba(186, 202, 68, 0.4)` on both from/to squares
- **Selected square:** Bright yellow `rgba(255, 255, 0, 0.5)`
- **Legal moves (empty squares):** Small dark dot via radial gradient (22% radius)
- **Legal moves (capture squares):** Hollow ring via radial gradient (65% outer ring)

### Files Changed

| File | Change |
|------|--------|
| `packages/web/package.json` | react-chessboard ^5.1.0 → ^5.8.6 |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Added lastMoveSquares state, updated visual effects, lowered dragActivationDistance to 5, removed @ts-ignore |

### Technical Details

**New State:**
```typescript
const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null)
```

**Updated Effects:**
- `handleCorrectMove`: Sets lastMoveSquares after user move AND opponent auto-move
- `startPractice`: Sets lastMoveSquares when auto-playing white's first move (black player)
- `exitPractice`: Clears lastMoveSquares

**Chessboard Options:**
- `dragActivationDistance: 5` (lowered from 15 - library now handles tap vs drag properly)

### Test Results
- Frontend (Vitest): 15 practice-mode tests passing
- TypeScript: compiles cleanly (no errors after removing @ts-ignore)

## Previous Work (2026-01-30)

### Practice Mode: Click-to-Move Support
- Both click-to-move AND drag-and-drop work simultaneously
- Uses react-chessboard's built-in onSquareClick handler
- Legal moves calculated via chess.js

### Personal Opening Explorer - Complete
- Chess.com API integration
- Actionable Insights UI (win rate by color, best/worst openings)

## Architecture Decisions

### AD-015: Previous Move Highlighting
Show last move persistently (yellow-green) to help users track game flow in practice mode.
- Separate from selection highlighting (bright yellow)
- Cleared on exit/restart, updated after each move pair

## Current Status

Practice mode mobile fix and visual enhancements complete. Ready for manual testing on real mobile device.
