# [TASK005] - Stockfish Game Analysis & Blunder Detection

**Status:** Pending  
**Added:** 2026-02-10  
**Updated:** 2026-02-10

## Original Request

Add Stockfish for game analysis with the ability to detect blunders in games that match openings. Users can look at these to see what went wrong.

## User Stories

- **As a player**, I want to know exactly where I go wrong in my games so I can stop making the same mistakes.
- **As a learner**, I want an interactive way to fix my opening blunders rather than just looking at a static list of moves.
- **As a user**, I want the analysis to be fast and not slow down my computer/phone.

## User Journey

1. **Entry**: User connects their Lichess account and navigates to the "Mistake Trainer" dashboard.
2. **Identification**: User sees a list of recent losses where they blundered or deviated from "Book" theoretical lines.
3. **Drill**: User selects a game. The board jumps to the specific position where the eval dropped or the "book" line was missed.
4. **Correction**: User is challenged to "Find the better move." They play a move; the app provides feedback via Lichess Cloud Eval or local Stockfish.
5. **Success**: User sees the correct theoretical line and a brief explanation of why their previous move was a mistake.

## Proposed Logic

1. **Hybrid Engine**: Use Lichess Cloud Eval for instant opening analysis.
2. **Local Engine**: Integrate `stockfish.js` (WASM) in a Web Worker for dynamic/obscure positions.
3. **Deviation Detection**: Compare personal game PGNs against the "Book" lines in the database.
4. **Blunder Logic**: Identify first move where eval drops significantly (> 1.0) or leaves the book.
5. **Trainer UI**: Create a "Mistake Trainer" page where users replay their mistakes and find the corrected "Book" move.

## Progress Tracking

**Overall Status:** 0% Complete

| Area                       | Status  | Notes                                            |
| -------------------------- | ------- | ------------------------------------------------ |
| Stockfish WASM Integration | Pending | Setup Web Worker and UCI interface               |
| Lichess Cloud Eval Client  | Pending | API fetch for instant evaluations                |
| Deviation Detection Logic  | Pending | Logic to find where user left the book           |
| Personal Blunder UI        | Pending | "Mistake Trainer" page/modal                     |
| Engine UI: Eval Bar        | Pending | On-screen indicator of current position strength |

## Deferred / Future Ideas

| Idea                   | Rationale                                      |
| ---------------------- | ---------------------------------------------- |
| Stockfish NNUE (Large) | Higher accuracy but much larger bundle (40MB+) |
| Multi-PV Analysis      | Show top 3 candidate moves simultaneously      |

## Acceptance Criteria

1. App can fetch evaluations from Lichess Cloud API.
2. Local Stockfish runs correctly in a separate thread.
3. Mistakes in personal games are highlighted on the board.
4. "Mistake Trainer" correctly identifies the first deviation from book lines.

## Key Files

- `packages/web/src/hooks/useEngine.ts` (to be created)
- `packages/api/src/services/mistake-service.js` (to be created)
- `packages/web/src/pages/MistakeTrainer.tsx` (to be created)
- `packages/web/src/components/board/EvaluationBar.tsx` (to be created)
