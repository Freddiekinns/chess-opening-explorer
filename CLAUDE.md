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
├── user-journeys.md  # Core user functionality and flows
├── activeContext.md  # Current + previous task only (< 50 lines)
├── progress.md       # One-liner per task + what's left (< 100 lines)
└── archive.md        # Historical session details (never auto-loaded)
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
- **Two `video-index.json` copies**: Pipeline writes to
  `api/data/video-index.json` but the API reads from
  `packages/api/src/data/video-index.json`. After regenerating the index, copy
  it: `cp api/data/video-index.json packages/api/src/data/video-index.json`
- **`pipeline:rematch` loses video metadata**: Rematch re-scores but does NOT
  re-fetch from YouTube. DB `view_count` and `thumbnail_url` will be stale/null.
  Run `node tools/video-pipeline/scripts/backfill-views.js` after rematch to
  restore them (costs ~35 API calls for ~1700 videos).
- **Host-based redirects belong in `vercel.json`, not middleware**: Vercel's
  edge resolves host-level redirects (www↔apex, custom domain redirects)
  _before_ middleware runs, so any `if (url.host === ...)` branch in
  `middleware.ts` is dead code for those hosts. Vercel's built-in www handling
  also defaults to **307 Temporary**, which Google Search Console will not
  consolidate as a canonical signal — causing recurring "Page with redirect"
  validation failures. Configure permanent (308) host redirects via the
  `redirects` array in `vercel.json` with `"permanent": true`.
- **Middleware matcher must exclude `sitemap.xml` & `robots.txt`**: The
  `middleware.ts` matcher uses a broad negative-lookahead pattern
  (`/((?!api/|assets/|...).*)`). Anything not in the exclusion list is routed
  through the Edge function (`return fetch(request)`), including static SEO
  files. When `sitemap.xml`/`robots.txt` are missing from the exclusions, Google
  Search Console reports the sitemap as **"Couldn't fetch" / Type: Unknown**
  because the crawler hits the edge round-trip instead of the static asset. Keep
  both files in the matcher's negative lookahead so they're served statically.
  (Regression history: the 2026-03-29 SEO refactor broadened the matcher and
  dropped these exclusions.)
- **Memory bank bloat prevention**: `activeContext.md` must stay under **50
  lines** (current task + previous task only). `progress.md` must stay under
  **100 lines** (one-liner per completed task). When updating memory bank: move
  completed task details to `.github/memory-bank/archive.md`, then trim. Never
  append session history to activeContext — replace the current task section.
  Detailed history belongs in git commits and `archive.md`, not in files loaded
  every session.
