---
description:
  Chess Opening Explorer project architecture, domain knowledge, and key
  patterns
applyTo: '**'
---

# Chess Opening Explorer - Project Overview

## Project Purpose

The Chess Opening Explorer is a comprehensive web application that helps chess
players explore, learn, and analyze chess openings. It combines rich opening
data, popularity statistics from Lichess, LLM-generated educational content, and
curated YouTube videos to provide an immersive learning experience.

## Core Features

### 1. Opening Database

- Comprehensive database of chess openings with ECO codes
- Hierarchical structure showing opening variations and lines
- Move sequences in PGN format
- Opening names and alternative names

### 2. Popularity Statistics

- Real-time popularity data from Lichess master games
- Win/draw/loss statistics for each opening
- Trend analysis over time
- Filtered by player rating levels

### 3. LLM-Enriched Content

- AI-generated opening descriptions and strategic insights
- Key ideas and typical plans for each opening
- Common tactical themes and patterns
- Historical context and famous games

### 4. Video Integration

- Curated YouTube videos matched to specific openings
- Automated video discovery pipeline
- Quality scoring and relevance matching
- Embedded video player integration

### 5. Curated Lichess Studies

- 6,100+ study chapters matched to openings by FEN position
- Two-step pipeline: discover popular studies (500+ likes) → import & match
- Chapters linked to deepest matching ECO position
- Sorted by study popularity (like count)
- Frontend StudiesGallery component on opening detail page

## Architecture Overview

```mermaid
graph TD
    A[Frontend - React/Vite] --> B[Static Data Files]
    B --> C[Opening Database JSON]
    B --> D[Popularity Stats JSON]
    B --> E[Video Index JSON]
    B --> K[Courses JSON]

    F[Data Pipeline - Python] --> B
    G[Video Pipeline - Node.js] --> E
    H[LLM Enrichment - Node.js] --> C
    I[Lichess Analysis - Python] --> D
    J[Course Discovery - Node.js] --> K
```

## Technology Stack

### Frontend

- **Framework**: React 19 + TypeScript, Vite
- **Styling**: CSS Modules + design tokens ("Warm Editorial Dark" system)
- **Deployment**: Vercel
- **Data**: Static JSON files (pre-generated)

### Backend/Pipelines

- **Python**: Data analysis, Lichess integration (`tools/analysis/`)
- **Node.js**: Video discovery (`tools/video-pipeline/`), course discovery
  (`tools/course-discovery/`), LLM enrichment (`tools/llm-enrichment/`)
- **Data Storage**: JSON files in `api/data/` (single canonical location)

### External Services

- **Lichess API**: Game statistics, popularity data, and study content
- **YouTube API**: Video discovery and metadata
- **Google Vertex AI**: LLM content generation

## Key Domain Concepts

### ECO Codes

- **E**ncyclopedia of **C**hess **O**penings classification system
- Format: Letter (A-E) + two digits (00-99)
- Example: E60 = King's Indian Defense
- Hierarchical: E60 → E61 → E62 (increasing specificity)

### Opening Hierarchy

```
Opening Family (e.g., "Sicilian Defense")
  └─ Opening Variation (e.g., "Najdorf Variation")
      └─ Opening Line (e.g., "English Attack")
```

### PGN (Portable Game Notation)

- Standard format for chess moves
- Example: `1. e4 c5 2. Nf3 d6 3. d4 cxd4`
- Used to represent opening move sequences

## Data Flow

### 1. Opening Data Enrichment

```
Base Opening Data → LLM Enrichment → Enhanced JSON → Frontend
```

### 2. Popularity Statistics

```
Lichess API → Python Analysis → Aggregated Stats → Frontend
```

### 3. Video Pipeline

```
RSS Feeds / YouTube API → Discovery → Pre-filter → Enrich → Match → Video Index → Frontend
```

Three modes: `incremental` (RSS, default), `full` (YouTube API catalogue),
`rematch` (re-score only, zero API cost).

### 4. Course Discovery Pipeline

```
Lichess Study Search → Discover Popular (500+ likes) → curated-studies.txt
curated-studies.txt → Fetch PGN → Match FENs to ECO → courses.json → Frontend
```

## Project Structure

```
chess-opening-explorer/
├── .github/
│   ├── instructions/       # AI assistant guidelines
│   └── memory-bank/        # Project context and tasks
├── packages/
│   ├── api/                # API logic and services
│   │   └── src/data/       # JSON data (openings, courses, stats)
│   ├── web/                # React 19 + TypeScript frontend
│   └── shared/             # Shared utilities
├── api/                    # Vercel serverless wrappers
├── data/                   # Additional data files
├── scripts/                # Build and utility scripts
├── tools/
│   ├── analysis/           # Python: Lichess stats pipeline
│   ├── course-discovery/   # Node: Lichess study import pipeline
│   ├── llm-enrichment/     # Node: AI content generation
│   └── video-pipeline/     # Node: YouTube video discovery
├── tests/                  # Backend tests (Jest)
└── config/                 # Pipeline configuration
```

## Workflows

The project uses npm scripts for common tasks:

- `npm run course:discover` - Find popular Lichess studies (500+ likes)
- `npm run course:import` - Import curated studies into courses.json
- `npm run enrich` - Run LLM enrichment for opening descriptions
- `npm run pipeline` - Incremental video pipeline (RSS discovery)
- `npm run pipeline:full` - Full catalogue rebuild (YouTube API)
- `npm run pipeline:rematch` - Re-score existing videos (zero API cost)

## Key Design Decisions

### Static Site Generation

- All data pre-generated at build time
- No runtime database or API calls
- Fast page loads, excellent SEO
- Simple deployment (Vercel)

### JSON Data Storage

- Human-readable and version-controllable
- Easy to inspect and debug
- No database infrastructure needed
- Simple backup and recovery

### Separate Pipelines

- Each data source has dedicated pipeline
- Can run independently
- Clear separation of concerns
- Easy to maintain and extend

### LLM Integration

- Gemini API for content generation
- Batch processing with rate limiting
- State persistence for resumable runs
- Quality validation before committing

## Common Patterns

### Data Pipeline Pattern

1. Fetch/generate raw data
2. Transform and validate
3. Merge with existing data
4. Write to JSON files
5. Commit to version control

### Error Handling

- Graceful degradation (missing data doesn't break UI)
- Comprehensive logging in pipelines
- State persistence for long-running jobs
- Retry logic for API calls

### Performance Optimization

- Lazy loading for large lists
- Image optimization
- Code splitting
- Static generation for speed

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Data Updates**: Run appropriate workflow
3. **Testing**: Manual testing + automated checks
4. **Deployment**: Push to main → Vercel auto-deploys

## Known Constraints

- **Lichess API**: Rate limited, requires respectful usage
- **YouTube API**: Daily quota limits
- **Gemini API**: Token limits and costs
- **Build Time**: Large data files can slow builds
- **Static Data**: Updates require rebuild/redeploy

```

```
