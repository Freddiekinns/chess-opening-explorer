# Progress: Chess Opening Explorer

## What Works

-   **Core Opening Data:** The full database of 12,377+ openings is integrated and served via the API (`/api/openings/all`).
-   **Search:** The multi-layered search (Semantic, Fuzzy, Exact) is functional. The backend service provides fast responses (1-5ms).
-   **Popularity Stats:** The system successfully processes Lichess game data to calculate and display opening popularity scores.
-   **Video Pipeline:** The "Channel-First" data pipeline is complete and operational. It has successfully indexed over 1,000 videos from trusted channels.
-   **Course Recommendations:** The backend data and API endpoint (`/api/courses/:fen`) for course recommendations are complete. The initial data for the F03 (King's Pawn Game) ECO code is fully integrated.
-   **Unified Architecture:** The monorepo structure with shared packages and the Vercel deployment pattern are implemented and working.
-   **Frontend Foundation:** The React/Vite frontend is set up with routing, a basic layout, and the critical single CSS file architecture.
-   **Related Openings UI:** Consolidated inline expandable teaser with smooth JS height animation, unified card header pattern, contextual mainline callout (variation view), ECO pill metadata (accessible & de-emphasized), passing test coverage (navigation, structure, UI).
	-   Frontend test consolidation: Removed legacy tab component & duplicate root Jest UI test; now all related openings UI tests live under `packages/web` (Vitest).

## What's Left to Build

-   **Frontend UI for Courses:** While the backend is ready, the UI to display course recommendations on the opening detail page needs to be built.
-   **Advanced Filtering:** The client-side filtering capabilities can be expanded (e.g., filter by win rate, draw rate, etc.).
-   **Design System Tokenization:** Extract accent bar gradient & spacing into CSS variables for theme agility.
-   **Tooltip Abstraction:** Central component for consistent ARIA + styling (currently native title attributes).

## Current Status

-   The project is in a solid state with a robust backend and data pipeline.
-   The core data-heavy features are largely complete on the backend.
-   The main focus is shifting towards building out the frontend UI to expose all the available data and features to the user.

## Known Issues

-   **React 19 / Testing Library Compatibility:** There was a known issue with React 19 and `@testing-library/react`. While component fixes have been implemented, this is an area to watch during future upgrades.
-   **Large Initial Payload:** The `/api/openings/all` endpoint sends a large (4.7MB) JSON file. While this enables fast client-side search, it could be a performance bottleneck on slow connections. Future optimizations might involve a more advanced data-loading strategy.
