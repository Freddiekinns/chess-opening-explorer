# Active Context

**Date:** 2026-02-18

## Current Focus: TASK004 - Course Discovery Pipeline Complete

The course discovery pipeline has been fully rebuilt with a clean two-step
architecture on branch `feat/studies-tab`. All data is imported and the pipeline
is consolidated.

## Session Summary (2026-02-18)

### Course Discovery Pipeline: Full Rebuild & Import

**Architecture:** Two-step pipeline replacing the old author-based approach:

1. **Discover** (`discover-popular.js`): Search Lichess for popular studies
   (500+ likes), classify as opening-related, output new URLs
2. **Import** (`add-studies.js`): Read `curated-studies.txt`, fetch
   metadata+PGN, match chapters to ECO openings by FEN, write `courses.json`

**Data Results:**

| Metric          | Value                              |
| --------------- | ---------------------------------- |
| Curated studies | 630 URLs in curated-studies.txt    |
| Studies fetched | 440 (97 failed: 58 404s, 39 403s) |
| FEN positions   | 2,255 unique                       |
| Course entries  | 6,142 total                        |
| All curated     | Yes (no auto_discovered entries)   |
| All have likes  | Yes                                |

**Discovery Phase:**

- Searched 46 opening terms on Lichess study search
- Found 441 unique studies with 500+ likes
- 431 classified as opening-related (10 correctly excluded: endgames, puzzles)
- 294 new studies not already in curated list
- Appended to curated-studies.txt and imported

**Cleanup & Consolidation:**

- Removed deprecated files: `index.js` (author pipeline), `quality-filter.js`,
  `authors.json`, `quality-filter.test.js`
- Updated integration tests (removed quality-filter tests)
- Updated `course-merger.js` JSDoc
- Rewrote `tools/course-discovery/README.md` for new architecture
- Updated npm scripts (`course:discover` → `discover-popular.js`)
- Added state file patterns to `.gitignore`
- Deleted stale `api/data/courses.json` (was 692 bytes, unused)
- All 35 test suites (491 tests) passing

### Files Changed

| File                                            | Change                           |
| ----------------------------------------------- | -------------------------------- |
| `tools/course-discovery/add-studies.js`         | Main importer (created earlier)  |
| `tools/course-discovery/discover-popular.js`    | Discovery tool (created earlier) |
| `tools/course-discovery/lib/lichess-fetcher.js` | Updated metadata endpoint        |
| `tools/course-discovery/lib/course-merger.js`   | Updated JSDoc                    |
| `tools/course-discovery/README.md`              | Complete rewrite                 |
| `tools/course-discovery/config/curated-studies.txt` | 630 study URLs             |
| `tools/course-discovery/config/discovered-studies.txt` | 294 discovered URLs     |
| `packages/api/src/data/courses.json`            | 6,142 entries across 2,255 FENs |
| `package.json`                                  | Updated npm scripts              |
| `tests/integration/course-pipeline.test.js`     | Removed quality-filter tests     |
| `.gitignore`                                    | Added state file patterns        |
| `api/data/courses.json`                         | Deleted (stale)                  |
| `tools/course-discovery/index.js`               | Deleted (deprecated)             |
| `tools/course-discovery/lib/quality-filter.js`  | Deleted (deprecated)             |
| `tools/course-discovery/config/authors.json`    | Deleted (deprecated)             |
| `tests/unit/quality-filter.test.js`             | Deleted (deprecated)             |

## Session Summary (2026-02-10)

### TASK004 Planning Complete

- **Constraints identified:** Lichess study search has no API (scraping ruled
  out), Chessable scraping violates ToS, LLM curation too expensive/error-prone.
- **Approach:** Known-author pipeline using `GET /api/study/by/{username}` + PGN
  parsing + FEN matching against ECO database.
- **Pipeline files:** `tools/course-discovery/` with orchestrator,
  lichess-fetcher, pgn-matcher, course-merger, and authors config.
- **Search links:** Runtime generation of Lichess + Chessable search URLs added
  to course-service and routes.
- **Patterns reused:** StateManager, Logger, yargs from existing pipelines.
- **Frontend deferred:** CourseGallery component planned but not part of this
  implementation phase.

### Earlier: Roadmap Planning

- **Action:** Created `TASK004` and `TASK005` to document the new roadmap.
- **Stockfish Analysis:** Plan for a hybrid Lichess Cloud Eval + Stockfish WASM
  analysis system.
- **Mistake Trainer:** New feature to analyze personal games for opening
  blunders.

## Session Summary (2026-02-09)

### Update: Related Openings Placement

**Problem:** When the layout collapsed to one column, the related openings
teaser was still positioned under the board, leaving a large gap.

**Solution:** Render a desktop-only teaser beneath the board and a
mobile/tablet-only teaser at the bottom, switching visibility at the stacked
breakpoint.

**Implementation:**

- Rendered the teaser inside the left column for desktop and a second instance
  after the right column for stacked layouts
- Added CSS module visibility toggles to swap at the 1024px breakpoint

**Files Changed:** | File | Change | | --- | --- | |
`packages/web/src/pages/OpeningDetailPage.tsx` | Desktop + stacked layout
placements | | `packages/web/src/pages/OpeningDetailPage.module.css` |
Responsive visibility rules |

## Session Summary (2026-02-01)

### Rollback: Increase Max Games Feature

- **Action:** Rolled back `main` branch to remove the "increase max games"
  feature (commit `4c6070bd0`).
- **Rationale:** User requested to revert to the previous version and remove
  this specific feature.
- **Scope:**
  - Reset `packages/api` services and routes to clamp games at 200.
  - Reset `packages/web` UI components (PersonalOpeningStats) to max 200.
  - Force pushed the rollback to `origin/main`.

### Enhancement: Lichess-Style Visual Indicators

**Previous:** Blue highlights for selection, no previous move indicator.

**New (matching Lichess/Chess.com):**

- **Previous move highlight:** Yellow-green `rgba(186, 202, 68, 0.4)` on both
  from/to squares
- **Selected square:** Bright yellow `rgba(255, 255, 0, 0.5)`
- **Legal moves (empty squares):** Small dark dot via radial gradient (22%
  radius)
- **Legal moves (capture squares):** Hollow ring via radial gradient (65% outer
  ring)

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

- `handleCorrectMove`: Sets lastMoveSquares after user move AND opponent
  auto-move
- `startPractice`: Sets lastMoveSquares when auto-playing white's first move
  (black player)
- `exitPractice`: Clears lastMoveSquares

**Chessboard Options:**

- `dragActivationDistance: 5` (lowered from 15 - library now handles tap vs drag
  properly)

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

Show last move persistently (yellow-green) to help users track game flow in
practice mode.

- Separate from selection highlighting (bright yellow)
- Cleared on exit/restart, updated after each move pair

## Current Status

Related openings placement aligned for desktop and stacked layouts; ready for
verification.

### Update: Test Suite Stabilization

**Problem:** Jest failures from outdated video pipeline/database test imports
and coverage config.

**Solution:** Repointed tests to current module paths, retired obsolete pipeline
tests, and aligned Jest coverage to the active database path.
