# Project Context: Chess Opening Explorer

## What This Project Is

A web application helping chess players explore, learn, and analyze openings.
Combines opening data, Lichess statistics, LLM-generated content, and curated
YouTube videos.

**Target Users**: Beginner to intermediate players (under 1800) who need
guidance; advanced players for quick reference.

## Core Features

1. **Opening Database** - 12,377 openings with ECO codes, move sequences,
   variations
2. **Popularity Stats** - Win/draw/loss rates from the Lichess rated-games
   database (all rated players, not master games)
3. **LLM Content** - AI-generated descriptions, strategic insights, key ideas
4. **Video Integration** - Curated YouTube videos matched to openings
5. **Curated Studies** - 17,079 study chapters from 444 curated Lichess studies,
   matched to 4,500 positions by FEN and sorted by likes. Two-step pipeline:
   discover popular studies (500+ likes) → import chapters matched to the ECO
   database.
6. **Practice Mode** - Interactive move trainer with feedback and hints
7. **Personal Opening Explorer** - Analyse Chess.com/Lichess game history for
   opening strengths and weaknesses

## Technology Stack

### Frontend

- **Framework**: React 19 + TypeScript, Vite
- **Styling**: CSS Modules + design tokens (legacy global styles in
  `simplified.css`, migrating to `.module.css`)
- **Testing**: Vitest + React Testing Library (in
  `packages/web/src/**/__tests__/`)

### Backend

- **Runtime**: Node.js + Express
- **Data**: JSON files as production database (pre-processed)
- **API**: Thin Vercel serverless wrappers in `api/` importing from
  `packages/api`
- **Testing**: Jest (root `tests/` and `tools/**/tests/`)

### Data Pipelines

- **Python**: Lichess popularity analysis only (`tools/analysis/`)
- **Node.js**: Video discovery (`tools/video-pipeline/`), study import
  (`tools/course-discovery/`), LLM enrichment (`tools/llm-enrichment/`)
- **External APIs**: Lichess, YouTube Data API, Google Gemini

## Key Architecture Decisions

### AD-003: CSS Modules + Design Tokens

Component styles use CSS Modules (`.module.css`). Legacy global styles remain in
`packages/web/src/styles/simplified.css` and are migrated incrementally. A "Warm
Editorial Dark" design system defines all visual tokens:

- **Surfaces**: `--surface-base` (#1a1816) → `--surface-raised` (#232120) →
  `--surface-elevated` (#2c2a27) → `--surface-overlay` (#363330)
- **Typography**: Bricolage Grotesque (headlines), DM Sans (body), monospace for
  data. Sizes from `--text-2xs` (10px) to `--text-3xl` (30px).
- **Data viz**: Chess-thematic result colours — amber `--color-result-black`
  (#c08840), warm grey `--color-result-draw` (#5a554e), cream
  `--color-result-white` (#d4cfc7)
- **Accent**: `--color-brand-orange` (#e85d04) with opacity scale `--accent-a6`
  through `--accent-a50` for subtle tints
- **Borders/shadows**: `--border-subtle`, `--border-default`, `--border-hover`;
  `--shadow-sm` through `--shadow-lg`

### AD-004: Unified Video Pipeline

Single pipeline with three modes: incremental (RSS feeds, free), full (YouTube
API catalogue rebuild), and rematch (re-score existing, zero API cost). 16
trusted channels configured in `config/youtube_channels.json`. RSS discovery
parallelized with `Promise.allSettled`. Scorer uses channel tiers (premium +40,
good +20, entertainment -30) and targeted player-vs-player penalty.
Anti-overindexing: 2-word alias minimum, cross-opening title check,
sub-variation penalty, minMatchScore=60. `api/data/video-index.json` is the
single canonical copy (the `packages/api/src/data/` mirror was removed
2026-07-06); the pipeline writes it directly — no copy step. Rematch loses view
counts/thumbnails; run `backfill-views.js` after.

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

- Backend (Jest): root `tests/` plus `tools/**/tests/`. `packages/*/tests/` is
  in `testPathIgnorePatterns` — tests placed there never run.
- Frontend (Vitest): `packages/web/src/**/__tests__/`

### AD-012: Mobile Layout Branch (Opening Detail)

At ≤767px `OpeningDetailPage` renders a distinct mobile tree (design 2a "one
data surface") via `useIsMobile()` (`hooks/useMediaQuery.ts`, matchMedia with a
safe desktop default where unavailable). Mobile components live in
`components/detail/mobile/`; shared move-list rules in `lib/openingBook.ts` so
mobile and desktop render from one source. Data hooks stay page-level and are
shared by both trees — never duplicate fetches per layout.

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
    └── memory-bank/  # Project context
```

## Data Flow

```
Lichess API → Python Analysis → popularity-stats.json
YouTube RSS/API → Video Pipeline → video-index.json
Gemini API → LLM Enrichment → openings.json (enhanced)
Lichess Study API → Course Discovery Pipeline → courses.json
All JSON → Frontend (static, pre-generated)
```

### AD-016: Server-Side Search & Edge Caching

All search is server-side. Every API route declares edge caching — most via
`vercel.json`, except `/api/explorer`, which sets its own per-band headers in
the route (config headers would override and clobber them).

## Known Constraints

Lichess (rate limited; explorer needs a token), YouTube (daily quota), Gemini
(token cost), static data (updates need a rebuild), and the Vercel Hobby tier
(10 GB fast origin transfer) — see the caching rules in `AGENTS.md`.
