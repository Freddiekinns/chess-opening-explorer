# [TASK013] - Engine-Validated Practical Blunder Analysis

**Status:** Pending  
**Added:** 2026-03-17  
**Updated:** 2026-03-17

## 1. Problem Statement
Learners see "theoretical" moves but don't know if they are actually sound (high eval) or just traditional. More importantly, they don't know which *popular* amateur moves are actually dangerous tactical mistakes (blunders). 

## 2. Proposed Solution (PRD)
A unified analysis system that links **Lichess Cloud Evaluations** (Objective Truth) with **Practical Popularity Data** (Amateur Reality). The goal is to show the "Why" through a comparison of the Best Move vs. the Most Popular Blunder.

### User Journey: The "Choice" Analysis
1. **Context**: User is on the "Italian Game" (C50) page.
2. **Move Comparison UI**: In the stats table, three specific moves are highlighted for the current position:
   - **Theoretical Move**: The one from official theory (e.g., 3. Bc4).
   - **Engine's Best**: The #1 suggested move by Lichess Cloud Eval (e.g., 3. Bc4, Eval +0.4).
   - **Most Popular "Trap"**: The move most frequently played by amateurs that has a significantly lower eval (e.g., 3. h3, played in 8% of games, Eval -0.6).
3. **Linking the "Why"**: The UI explicitly links these: "While [Move A] is the most popular amateur choice, the Engine recommends [Move B] because it maintains a +0.5 advantage. [Move A] is a practical trap that leads to a -0.6 disadvantage."
4. **Interactive Outcome**: User can see the engine's "Best Response" to the popular blunder.

### Features
- **Lichess Cloud Eval Integration**: API-driven lookup for FEN evaluations (cp/mate) and Multi-PV (top 3 best moves).
- **Blunder Identification (The "Gap")**: A calculation that finds the move with the highest `popularity` but the lowest `engine_eval` for each position.
- **Top 1000 Pre-calculation**: A batch script to pre-fetch these insights for the most common 1000 ECO positions to ensure $0ms$ latency for users.
- **Visual Comparison Badge**: Color-coded badges: `Best (Green)`, `Book (Blue)`, `Popular Blunder (Red)`.

### Feasibility: High
- **Engine Source**: `https://lichess.org/api/cloud-eval` provides `pvs` (multiple candidate moves) and centipawn scores reliably for all major opening FENs.
- **Data Link**: Our `popularity_stats.json` already uses FEN as a key, matching Lichess's input format perfectly.
- **Batching**: We can pre-calculate the top 1000 positions in ~20 mins (respecting API rate limits).

### Desirability: Extremely High
- This is the "Learning Journey" centerpiece. It shows the user the three paths: what they *should* play (Theory), what is *objectively best* (Engine), and what they *will actually face* (Popular Blunder).

### MoSCoW: Must Have
- This is the defining feature of the "Explorer" vs. a regular database.

## 3. Implementation Plan
1. **Backend**: Update `tools/analysis/lib/stats_calculator.py` to compare move frequency vs. actual win-rates and engine evals.
2. **Data**: Store these flags in `packages/api/src/data/popularity_stats.json`.
3. **Frontend**: Create `BlunderBadge.tsx` and integrate it into the `OpeningStats` and move tables.
4. **Integration**: Add a "Soundness Indicator" to the opening header based on the aggregate evaluation of the main line.

## 4. Key Files
- `tools/analysis/lib/stats_calculator.py`
- `packages/api/src/data/popularity_stats.json`
- `packages/web/src/components/detail/BlunderBadge.tsx`
- `packages/web/src/components/detail/OpeningStats.tsx`
