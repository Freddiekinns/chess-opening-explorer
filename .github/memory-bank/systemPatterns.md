# System Patterns: Chess Opening Explorer

This document outlines the key architectural decisions and recurring patterns in the system.

## AD-003: Single CSS File Architecture

-   **Pattern:** All frontend styles are consolidated into a single CSS file: `/packages/web/src/styles/simplified.css`.
-   **Rationale:**
    -   Eliminates CSS specificity wars and ordering issues.
    -   Ensures a single, small, cacheable CSS bundle.
    -   Simplifies theming and maintenance through the extensive use of CSS variables.
-   **Strict Rule:** Developers **must not** create new CSS files. All new styles are appended to `simplified.css`.

## AD-004: Channel-First Video Pipeline

-   **Pattern:** Instead of searching YouTube for videos based on opening names (which is expensive and inaccurate), the pipeline first indexes all videos from a curated list of trusted chess channels. Openings are then mapped to these videos.
-   **Rationale:**
    -   Drastically reduces YouTube Data API quota usage (by over 99%).
    -   Ensures a high-quality, relevant baseline of video content.
    -   Avoids the "garbage in, garbage out" problem of open-ended video search.
-   **Implementation:** `tools/production/run-channel-first-pipeline.js`.

## AD-005: Conservative AI Content Policy

-   **Pattern:** AI-generated content is treated with skepticism, especially URLs and factual claims. A principle of "if in doubt, exclude it" is applied.
-   **Rationale:** Early experiments revealed a high hallucination rate for URLs (95%+) and factual inaccuracies. The value of AI is in discovery and summarization, not as a source of truth.
-   **Implementation:**
    -   AI is used for tasks like generating strategic summaries or identifying themes.
    -   AI-generated URLs or direct links are almost always discarded.
    -   Validation scripts (`tools/validation/`) are used to check the integrity of AI-generated data before it's committed to the production dataset.

## AD-006: Idempotent Data Processing

-   **Pattern:** All data processing scripts in the `tools/` directory are designed to be idempotent. They can be run multiple times without changing the result beyond the initial run.
-   **Rationale:** This makes the data pipeline robust and recoverable. If a script fails midway, it can be safely re-run without duplicating data or causing side effects.
-   **Implementation:**
    -   Scripts check for the existence of output files before starting.
    -   Processing status and metadata are stored separately from the content itself.
    -   "Skip" logic is implemented to bypass items that have already been successfully processed.

## AD-008: Progressive Discovery Search

-   **Pattern:** The search functionality uses a multi-layered approach to understand user intent, moving from broad concepts to specific results.
-   **Hierarchy:**
    1.  **Semantic Search:** Understands natural language queries (e.g., "attacking openings for black").
    2.  **Fuzzy Search:** Tolerates typos and variations in opening names.
    3.  **Exact Match:** Provides a direct hit for specific ECO codes or names.
-   **Rationale:** This creates a more intuitive and powerful discovery experience than simple text matching, guiding users to relevant openings even if they don't know the precise terminology.

## Monorepo Deployment on Vercel

-   **Pattern:** The project uses a dual-directory structure for the API to work with Vercel's serverless environment.
    -   The "real" API logic, services, and data reside in `packages/api`.
    -   A thin wrapper layer exists in the root `api/` directory. Each file in `api/` is a Vercel serverless function that simply imports and exports the corresponding route handler from `packages/api`.
-   **Rationale:** This pattern allows for a clean monorepo structure with shared packages (`packages/shared`) while complying with Vercel's build and deployment model. The `vercel.json` file orchestrates this.
