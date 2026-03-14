# Project Context: Chess Opening Explorer

## What This Project Is

A web application helping chess players explore, learn, and analyze openings.
Combines opening data, Lichess statistics, LLM-generated content, and curated
YouTube videos.

**Target Users**: Beginner to intermediate players (under 1800) who need
guidance; advanced players for quick reference.

## Core Features

1. **Opening Database** - 12,377+ openings with ECO codes, move sequences,
   variations
2. **Popularity Stats** - Real-time data from Lichess master games
   (win/draw/loss rates)
3. **LLM Content** - AI-generated descriptions, strategic insights, key ideas
4. **Video Integration** - Curated YouTube videos matched to openings
5. **Curated Studies** - 6,100+ Lichess study chapters matched to openings by
   FEN position, sorted by popularity (likes). Two-step pipeline: discover
   popular studies (500+ likes) → import chapters matched to ECO database.
6. **Practice Mode** - Interactive move trainer with feedback and hints
7. **Personal Opening Explorer** - Analyse Chess.com/Lichess game history for
   opening strengths and weaknesses

## Technology Stack

### Frontend

- **Framework**: React 19 + TypeScript, Vite
- **Styling**: Single CSS file (`packages/web/src/styles/simplified.css`)
- **Testing**: Vitest + React Testing Library (in
  `packages/web/src/**/__tests__/`)

### Backend

- **Runtime**: Node.js + Express
- **Data**: JSON files as production database (pre-processed)
- **API**: Thin Vercel serverless wrappers in `api/` importing from
  `packages/api`
- **Testing**: Jest (in root `tests/`)

### Data Pipelines

- **Python**: LLM enrichment, Lichess integration, analysis (`tools/analysis/`)
- **Node.js**: Video discovery pipeline (`tools/video-pipeline/`), Course/study
  import pipeline (`tools/course-discovery/`)
- **External APIs**: Lichess, YouTube Data API, Google Gemini

## Key Architecture Decisions

### AD-003: Single CSS File

All styles in `packages/web/src/styles/simplified.css`. No new CSS files - ever.

### AD-004: Channel-First Video Pipeline

Index videos from trusted channels first, then match to openings. Saves 99%+ API
quota.

### AD-005: Conservative AI Policy

AI content treated with skepticism. URLs from AI almost always discarded (95%+
hallucination rate). Validation scripts verify AI output before committing.

### AD-006: Idempotent Data Processing

All `tools/` scripts can be re-run safely without duplicating data.

### AD-009: Unified Card Header Pattern

Consistent `.card-header` with optional accent bar, ECO pill right-aligned with
tooltip.

### AD-010: JS-Driven Height Animation

Measure `scrollHeight` for expand/collapse instead of CSS max-height. Respect
`prefers-reduced-motion`.

### AD-011: Test Runner Separation

- Backend (Jest): `tests/` directory
- Frontend (Vitest): `packages/web/src/**/__tests__/`

## Project Structure

```
chess-opening-explorer/
├── packages/
│   ├── api/          # API logic and services
│   ├── web/          # React frontend
│   └── shared/       # Shared utilities
├── api/              # Vercel serverless wrappers
├── data/             # JSON data files
├── tools/
│   ├── analysis/         # Python: Lichess stats pipeline
│   ├── course-discovery/ # Node: Lichess study import pipeline
│   ├── llm-enrichment/   # Node: AI content generation
│   └── video-pipeline/   # Node: YouTube video discovery
├── tests/            # Backend tests (Jest)
└── .github/
    ├── instructions/ # Coding standards
    └── memory-bank/  # Project context
```

## Data Flow

```
Lichess API → Python Analysis → popularity-stats.json
YouTube API → Channel-First Pipeline → video-index.json
Gemini API → LLM Enrichment → openings.json (enhanced)
Lichess Study API → Course Discovery Pipeline → courses.json
All JSON → Frontend (static, pre-generated)
```

### AD-016: Server-Side Search & Edge Caching

Search moved from client-side preload to server-side semantic search.
GlobalHeader uses debounced `/api/openings/semantic-search` (zero preload).
OpeningDetailPage uses `/api/openings/search-index` (1.6 MB, 94% smaller than
`/all`). All API routes have `Cache-Control` headers in `vercel.json` for Vercel
CDN edge caching. See TASK011 for full details.

## Known Constraints

- **Lichess API**: Rate limited
- **YouTube API**: Daily quota limits
- **Gemini API**: Token limits and costs
- **Static Data**: Updates require rebuild/redeploy
- **Vercel Hobby Tier**: 10 GB Fast Origin Transfer, 100 GB Fast Data Transfer.
  All API routes must have `Cache-Control` headers. Never fetch large payloads
  on component mount — crawlers will amplify across all 12,000+ pages.
