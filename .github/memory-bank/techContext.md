# Tech Context: Chess Opening Explorer

## Frontend

-   **Framework:** React 19 with TypeScript
-   **Build Tool:** Vite
-   **Styling:**
    -   A single, consolidated CSS file: `packages/web/src/styles/simplified.css`.
    -   **Strict Rule:** No new CSS files. All styles are added to this file.
    -   Heavy use of CSS Custom Properties (variables) for theming and consistency.
-   **State Management:** React Hooks and Context API.
-   **Testing:** Vitest for unit and component tests, located in `packages/web/src/**/__tests__/`.
-   **Key Libraries:**
    -   `react-router-dom` for routing.
    -   `testing-library/react` for component testing.

## Backend

-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Architecture:**
    -   A primary API located in `packages/api`.
    -   Thin Vercel serverless function wrappers in the root `api/` directory that import and expose the `packages/api` logic. This is a key pattern for monorepo deployment on Vercel.
-   **Database:**
    -   A hybrid approach.
    -   **SQLite** for relational data, used during the build process.
    -   **JSON files** (`courses.json`, `video-index.json`, etc.) as the production "database". These are pre-processed and served as static assets by the API.
-   **Testing:** Jest for unit and integration tests, located in the root `tests/` directory.

## Data Processing & AI

-   **Data Sources:**
    -   Lichess Database (for game statistics)
    -   YouTube Data API (for video content)
-   **AI:**
    -   Google Vertex AI for Large Language Model (LLM) enrichment tasks.
-   **Pipeline:**
    -   A series of Node.js scripts in the `tools/` directory.
    -   These scripts are idempotent and handle data fetching, processing, enrichment, and validation.
    -   Key pattern: "Channel-First" video indexing to save API quota and improve quality.

## Development & Deployment

-   **Monorepo Management:** npm workspaces.
-   **Environment:** `NODE_ENV` is used to differentiate between `development`, `test`, and `production` environments.
-   **CI/CD:** GitHub Actions (assumed, based on `.github` folder).
-   **Deployment Platform:** Vercel. The `vercel.json` file and the `api/` directory structure are configured for this.
-   **Package Manager:** npm.
