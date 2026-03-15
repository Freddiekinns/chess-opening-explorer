# Claude AI Assistant Guide

## Quick Rules (Always Apply)

1. **CSS Modules when touching styles** - Extract component CSS into
   `.module.css` files when modifying styles. Legacy global styles in
   `packages/web/src/styles/simplified.css`. See `reactjs.instructions.md` for
   migration guide & checklist.
2. **TypeScript** for React components
3. **Python** for `tools/analysis/` only
4. **Tests alongside source** - Backend: `tests/`, Frontend:
   `packages/web/src/**/__tests__/`
5. **Commits**: conventional format (`feat`/`fix`/`chore`)
6. **Early returns** over nested conditionals
7. **Named exports** for utilities, default for components
8. **No console.log** in production code
9. **Format with Prettier**: `npm run format` before committing;
   `npm run format:check` to verify
10. **Update activeContext.md** after significant changes
11. **Ask rather than assume** requirements

---

## Quick Start

1. **First Time?** Read [context.md](.github/memory-bank/context.md)
2. **Check Current State** via `activeContext.md` and `progress.md`
3. **Load instructions** only when relevant to your task

## Environment Setup

**Required:**

- Node.js >= 18.0.0
- npm >= 8.0.0

**API Keys (optional for basic development):**

- `YOUTUBE_API_KEY` - Required for video pipeline
- `GOOGLE_AI_API_KEY` - Required for LLM enrichment (Vertex AI / Gemini)
- Copy `.env.example` to `.env` and add keys as needed

## Essential Commands

```bash
# Setup
npm install                    # Install all workspace dependencies
npm run eco:import            # Import ECO opening data

# Development
npm run dev                   # Start API (3010) + Frontend (3000)
npm run dev:web              # Frontend only
npm run dev:api              # API only

# Testing
npm test                      # Backend tests (Jest)
npm run test:frontend        # Frontend tests (Vitest)
npm run test:all             # Full suite
npm run test:watch           # Watch mode

# Data Pipelines
npm run enrich               # LLM enrichment
npm run course:enrich        # Enrich course data
npm run course:discover      # Find popular Lichess studies
npm run course:import        # Import studies into courses.json
npm run pipeline             # Video pipeline (see Data Pipeline Workflows)

# Code Quality
npm run format               # Format all JS/TS/JSON/MD with Prettier
npm run format:check         # Check formatting (CI)

# Build & Deploy
npm run build                # Build all packages
npm run build:vercel         # Prepare data + build for Vercel deployment
```

## Memory Bank

```
.github/memory-bank/
├── context.md        # Project foundation (architecture, tech, patterns)
├── activeContext.md  # Current work focus
└── progress.md       # What works, what's left
```

**Always read first**: `activeContext.md` + `progress.md`

## Instructions (Load As Needed)

| Task                   | File                               |
| ---------------------- | ---------------------------------- |
| **JavaScript/Node.js** | `javascript.instructions.md`       |
| **Python**             | `python.instructions.md`           |
| **React**              | `reactjs.instructions.md`          |
| **Code Quality**       | `code-standards.instructions.md`   |
| **Testing**            | `testing.instructions.md`          |
| **Git/Commits**        | `workflow.instructions.md`         |
| **Project Overview**   | `project-overview.instructions.md` |

## Project Structure

```
chess-opening-explorer/
├── packages/
│   ├── api/          # API logic
│   ├── web/          # React frontend
│   └── shared/       # Shared utilities
├── api/              # Vercel serverless wrappers
├── data/             # JSON data files
├── scripts/          # Utility scripts (Vercel prep, ECO data fixes)
├── tools/            # Data pipelines
├── config/           # Pipeline configuration (youtube_channels.json)
├── tests/            # Backend tests (Jest)
└── .github/
    ├── instructions/ # Coding standards
    └── memory-bank/  # Project context
```

## Data Pipeline Workflows

**LLM Enrichment:**

```bash
npm run enrich               # Enrich openings with AI-generated content
npm run course:enrich        # Enrich course data
npm run course:integrate     # Integrate course data into main dataset
```

**Video Pipeline:**

```bash
npm run pipeline             # Incremental pipeline (RSS discovery, default)
npm run pipeline:full        # Full catalogue rebuild (YouTube API, requires key)
npm run pipeline:rematch     # Re-score existing videos (zero API cost)
```

Legacy standalone steps (`pipeline:complete`, `pipeline:discover`,
`pipeline:prefilter`, `pipeline:enrich`, `pipeline:match`) still work but are
superseded by the unified modes above.

**Course Discovery:**

```bash
npm run course:discover      # Find popular Lichess studies (500+ likes)
npm run course:import        # Import curated studies into courses.json
# See tools/course-discovery/README.md for details
```

**Popularity Stats:**

```bash
python tools/analysis/run_pipeline.py
# Updates Lichess statistics from master games
```

## Workflow

For any task: read `activeContext.md` + `progress.md` first, then load the
relevant instructions from the table above. Update `activeContext.md` when done.

## Gotchas

- **`tools/production/` scripts**: `enrich`, `course:enrich` etc. reference
  `tools/production/` in `package.json`, but this directory may not exist.
  Actual enrichment logic lives in `tools/llm-enrichment/`. Verify before
  running these scripts.
- **CSS Modules migration ongoing**: Legacy global styles still in
  `packages/web/src/styles/simplified.css`. Migrate to `.module.css` when
  touching a component.
- **Never fetch large payloads on mount**: `/api/openings/all` (24.8 MB) was
  removed from all client-side code (TASK011). Use `/api/openings/search-index`
  (1.6 MB) for client-side search data, or `/api/openings/semantic-search` for
  server-side queries. Any new API route **must** have a `Cache-Control` entry
  in `vercel.json` — crawlers index 12,000+ pages and will amplify unbounded
  payloads into massive origin transfer bills.
- **Update docs with code changes**: When changing commands, modes, config, or
  architecture, update all related docs in the same PR: CLAUDE.md, README files,
  `.agent/workflows/`, `.claude/agents/`, `.github/memory-bank/`,
  `.github/instructions/`
- **YouTube channel IDs**: Never guess channel IDs — they must be verified by
  the user or tested via RSS feed
  (`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`)
- **Worktree test noise**: `npm test` picks up `.worktrees/` tests that fail
  with module resolution errors. Use `--testPathIgnorePatterns='\.worktrees'`
  for clean results.
