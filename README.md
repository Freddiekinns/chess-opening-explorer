# Chess Opening Explorer

**Live at [openingbook.xyz](https://openingbook.xyz)**

A chess learning platform for exploring and practising openings. 12,377 openings
with AI-generated strategic content, Lichess statistics, curated YouTube videos,
curated Lichess studies, and an interactive practice mode.

## Features

- **Search**: server-side search with popularity-weighted ranking, backed by a
  lightweight client-side index for instant name matching
- **Practice Mode**: interactive move trainer with hints, feedback, and
  Lichess-style visual indicators
- **Personal Opening Explorer**: analyse your Chess.com/Lichess games — grouped
  by opening family with win/draw/loss breakdowns — to find strengths and
  weaknesses
- **PGN Identification**: paste any PGN to identify the opening
- **AI Content**: strategic analysis and complexity ratings via Google Vertex AI
- **Video Integration**: curated YouTube content from 16 trusted chess channels
- **Curated Studies**: 17,079 Lichess study chapters from 444 curated studies,
  matched to 4,500 positions by FEN and ranked by likes
- **Popularity Stats**: win/draw/loss rates aggregated from the Lichess
  rated-games database (all rated players, not master games)

## Quick Start

```bash
npm install          # install all workspace dependencies
npm run eco:import   # download and import the ECO opening data
npm run dev          # start API (3010) + frontend (3000)
```

- Frontend: http://localhost:3000
- API: http://localhost:3010

Requires Node.js >= 18 and npm >= 8. No environment variables are needed to run
the app locally against the committed data — they're only required for the data
pipelines and live Lichess stats.

## Environment variables

Create a `.env` in the repo root. Every variable is optional; each unlocks a
specific feature.

| Variable                              | Needed for                                           |
| ------------------------------------- | ---------------------------------------------------- |
| `YOUTUBE_API_KEY`                     | Video pipeline (`full` mode and metadata enrichment) |
| `GOOGLE_AI_API_KEY`                   | LLM enrichment via Gemini                            |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Vertex AI service-account credentials                |
| `VERTEX_AI_PROJECT_ID`                | Vertex AI project                                    |
| `VERTEX_AI_LOCATION`                  | Vertex AI region                                     |
| `LICHESS_EXPLORER_TOKEN`              | Live explorer stats via the `/api/explorer` proxy    |

`LICHESS_EXPLORER_TOKEN` is a zero-scope Lichess personal access token. Lichess
has required authentication on the opening explorer since March 2026; without
the token the proxy returns 503 and the Win Rate panel falls back to snapshot
statistics. It must also be set in the Vercel project environment for
production.

## Project Structure

```
chess-opening-explorer/
├── packages/
│   ├── api/              # Express API — business logic, source of truth
│   ├── web/              # React 19 + TypeScript frontend (Vite)
│   └── shared/           # Shared utilities and types
├── api/                  # Vercel serverless wrappers (thin, import packages/api)
├── api/data/             # Canonical generated data consumed by the API
├── config/               # Pipeline configuration (channels, matcher weights)
├── data/                 # Source data files
├── design-system/        # Warm Editorial Dark reference bundle
├── scripts/              # Build, audit and data-maintenance scripts
├── tools/
│   ├── analysis/         # Python: Lichess popularity pipeline
│   ├── course-discovery/ # Node: Lichess study import pipeline
│   ├── llm-enrichment/   # Node: AI content generation
│   └── video-pipeline/   # Node: YouTube video discovery
├── tests/                # Backend tests (Jest) + Playwright e2e
└── .github/memory-bank/  # Project context and current state
```

## Testing

```bash
npm run test:all        # backend + frontend (what pre-push runs)
npm run test:backend    # Jest — 788 tests
npm run test:frontend   # Vitest — 326 tests
npm run test:e2e        # Playwright end-to-end
npm run test:coverage   # backend coverage
```

Jest collects from `tests/**` and `tools/**/tests/**`. `packages/*/tests/` is in
`testPathIgnorePatterns`, so a Jest test placed inside a package silently never
runs — put backend tests in the root `tests/` directory. Frontend tests live
beside their components in `packages/web/src/**/__tests__/`.

Coverage reports: `coverage/lcov-report/index.html` (backend),
`packages/web/coverage/index.html` (frontend).

### Git hooks

Husky installs these on `npm install`:

- **pre-commit** — Prettier formats staged files; ESLint checks staged files in
  `packages/` and blocks the commit on errors
- **pre-push** — type-check, then the full backend and frontend suites (~30s)

## Data Pipelines

Each pipeline has a detailed README in its directory.

### Video pipeline

```bash
npm run pipeline          # incremental: RSS discovery, free, the default
npm run pipeline:full     # full catalogue rebuild via the YouTube API
npm run pipeline:rematch   # re-score existing videos, zero API cost
```

Run `node tools/video-pipeline/scripts/backfill-views.js` before a rematch, or
view counts and thumbnails go stale. Verify any scorer change with
`node scripts/audit-video-matches.js`.

### Course discovery

```bash
npm run course:discover   # find popular Lichess studies (500+ likes)
npm run course:import     # fetch studies into the cache, rebuild courses.json
npm run course:rematch    # rebuild from the cache only — offline, seconds
```

`courses.json` is a full rebuild each run; never hand-edit it. Verify with
`node scripts/audit-study-matches.js`.

### LLM enrichment

```bash
npm run enrich
```

Generates strategic descriptions via Google Vertex AI. Supports batch
processing, dry runs, and resumable runs.

### Popularity stats

```bash
python tools/analysis/run_pipeline.py --incremental
```

Downloads monthly Lichess rated-game dumps and aggregates opening statistics.
Needs substantial free disk — a busy month can approach 50 GB.

## Architecture

**Unified codebase.** Development and production run identical business logic.
The Vercel functions in `api/` are thin wrappers (18–72 lines) that import from
`packages/api`.

**Pre-processed data.** Pipelines generate JSON into `api/data/`, which is the
canonical data location in every environment. Search is served from the API, not
by shipping the dataset to the client.

**Edge caching is load-bearing.** Crawlers index 12,000+ pages, so every route
declares a `Cache-Control` policy — most in `vercel.json`, except
`/api/explorer`, which sets per-band TTLs in the route itself.

**Warm Editorial Dark design system.** CSS Modules for component styles with
design tokens for surfaces, typography, data-viz and accents. Legacy global
styles remain in `packages/web/src/styles/simplified.css` and are migrated
incrementally.

## Documentation

- **[AGENTS.md](AGENTS.md)** — conventions and codebase gotchas. Imported by
  `CLAUDE.md`; scoped rules live in `packages/*/AGENTS.md`.
- **[.github/memory-bank/](.github/memory-bank/)** — architecture
  ([context.md](.github/memory-bank/context.md)), user journeys
  ([user-journeys.md](.github/memory-bank/user-journeys.md)), and current state
  ([activeContext.md](.github/memory-bank/activeContext.md),
  [progress.md](.github/memory-bank/progress.md)).
- **[design-system/](design-system/)** — brand tokens, prototypes and UI kit.

## Tech Stack

**Frontend** — React 19, TypeScript, Vite, CSS Modules, chess.js,
react-chessboard **Backend** — Node.js, Express, JSON data files, deployed as
Vercel functions **Pipelines** — Node.js (YouTube, Lichess studies, Vertex AI),
Python (Lichess statistics), SQLite for the video catalogue **External** —
Google Vertex AI, YouTube Data API, Lichess API

**Data** — 12,377 openings, 1,236 videos across 72.7% of positions, 17,079 study
chapters across 4,500 positions

## License

See [LICENSE](LICENSE).
