# [TASK004] - Course Discovery & Workflow

**Status:** In Progress
**Added:** 2026-02-10
**Updated:** 2026-02-10

## Context

Users viewing an opening want to find quality study materials. The backend API for serving courses is already built (`course-service.js`, routes, tests), but `courses.json` has only 1 entry. We need a pipeline to populate it with real data, plus search links for everything else.

**Constraints:**
- LLM curation: too expensive, too many errors - ruled out
- Lichess study search: no API exists; Lichess explicitly advises against scraping
- Chessable scraping: would violate ToS
- Lichess **does** have a legitimate API: `GET /api/study/by/{username}` (all public studies by user)

## Approach: Three Layers

1. **Known-author pipeline** - Fetch studies from curated Lichess educators via API, parse PGN, match to openings by FEN
2. **Manual curation** - Add specific courses you know are good (Chessly, Naroditsky Jobava London, Alapin from Chessable, etc.) directly to `courses.json`. Build over time.
3. **Search links** - Generate outbound URLs for Lichess + Chessable at runtime (no storage, always available)

---

## What Already Exists

| Component | Status | File |
|-----------|--------|------|
| Course service | **Complete** | `packages/api/src/services/course-service.js` |
| API routes | **Complete** | `packages/api/src/routes/courses.routes.js` |
| Vercel wrapper | **Complete** | `api/courses.js` |
| Server mount | **Complete** | `packages/api/src/server.js` |
| Unit + integration tests | **Complete** | `tests/unit/course-service.test.js`, `tests/unit/course-routes.test.js`, `tests/integration/course-pipeline.test.js` |
| Shared types | **Complete** | `packages/shared/src/types/chess.ts` (`CourseRecommendation`) |
| Schema | **Complete** | `packages/shared/src/schemas/opening.ts` |
| LLM curation prompt | **Complete** (unused) | `prompts/course_analysis_prompt.md` |
| Data file | **1 entry only** | `packages/api/src/data/courses.json` |

---

## Backend Implementation Plan

### 1. Known-Author Pipeline

**How it works:**
1. Load a config of known Lichess educator usernames
2. For each author, call `GET /api/study/by/{username}` (legitimate documented API, returns NDJSON)
3. For each study, call `GET /api/study/{studyId}.pgn` to get the PGN
4. Use `chess.js` (already a dep in `packages/shared`) to replay moves, generating FEN at each position
5. Match generated FENs against opening database (ECO files in `api/data/eco/ecoA-E.json`, keyed by FEN - simple lookup)
6. Store matched studies in `courses.json` keyed by FEN

**Files to create:**

| File | Purpose |
|------|---------|
| `tools/course-discovery/index.js` | Pipeline orchestrator |
| `tools/course-discovery/lib/lichess-fetcher.js` | Fetch studies + PGN via Lichess API |
| `tools/course-discovery/lib/pgn-matcher.js` | Parse PGN, generate FENs, match to openings |
| `tools/course-discovery/lib/course-merger.js` | Merge discoveries into existing `courses.json` (preserves manual entries) |
| `tools/course-discovery/config/authors.json` | Seed list of known Lichess educators |

**Technical considerations:**

- **NDJSON parsing**: `/api/study/by/{username}` returns newline-delimited JSON, not standard JSON. Need line-by-line parsing.
- **PGN complexity**: Studies have multiple chapters with variations/annotations. chess.js `load_pgn()` handles the mainline; variations in `(...)` need stripping or iterative parsing per chapter.
- **Study filtering**: Not all studies are opening-related (could be endgames, puzzles, game analyses). Filter by: study name matching known opening terms, or simply rely on FEN matching - if a study's positions don't match any opening, it gets dropped.
- **Rate limiting**: Lichess requires sequential requests. Use ~1 req/second with 60s backoff on 429.
- **Simplified schema for auto-discovered entries**: Lichess studies don't have `quality_score`, `publication_year`, etc. Auto-discovered entries use a reduced set: `course_title`, `author`, `platform: "Lichess"`, `source_url`, `anchor_fens`. Manual entries keep the full schema.

**Patterns to reuse:**

| Pattern | Source |
|---------|--------|
| StateManager (checkpoint/resume) | `tools/llm-enrichment/enrich_openings_llm.js` |
| Logger class | `tools/llm-enrichment/enrich_openings_llm.js` |
| CLI args (yargs) | `tools/llm-enrichment/enrich_openings_llm.js` |
| ECO file loading | `tools/video-pipeline/index.js:65-77` |
| Step-based pipeline | `tools/video-pipeline/index.js` |
| chess.js for PGN/FEN | `packages/shared` (already a dependency) |

### 2. Search Link Fallback

**Modify `packages/api/src/services/course-service.js`:**
- Add `getSearchLinks(openingName)` returning `{ lichess, chessable }` URLs

**Modify `packages/api/src/routes/courses.routes.js`:**
- Accept optional `openingName` query param on `/:fen`
- Include `searchLinks` in response alongside `courses` array
- Every opening gets useful links even with no curated courses

### 3. Manual Curation

No tooling needed. Add entries directly to `courses.json` following the existing schema. The pipeline merger preserves manual entries. Initial curations:
- Chessly courses (user to identify)
- Naroditsky Jobava London (Chessable)
- Alapin (Chessable)
- Build over time as good resources are found

## Backend Verification

1. `node tools/course-discovery/index.js --dryRun --limit=1` - test with 1 author
2. Inspect generated `courses.json` - check FEN keys, study data, manual entries preserved
3. `npm start` then `curl http://localhost:3000/api/courses/stats` - verify counts
4. `curl "http://localhost:3000/api/courses/<fen>?openingName=French+Defense"` - verify courses + search links
5. `npx jest tests/unit/course-service.test.js tests/unit/course-routes.test.js` - existing tests pass

## Progress Tracking

**Overall Status:** ~30% Complete (API infrastructure done, pipeline + UI pending)

| Area | Status | Notes |
|------|--------|-------|
| Infrastructure: Courses API | **Complete** | Service, routes, tests, Vercel wrapper all done |
| Known-Author Pipeline | **Pending** | `tools/course-discovery/` to be created |
| Search Link Fallback | **Pending** | Add to course-service + routes |
| Manual Curation | **Pending** | Add known good courses to `courses.json` |
| UI: Courses Tab | **Pending** | Deferred to separate frontend task |

---

## Frontend Implementation Plan (Deferred - Separate Activity)

### Approach

Add a COURSES tab to `OpeningDetailPage.tsx` following the VIDEOS tab pattern (conditional, only shown when data exists).

### Files to create

| File | Purpose | Pattern to follow |
|------|---------|-------------------|
| `packages/web/src/components/detail/CourseGallery.tsx` | Course cards + search links | `VideoGallery.tsx` |
| `packages/web/src/components/detail/CourseGallery.module.css` | Styles | `CommonPlans.module.css` |
| `packages/web/src/components/detail/__tests__/course-gallery.test.tsx` | Tests | Existing detail tests |

### Changes to OpeningDetailPage.tsx

1. Add `COURSES` to `TAB_TYPES`
2. Add courses state + `loadCourses()` fetch to `/api/courses/:fen?openingName=...`
3. Add conditional COURSES tab button (like VIDEOS - only shows when data exists)
4. Add tab content panel with `<CourseGallery>` component

### Component displays

- **Curated course cards**: title, author, platform badge, link (opens in new tab)
- **Search links section**: "Search Lichess Studies" + "Search Chessable" buttons (always visible)
- **Empty state**: Just search links when no curated courses exist

### Frontend Verification

1. Navigate to opening with curated data - COURSES tab appears with cards + search links
2. Navigate to opening without curated data - COURSES tab shows search links only (or tab hidden, search links in overview)
3. Responsive layout stacks properly on mobile
4. `npm run test:web` passes

---

## Key Files Reference

| File | Role |
|------|------|
| `packages/api/src/services/course-service.js` | Service to modify (add search links) |
| `packages/api/src/routes/courses.routes.js` | Routes to modify (add openingName param) |
| `packages/api/src/data/courses.json` | Data file to populate |
| `api/data/eco/ecoA-E.json` | Opening database for FEN matching |
| `tools/llm-enrichment/enrich_openings_llm.js` | Pipeline pattern (StateManager, Logger, yargs) |
| `tools/video-pipeline/index.js` | Pipeline structure pattern |
| `packages/shared/src/types/chess.ts` | Shared types (CourseRecommendation) |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Frontend integration point |
| `packages/web/src/components/detail/VideoGallery.tsx` | Component pattern for CourseGallery |

## Acceptance Criteria

1. Pipeline fetches studies from known Lichess authors via API (ToS compliant)
2. Studies matched to openings by FEN and stored in `courses.json`
3. Manual curation entries preserved when pipeline re-runs
4. API returns courses + search links for any opening
5. Existing tests continue to pass
6. *(Frontend, deferred)* COURSES tab displays on opening detail page
