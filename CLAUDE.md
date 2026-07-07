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

## Design System

`design-system/` at the repo root is the canonical reference for the Warm
Editorial Dark brand. **Read `design-system/README.md` before any visual work.**
The bundle contains tokens, type, components, preview cards, a React UI kit,
chat transcripts from prior Claude Design sessions, and a `SKILL.md` (invocable
as `/openingbook-design`).

Tokens live in two places that **must stay in sync**:

- `packages/web/src/styles/simplified.css` — runtime source (what production
  imports).
- `design-system/project/colors_and_type.css` — reference + Claude Design
  handoff format.

When updating tokens, update both in the same commit. When adding a new
component or visual surface, update the bundle in lockstep — see the maintenance
protocol in `design-system/README.md`.

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

A monthly GitHub Action (`.github/workflows/video-refresh.yml`) runs the
incremental pipeline, audits before/after, and opens a PR with the metric diff.
It fails fast at guard steps until `tools/data/videos.sqlite` is committed and
the `YOUTUBE_API_KEY` repo secret is set — see `tools/video-pipeline/README.md`
§ Monthly automation.

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

- **Design-system bundle lockstep**: When changing tokens, components, or visual
  surfaces, update `design-system/` in the same PR as the production-code
  change. Tokens in `packages/web/src/styles/simplified.css` and
  `design-system/project/colors_and_type.css` must match. New components: add a
  preview card under `design-system/project/preview/` (and a kit file under
  `ui_kits/web/` if substantial). New Claude Design sessions: drop the
  transcript into `design-system/chats/`.
- **`tools/production/` scripts**: `enrich`, `course:enrich` etc. reference
  `tools/production/` in `package.json`, but this directory may not exist.
  Actual enrichment logic lives in `tools/llm-enrichment/`. Verify before
  running these scripts.
- **CSS Modules migration ongoing**: Legacy global styles still in
  `packages/web/src/styles/simplified.css`. Migrate to `.module.css` when
  touching a component.
- **Lint = code quality, Prettier = formatting**: ESLint configs
  (`packages/api/.eslintrc.js`, `packages/web/.eslintrc.cjs`) enforce
  code-quality rules only. **Do not re-add stylistic rules**
  (`indent`/`quotes`/`semi`/`linebreak-style`) — Prettier (`.prettierrc`) owns
  formatting, and those rules fight it. `packages/api`'s lint script is
  `eslint src/` (backend tests live at the repo root, not
  `packages/api/tests/`).
- **`format:check` false-fails on Windows (CRLF)**: With `core.autocrlf=true`
  and no `.gitattributes`, your working tree is CRLF but `.prettierrc` sets
  `endOfLine: lf`, so `npm run format:check` flags dozens of files locally that
  are **already clean on CI** (Linux/LF). Don't "fix" these with a repo-wide
  `npm run format` — git normalises them to LF on commit, so the diff is empty.
  Trust CI's result over local `format:check` for line-ending noise.
- **Never fetch large payloads on mount**: `/api/openings/all` (24.8 MB) now
  returns a cacheable 410 (client usage removed in TASK011; route retired
  2026-07-06). Use `/api/openings/search-index` (1.6 MB) for client-side search
  data, or `/api/openings/semantic-search` for server-side queries. The opening
  detail page uses the aggregate `/api/openings/page/:fen`. Any new API route
  **must** have a `Cache-Control` entry in `vercel.json` — crawlers index
  12,000+ pages and will amplify unbounded payloads into massive origin transfer
  bills.
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
- **`api/data/` is the single canonical data location**: the API reads
  video-index/courses/popularity data from `api/data/` in every environment (the
  old `packages/api/src/data/` mirror and its copy-after-regenerate step were
  removed 2026-07-06). The pipeline writes `api/data/video-index.json` directly
  — no copy needed.
- **`pipeline:rematch` re-scores from the DB only**: it does NOT re-fetch from
  YouTube, so `view_count`/`thumbnail_url` go stale and — on databases created
  before the `description`/`tags` columns existed — content matches are scored
  from titles alone. Run `node tools/video-pipeline/scripts/backfill-views.js`
  **once before** a rematch to populate views, thumbnails, descriptions and tags
  (~35 API calls for ~1700 videos). Scoring weights live in
  `config/video_matching.json`; channel tiers in `config/youtube_channels.json`
  (single source of truth — do not hardcode channel lists in matcher code).
  After any scorer/data change, verify with
  `node scripts/audit-video-matches.js` (coverage, variation specificity,
  cross-family contamination, ranking ties).
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
- **Never use `animation-fill-mode: both`/`forwards` with `transform`
  keyframes**: a retained transform (even `translateY(0)`) keeps a permanent
  stacking context on the element, so later DOM siblings paint over — and
  click-block — overlays like the search suggestions dropdown. The
  `sectionReveal` entrance animation must use `backwards` (visually identical;
  the end state equals the base state). Regression history: the landing-page
  reveal stagger shipped with `both` and broke the home-page search dropdown
  (fixed 2026-06-11).
- **Never render fabricated data**: if real stats are missing, omit the element
  (or show an explicit "no stats" state) — never synthesise numbers that look
  like real statistics. Regression history: `OpeningCard` invented W/D/L
  percentages with `Math.random()` when rates were absent (fixed 2026-06-11).
- **Memory bank bloat prevention**: `activeContext.md` must stay under **50
  lines** (current task + previous task only). `progress.md` must stay under
  **100 lines** (one-liner per completed task). When updating memory bank: move
  completed task details to `.github/memory-bank/archive.md`, then trim. Never
  append session history to activeContext — replace the current task section.
  Detailed history belongs in git commits and `archive.md`, not in files loaded
  every session.
