# Chess Opening Explorer

**Live at [openingbook.xyz](https://openingbook.xyz)**

A chess learning platform for exploring and practising openings: 12,377 opening
positions in 31 families, with AI-written strategic content, win rates from
Lichess, curated YouTube videos and Lichess studies, and a move trainer.

## Features

**Discover** (the landing page)

- **Search**: server-side search with popularity-weighted ranking, backed by a
  small client-side index for instant name matching. Also understands ECO codes,
  move sequences and style words such as "aggressive gambit".
- **Browse**: filter openings by level, style and family, and sort them.
- **Paste a game**: paste any PGN to identify the opening it reached.
- **Repertoire**: star openings to keep a saved list (its own tab on mobile).

**Opening pages**

- **Board and move tree**: step through the main line, with links to the
  opening's parent lines and its most-played continuations.
- **Practice mode**: a move trainer with hints and feedback, played as either
  colour.
- **Win rates**: live statistics by rating band from the Lichess opening
  explorer, falling back to a snapshot from the Lichess rated-games database.
  Both cover all rated players, not master games.
- **Plans**: AI-written descriptions, strategic themes and common plans.
- **Videos and studies**: YouTube videos from 16 trusted channels and Lichess
  study chapters, matched to the position. A page with none of its own shows its
  opening family's best, labelled as such.

**Analyse** (your own games)

- Import your rated games from Chess.com or Lichess and see your results grouped
  by opening and family, as White and as Black, with strengths and weaknesses.
  Two sample reports show the result before you type a username.

## Quick Start

```bash
npm install   # all workspace dependencies, and the git hooks
npm run dev   # API on 3010 + frontend on 3000
```

- Frontend: http://localhost:3000
- API: http://localhost:3010

Requires Node.js 22 or newer (CI runs Node 24). The opening data is committed in
`api/data/`, so no download step is needed, and no environment variables are
needed to run the app locally. They are only required for the data pipelines and
live Lichess stats.

## Environment variables

Create a `.env` in the repo root. Every variable is optional; each unlocks a
specific feature.

| Variable                              | Needed for                                           |
| ------------------------------------- | ---------------------------------------------------- |
| `LICHESS_EXPLORER_TOKEN`              | Live win rates via the `/api/explorer` proxy         |
| `YOUTUBE_API_KEY`                     | Video pipeline (`full` mode and metadata enrichment) |
| `JEV_API_KEY`                         | Video pipeline's relevance filter (see below)        |
| `GOOGLE_AI_API_KEY`                   | LLM enrichment via Gemini                            |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Vertex AI service-account credentials                |
| `VERTEX_AI_PROJECT_ID`                | Vertex AI project                                    |
| `VERTEX_AI_LOCATION`                  | Vertex AI region                                     |

`LICHESS_EXPLORER_TOKEN` is a zero-scope Lichess personal access token. Lichess
has required authentication on the opening explorer since March 2026; without
the token the proxy returns 503 and the win-rate panel falls back to snapshot
statistics. It must also be set in the Vercel project environment for
production.

`JEV_API_KEY` comes from console.typesafe.ai. Without it the video pipeline
still applies cached answers but leaves new videos unfiltered.

## Project Structure

```
chess-opening-explorer/
├── packages/
│   ├── api/              # Express API: business logic, source of truth
│   ├── web/              # React 19 + TypeScript frontend (Vite)
│   └── shared/           # Shared utilities and types
├── api/                  # Vercel serverless wrappers (thin, import packages/api)
├── api/data/             # Canonical generated data consumed by the API
├── middleware.ts         # Vercel edge middleware: pre-renders opening pages
├── config/               # Pipeline configuration (channels, matcher, pins)
├── data/                 # Source data, including the opening families
├── design-system/        # Warm Editorial Dark reference bundle
├── docs/                 # Proposals, reviews, backlog
├── scripts/              # Build, SEO, audit and data-maintenance scripts
├── tools/
│   ├── analysis/         # Python: Lichess popularity pipeline
│   ├── course-discovery/ # Node: Lichess study import pipeline
│   ├── family-taxonomy/  # Node: assigns every position to a family
│   ├── llm-enrichment/   # Node: AI content generation
│   ├── sample-reports/   # Node: the Analyse page's sample reports
│   └── video-pipeline/   # Node: YouTube video discovery and matching
├── tests/                # Backend tests (Jest) + Playwright e2e
└── .github/memory-bank/  # Project context and current state
```

## Testing

```bash
npm run test:all        # backend + frontend: the check that matters
npm run test:backend    # Jest
npm run test:frontend   # Vitest
npm run test:e2e        # Playwright end-to-end
npm run test:coverage   # backend coverage
npm run build           # type errors surface here, not in the test suites
```

Jest collects from `tests/**` and `tools/**/tests/**`. `packages/*/tests/` is in
`testPathIgnorePatterns`, so a Jest test placed inside a package silently never
runs. Put backend tests in the root `tests/` directory. Frontend tests live
beside their components in `packages/web/src/**/__tests__/`.

Coverage reports: `coverage/lcov-report/index.html` (backend),
`packages/web/coverage/index.html` (frontend).

### Git hooks

Husky installs these on `npm install`:

- **pre-commit**: Prettier formats staged files; ESLint checks staged files in
  `packages/` and blocks the commit on errors
- **pre-push**: type-check, then the full backend and frontend suites

## Data Pipelines

Each pipeline has a detailed README in its directory.

### Video pipeline

```bash
npm run pipeline          # incremental: RSS discovery, free, the default
npm run pipeline:full     # full catalogue rebuild via the YouTube API
npm run pipeline:rematch  # re-score existing videos, zero API cost
```

Every mode ends with two steps. First it drops videos that the Jev model
confidently says are not about the page they matched. Then it adds the
hand-verified videos in `config/video_pins.json`. Run
`node tools/video-pipeline/scripts/backfill-views.js` before a rematch, or view
counts and thumbnails go stale. Verify any scorer change with
`node scripts/audit-video-matches.js`.

### Course discovery

```bash
npm run course:discover   # find popular Lichess studies (500+ likes)
npm run course:import     # fetch studies into the cache, rebuild courses.json
npm run course:rematch    # rebuild from the cache only: offline, seconds
```

`courses.json` is a full rebuild each run; never hand-edit it. Verify with
`node scripts/audit-study-matches.js`.

### LLM enrichment

```bash
npm run enrich
```

Generates strategic descriptions with Gemini 2.5 Pro on Vertex AI. Supports
batch processing, dry runs, and resumable runs.

### Popularity stats

```bash
python tools/analysis/run_pipeline.py --incremental
```

Downloads monthly Lichess rated-game dumps and aggregates opening statistics.
Needs substantial free disk: a busy month can approach 50 GB.

### Opening families

```bash
node tools/family-taxonomy/build-family-index.js
```

Re-resolves every position's family from `data/family-overrides.json` and
rewrites the ECO files. Run it after changing a family or a rule, and read
`tools/family-taxonomy/README.md` first: a family also decides which videos a
page shows when it has none of its own.

## Architecture

**Unified codebase.** Development and production run identical business logic.
The Vercel functions in `api/` are thin wrappers that import from
`packages/api`.

**Pre-processed data.** Pipelines generate JSON into `api/data/`, which is the
canonical data location in every environment. Search is served from the API, not
by shipping the dataset to the client.

**Opening pages are pre-rendered at the edge.** `middleware.ts` puts each
opening's title, description, win rates and internal links into the HTML before
React loads, so crawlers see the content without running JavaScript. Sitemaps
and the lookup shards it reads are generated at build time
(`npm run build:vercel`).

**Edge caching is load-bearing.** Crawlers index 12,000+ pages, so every route
declares a `Cache-Control` policy. Most are in `vercel.json`; `/api/explorer`
sets per-band TTLs in the route itself.

**Analytics.** Page views come from Vercel Web Analytics; product events go to
PostHog (EU), from the production host only.

**Warm Editorial Dark design system.** CSS Modules for component styles, with
design tokens for surfaces, typography, data-viz and accents. Production imports
the tokens from `packages/web/src/styles/simplified.css`; `design-system/` is
the reference bundle, and the two are kept in sync.

## Documentation

- **[AGENTS.md](AGENTS.md)**: conventions and codebase gotchas. Imported by
  `CLAUDE.md`; scoped rules live in `packages/*/AGENTS.md`, and the deeper
  subsystems have skills in `.claude/skills/`.
- **[REVIEW.md](REVIEW.md)**: what a code review here looks for.
- **[.github/memory-bank/](.github/memory-bank/)**: architecture
  ([context.md](.github/memory-bank/context.md)), user journeys
  ([user-journeys.md](.github/memory-bank/user-journeys.md)), and current state
  ([activeContext.md](.github/memory-bank/activeContext.md),
  [progress.md](.github/memory-bank/progress.md)).
- **[docs/](docs/)**: proposals, reviews and the [backlog](docs/backlog.md).
- **[design-system/](design-system/)**: brand tokens, prototypes and UI kit.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, CSS Modules,
  chess.js, react-chessboard
- **Backend**: Node.js, Express 5, Fuse.js, JSON data files; deployed as Vercel
  functions behind edge middleware
- **Pipelines**: Node.js (YouTube Data API, Lichess, Gemini on Vertex AI, Jev),
  Python (Lichess statistics), SQLite for the video catalogue
- **Analytics**: Vercel Web Analytics and Speed Insights, PostHog

**Data**: 12,377 openings in 31 families; 1,452 videos across 68% of positions;
17,079 study chapters from 444 studies across 4,500 positions.

## License

See [LICENSE](LICENSE).
