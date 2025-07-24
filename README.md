# Chess Trainer: High-Performance Chess Opening Explorer

A web-based tool for chess enthusiasts to learn and explore chess openings, featuring a high-performance searchable collection of over 12,000 openings, interactive chessboards, and a modern React architecture.

## ✨ Key Features

- **Instant Search**: Client-side search provides results in 1-5ms.
- **Interactive UI**: Explore openings on a fully interactive chessboard.
- **Rich Data**: Openings are enhanced with AI-generated analysis, popularity stats, and course recommendations.
- **Quality Video Pipeline**: 60% noise reduction with educational content prioritization.
- **Modern Stack**: Built with React, TypeScript, and a Node.js/Express backend.
- **Monorepo Architecture**: Cleanly structured with `api`, `web`, and `shared` packages.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React 19, TypeScript, Vite, React Router
- **Chess Logic**: `chess.js` and `react-chessboard`
- **AI Enrichment**: Google Cloud Vertex AI SDK
- **Testing**: Jest

## 📂 Project Structure

The project uses a monorepo structure to manage the different parts of the application:

```
/packages/
  /api/     - Backend services (Node.js/Express)
  /shared/  - Shared types/utilities (TypeScript)
  /web/     - Frontend application (React/Vite)
/data/      - Core operational data
  videos.sqlite           - Main database (openings, videos, relationships)
  popularity_stats.json   - Complete opening statistics (12,377 positions)
  opening_popularity_data.json - Top 185 ranked openings
  channel_first_index.json - YouTube video metadata cache
  /eco/                   - ECO classification data with AI analysis
  /course_analysis/       - Course recommendation cache
/public/api/openings/     - Individual opening files for frontend serving
/tools/     - Data processing and utility scripts
  /video-pipeline/ - Modern video matching pipeline (✅ COMPLETE)
  /production/     - Production data processing scripts
  /analysis/       - Data analysis and validation tools
  /utilities/      - General utility scripts
/tests/     - Integration tests
/docs/      - Comprehensive project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm

### Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    ```

2.  **Install dependencies** from the project root:
    ```bash
    npm install
    ```

3.  **Download ECO data**:
    This command populates the `data/eco` directory with the necessary chess opening files.
    ```bash
    npm run eco:import
    ```

4.  **Set up environment variables**:
    Copy the example environment file. This is required for the LLM enrichment features.
    ```bash
    cp .env.example .env
    ```
    Then, edit `.env` and add your Google Cloud credentials.

### Running the Application

Start both the backend and frontend servers concurrently:
```bash
npm run dev
```
-   **Backend API**: `http://localhost:3001`
-   **Frontend App**: `http://localhost:3000`

### Running Tests

Execute the entire test suite:
```bash
npm test
```

## 🗺️ Development Roadmap

The project has a clean, high-performance architecture and is ready for new features. Our current roadmap includes:

-   **✅ F03: Course Recommendation Data Pipeline**: Manually curate and integrate expert course recommendations. **(COMPLETED)**
-   **✅ F04: YouTube Video Data Pipeline**: Automatically fetch and display relevant YouTube videos. **(COMPLETED - Phase 1 & 2)**
-   **📋 F04-Phase3: Static File Generation**: Convert pipeline output to optimized web-ready files **(IN PROGRESS)**
-   **F05: Enhanced Search Capabilities**: Evolve the search to understand natural language and strategic concepts.
-   **F06: Data-Driven Detail Page Content**: Make the opening detail page fully dynamic.

For more details, see the full list of [Product Requirements Documents](docs/).

## 📚 Documentation

-   **[CLAUDE.md](CLAUDE.md)**: The operational framework for the AI agent, detailing TDD workflows and development protocols.
-   **[memory_bank.md](memory_bank.md)**: The project's long-term memory, containing architectural decisions, API contracts, and other critical context.
-   **[Implementation Docs](docs/)**: Detailed technical documentation for completed features.
-   **[Archived PRDs](docs/archive/)**: Historical product requirements for completed features.
