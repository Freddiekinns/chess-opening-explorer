# Progress: Chess Opening Explorer

## What Works

- **Core Opening Data:** The full database of 12,377+ openings is integrated and served via the API (`/api/openings/all`).
- **Search:** The multi-layered search (Semantic, Fuzzy, Exact) is functional. The backend service provides fast responses (1-5ms).
- **Popularity Stats:** The system successfully processes Lichess game data to calculate and display opening popularity scores.
- **Video Pipeline:** The "Channel-First" data pipeline is complete and operational. It has successfully indexed over 1,000 videos from trusted channels.
- **Course Recommendations:** The backend data and API endpoint (`/api/courses/:fen`) for course recommendations are complete. The initial data for the F03 (King's Pawn Game) ECO code is fully integrated.
- **Unified Architecture:** The monorepo structure with shared packages and the Vercel deployment pattern are implemented and working.
- **Frontend Foundation:** The React/Vite frontend is set up with routing, a basic layout, and the critical single CSS file architecture.
- **Related Openings UI:** Consolidated inline expandable teaser with smooth JS height animation, unified card header pattern, contextual mainline callout (variation view), ECO pill metadata (accessible & de-emphasized), passing test coverage (navigation, structure, UI).
  - Move sequences displayed below opening names to distinguish same-named variations
  - Parallel data fetching eliminates loading delay (fetched alongside main opening)
  - Frontend test consolidation: Removed legacy tab component & duplicate root Jest UI test; now all related openings UI tests live under `packages/web` (Vitest).
- **Practice Mode (Move Trainer):** Interactive practice mode on opening detail page where users can:
  - Play opening moves by dragging OR tapping pieces on the board
  - Receive immediate feedback (correct moves accepted, incorrect rejected)
  - Get hints (amber highlight on piece to move) after 2 failed attempts or manually
  - Toggle between playing as White or Black (board flips accordingly)
  - Hear audio feedback (move sounds, completion chime)
  - See progress counter and completion state
  - **Visual indicators (Lichess-style):** Previous move highlighting, dots for legal moves, rings for captures
  - **Mobile tap-to-move:** Works on real mobile devices (react-chessboard v5.8.6)
  - 15 passing tests covering the full practice flow
- **PGN Opening Identification:** Users can paste PGN games/moves to identify openings:
  - Modal accessible via "Or search by PGN" link on landing page
  - Parses full PGN (headers, comments, variations stripped automatically)
  - Validates moves and generates FEN positions using chess.js
  - Finds deepest matching opening in database
  - Shows exact vs partial match info (when game extends beyond known openings)
  - Direct navigation to opening detail page
  - 36 unit tests + 28 integration tests
- **Personal Opening Explorer:** Complete feature for analysing personal game history:
  - **Multi-platform support:** Chess.com (default) and Lichess
  - **Game filtering:** Rated rapid/blitz/classical only (excludes bullet, daily, variants)
  - **Actionable insights dashboard:**
    - Win rate comparison by color (White vs Black)
    - Best opening identification (highest win rate, 2+ games)
    - Weakest opening identification (needs work, 2+ games)
    - Clickable cards linking directly to opening detail pages
  - **Opening breakdown:** Top 10 openings per color with W/D/L stats
  - **Win-rate visualization:** Green gradient indicator on each row
  - **Performance:** Server-side caching (10 min), client-side session cache
  - **Responsive design:** Adapts from desktop to mobile layouts
  - **Test coverage:** 21 Chess.com service tests, 9 route tests, 132 frontend tests

## What's Left to Build

- **Frontend UI for Courses:** While the backend is ready, the UI to display course recommendations on the opening detail page needs to be built.
- **Advanced Filtering:** The client-side filtering capabilities can be expanded (e.g., filter by win rate, draw rate, etc.).
- **Design System Tokenization:** Extract accent bar gradient & spacing into CSS variables for theme agility.
- **Tooltip Abstraction:** Central component for consistent ARIA + styling (currently native title attributes).

## Current Status

- The project is in a solid state with a robust backend and data pipeline.
- Personal Opening Explorer is complete with multi-platform support and polished UI.
- The core data-heavy features are largely complete on the backend.
- The main focus is shifting towards building out the frontend UI to expose all the available data and features to the user.

## Known Issues

- **React 19 / Testing Library Compatibility:** There was a known issue with React 19 and `@testing-library/react`. While component fixes have been implemented, this is an area to watch during future upgrades.
- **Large Initial Payload:** The `/api/openings/all` endpoint sends a large (4.7MB) JSON file. While this enables fast client-side search, it could be a performance bottleneck on slow connections. Future optimizations might involve a more advanced data-loading strategy.
