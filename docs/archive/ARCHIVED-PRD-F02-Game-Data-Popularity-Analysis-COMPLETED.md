# PRD: Feature 1.5 - Game Data Popularity Analysis

## Document Information
- **Document Type:** Product Requirements Document (PRD)
- **Feature:** Game Data Popularity Analysis
- **Priority:** 2 (High)
- **Epic:** Data Foundation
- **Estimate:** 6-8 hours (excluding Colab processing time)
- **Dependencies:**
    1. Base ECO JSON data structure.
    2. **Manual generation and placement of `popularity_stats.json` artifact.**
- **Status:** **Final - Ready for Execution**
- **Created:** July 12, 2025
- **Updated:** July 14, 2025

## Executive Summary

This PRD outlines the implementation of a focused, one-time popularity scoring system for the 12,377 chess openings in the Chess Trainer application. This feature will leverage the comprehensive Lichess game database to calculate accurate popularity scores (1-10 scale) and win/draw/loss rates for each defined opening.

The analysis will cover games played on Lichess from **mid-2021 to the present**, ensuring the data reflects the modern chess meta while retaining massive statistical volume. The analysis will be performed **offline** in a Google Colab environment to manage the immense data volume without impacting local development resources. The resulting statistics will be stored in a separate, optimized JSON file and served to the user on-demand via a new API endpoint, ensuring the core application remains fast and lightweight.

## Problem Statement

### Current State
- The Chess Trainer contains 12,377 openings with descriptive metadata (LLM-generated).
- The application lacks quantitative data on how often openings are played or their effectiveness in real-world games.
- Users have no data-driven way to assess an opening's popularity or practical success rate.

### Pain Points
1.  **No Usage Guidance**: Users cannot identify which openings are commonly played in practice.
2.  **Missing Performance Data**: No win rate information to guide opening selection.
3.  **Limited Discovery**: Users cannot filter or sort openings by popularity or effectiveness.

### Opportunity
By performing a one-time analysis of the Lichess public database, we can provide users with accurate, data-driven statistics for every opening. This enriches the learning experience by grounding theoretical knowledge in real-world application, helping users make more informed decisions about their opening repertoire.

## Goals and Objectives

### Primary Goal
To perform a one-time analysis of the Lichess game database to calculate and store accurate popularity scores and win rates for all 12,377 openings, making this data available on each opening's detail page without compromising core application performance.

### Success Metrics
- **Data Coverage**: 100% of the 12,377 openings have a corresponding entry in the final statistics file.
- **Statistical Significance**: Win rates are generated for all openings that appear in the dataset, with a confidence score based on sample size.
- **Performance**: The offline analysis script runs to completion. The new API endpoint responds in under 100ms.
- **No Performance Regression**: The main application's initial load time and search performance are unaffected.

## User Stories

### Developer Stories
- **As a Developer,** I want to run a one-time analysis script in a cloud environment that processes the Lichess database, so I can generate comprehensive opening statistics without being limited by my local machine's resources.
- **As a Developer,** I want the statistical data stored in a separate, optimized JSON file, so I can keep the core application's data lean and fast.
- **As a Developer,** I want a new API endpoint that can efficiently and safely retrieve the statistics for a single opening, so I can display this data on the detail page without fetching the entire dataset.

### End User Stories
- **As a User,** I want to see how popular an opening is (e.g., on a 1-10 scale) on its detail page, so I can understand its place in the current meta.
- **As a User,** I want to know the actual win, draw, and loss percentages for an opening, so I can evaluate its effectiveness based on real-world results.
- **As a User,** I want to see a confidence score for the statistics, so I can understand how much data the analysis is based on.

## Technical Requirements

### Architecture Overview
The proposed architecture isolates the heavy data processing from the live application. The implementation is divided into a manual analysis phase and an automated integration phase.

**Phase 1: Manual Data Analysis (Human-in-the-Loop)**
```
[Lichess Database (.pgn.bz2) from mid-2021 to Present]
           ↓
[Google Colab Environment] → [tools/analyze_lichess_popularity.py]
           ↓
[popularity_stats.json]  (Generated artifact, ~7MB. This is the handoff point)
```

**Phase 2: Automated Feature Integration**```
[Handoff: popularity_stats.json is placed in the project]
           ↓
[Chess Trainer API] → [GET /api/stats/:fen]
           ↓
[Frontend Web App] → [OpeningDetailPage.tsx]
```

### Data Storage: Separate Statistics File
To maintain the high performance of the client-side search, the popularity statistics will **not** be merged into the existing `eco.json` files. Instead, they will be stored in a single, separate file: `packages/api/src/data/popularity_stats.json`.

-   **Structure:** A key-value object where the key is the opening's FEN string.
-   **Size:** Estimated at 6-7 MB.
-   **Loading:** This file will be read by the backend API on demand, never loaded by the client directly.

### Data Structure Interface (`PopularityStats`)
```typescript
interface PopularityStats {
  popularity_score: number;        // 1-10 scale
  frequency_count: number;         // Raw count from all sources
  white_win_rate?: number;         // 0-1 (if sufficient data)
  black_win_rate?: number;         // 0-1 (if sufficient data)
  draw_rate?: number;              // 0-1 (if sufficient data)
  games_analyzed: number;          // Total games found
  avg_rating?: number;             // Average player rating
  confidence_score: number;        // Statistical confidence (0-1)
  analysis_date: string;           // ISO date string
}
```

### Core Script Implementation
-   **Script Name:** `tools/analyze_lichess_popularity.py`
-   **Language:** Python 3, using the `python-chess` library.
-   **Recommended Environment:** **Google Colab**. This approach mitigates local disk space and processing power limitations.

#### Analysis Methodology (Streaming)
The script will process the massive Lichess database without loading it all into memory.
1.  **Setup:** The script is run in a Colab notebook. The compressed Lichess PGN files are downloaded one by one directly to the Colab instance using `wget`.
2.  **Target Loading:** The 12,377 target FENs from the project's `eco.json` files are loaded into an efficient in-memory Python `set` for fast lookups.
3.  **Stream Processing:** The script opens a compressed `.bz2` file and reads from it as a stream. It decompresses and processes **one game at a time**.
4.  **Aggregation:** For each game, it checks if any of its positions match a FEN on the target list. If a match is found, it updates the relevant counters (games analyzed, win/loss/draw, etc.) in an in-memory dictionary. The game is then discarded from memory.
5.  **Iteration:** This process is repeated for all monthly database files from **mid-2021 to the present**. The script should be designed to save intermediate results to be resilient to session timeouts.
6.  **Output Generation:** After all specified database files have been processed, the final percentages and scores are calculated. The script writes the final aggregated data to `popularity_stats.json`.

### API Integration
A new API endpoint is required to serve the statistics on demand.
-   **Endpoint:** `GET /api/stats/:fen`
-   **Request:** The `:fen` parameter should be the URL-encoded FEN string of the opening.
-   **Response:** The endpoint will read the `popularity_stats.json` file, look up the data for the provided FEN, and return the corresponding `PopularityStats` object.
-   **Validation:** The API endpoint should include a step to validate the structure of the retrieved data to ensure it conforms to the `PopularityStats` interface before sending the response. This prevents serving malformed data.

## Data Sources

### Primary Source: Lichess Standard Database (Exclusive Source)
-   **Time Frame:** The analysis will be scoped to games played from **July 2021 to the most recent available month**. This provides the ideal balance of capturing the modern chess meta while ensuring a massive data volume for statistical accuracy.
-   **Advantages:** This approach leverages Lichess's unique combination of massive volume (billions of games), player diversity (all skill levels), and accessibility (free, public, standard format).

## Acceptance Criteria

### Functional Requirements
1.  **Artifact Generation:** The `analyze_lichess_popularity.py` script runs successfully in Google Colab and generates a valid `popularity_stats.json` file.
2.  **Full Coverage:** The generated JSON file contains a statistics entry for every one of the 12,377 openings.
3.  **API Works:** A `GET` request to `/api/stats/:fen` for a valid opening FEN returns the correct and validated `PopularityStats` object.
4.  **UI Displays Stats:** The `OpeningDetailPage` successfully fetches and displays the popularity score and win/draw/loss rates. *(Note: Specific UI/UX design will be handled in a separate feature ticket).*

### Technical Requirements
1.  **No Core App Bloat:** The main `eco.json` files are untouched. The new statistics are stored separately.
2.  **Efficient Processing:** The analysis script uses a streaming approach to handle large files without excessive memory or disk usage.
3.  **No Performance Regression:** Client-side search and initial app load times remain within the project's performance targets (1-5ms search, <2s load).

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Colab Session Timeout | Medium | Medium | The analysis of several years of data will be a long process. The script should be designed to save intermediate results after processing each monthly file, allowing it to be resumed. For very long runs, Colab Pro could be considered. |
| Changes to Lichess Data Format | Low | High | The PGN format is a stable standard. Pin the `python-chess` library version to ensure consistent parsing. |
| Data Skew (Lichess Meta) | Low | Low | Acknowledge that the data reflects the Lichess player base. This is acceptable as it is a massive and diverse community that is highly representative of online chess. |
