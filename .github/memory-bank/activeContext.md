# Active Context

**Date:** 2026-02-09

## Current Focus: Related Openings Placement

Keep the related openings teaser directly under the chessboard on desktop while moving it to the bottom once the layout stacks.

## Session Summary (2026-02-10)

### Roadmap Planning: Courses & Analysis

- **Action:** Created `TASK004` and `TASK005` to document the new roadmap.
- **Course Discovery:** Plan to scrape Lichess studies (slowly) and link to Chessable searches.
- **Stockfish Analysis:** Plan for a hybrid Lichess Cloud Eval + Stockfish WASM analysis system.
- **Mistake Trainer:** New feature to analyze personal games for opening blunders.

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

## Session Summary (2026-02-01)

### Rollback: Increase Max Games Feature

- **Action:** Rolled back `main` branch to remove the "increase max games" feature (commit `4c6070bd0`).
- **Rationale:** User requested to revert to the previous version and remove this specific feature.
- **Scope:**
  - Reset `packages/api` services and routes to clamp games at 200.
  - Reset `packages/web` UI components (PersonalOpeningStats) to max 200.
  - Force pushed the rollback to `origin/main`.

### Enhancement: Lichess-Style Visual Indicators

**Previous:** Blue highlights for selection, no previous move indicator.

**New (matching Lichess/Chess.com):**

- **Previous move highlight:** Yellow-green `rgba(186, 202, 68, 0.4)` on both from/to squares
- **Selected square:** Bright yellow `rgba(255, 255, 0, 0.5)`
- **Legal moves (empty squares):** Small dark dot via radial gradient (22% radius)
- **Legal moves (capture squares):** Hollow ring via radial gradient (65% outer ring)

### Files Changed

| File                                           | Change                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/web/package.json`                    | react-chessboard ^5.1.0 → ^5.8.6                                                                             |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Added lastMoveSquares state, updated visual effects, lowered dragActivationDistance to 5, removed @ts-ignore |

### Technical Details

**New State:**

```typescript
const [lastMoveSquares, setLastMoveSquares] = useState<{
  from: string;
  to: string;
} | null>(null);
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

Related openings placement aligned for desktop and stacked layouts; ready for verification.

### Update: Test Suite Stabilization

**Problem:** Jest failures from outdated video pipeline/database test imports and coverage config.

**Solution:** Repointed tests to current module paths, retired obsolete pipeline tests, and aligned
Jest coverage to the active database path.
