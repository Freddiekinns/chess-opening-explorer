# [TASK004] - Course Discovery & Workflow

**Status:** Backend Complete (Frontend Deferred) **Added:** 2026-02-10
**Updated:** 2026-02-10

## Context

Users viewing an opening want to find quality study materials. The backend API
for serving courses is already built (`course-service.js`, routes, tests), but
`courses.json` has only 1 entry. We need a pipeline to populate it with real
data, plus search links for everything else.

**Constraints:**

- LLM curation: too expensive, too many errors - ruled out
- Lichess study search: no API exists; Lichess explicitly advises against
  scraping
- Chessable scraping: would violate ToS
- Lichess **does** have a legitimate API: `GET /api/study/by/{username}` (all
  public studies by user)

## Approach: Three Layers

1. **Known-author pipeline** - Fetch studies from curated Lichess educators via
   API, parse PGN, match to openings by FEN - a starter list can be found
   https://lichess.org/@/CyberShredder/blog/cool-lichess-studies-list/UOPFWocV
   and https://lichess.org/study/staff-picks
2. **Manual curation** - Add specific courses you know are good (Chessly,
   Naroditsky Jobava London, Alapin from Chessable, etc.) directly to
   `courses.json`. Build over time.
3. **Search links** - Generate outbound URLs for Lichess + Chessable at runtime
   (no storage, always available)

---

## What Already Exists

| Component                | Status                | File                                                                                                                 |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Course service           | **Complete**          | `packages/api/src/services/course-service.js`                                                                        |
| API routes               | **Complete**          | `packages/api/src/routes/courses.routes.js`                                                                          |
| Vercel wrapper           | **Complete**          | `api/courses.js`                                                                                                     |
| Server mount             | **Complete**          | `packages/api/src/server.js`                                                                                         |
| Unit + integration tests | **Complete**          | `tests/unit/course-service.test.js`, `tests/unit/course-routes.test.js`, `tests/integration/course-pipeline.test.js` |
| Shared types             | **Complete**          | `packages/shared/src/types/chess.ts` (`CourseRecommendation`)                                                        |
| Schema                   | **Complete**          | `packages/shared/src/schemas/opening.ts`                                                                             |
| LLM curation prompt      | **Complete** (unused) | `prompts/course_analysis_prompt.md`                                                                                  |
| Data file                | **1 entry only**      | `packages/api/src/data/courses.json`                                                                                 |

---

## Backend Implementation Plan

### 1. Known-Author Pipeline

**How it works:**

1. Load a config of known Lichess educator usernames
2. For each author, call `GET /api/study/by/{username}` (legitimate documented
   API, returns NDJSON)
3. For each study, call `GET /api/study/{studyId}.pgn` to get the PGN
4. Use `chess.js` (already a dep in `packages/shared`) to replay moves,
   generating FEN at each position
5. Match generated FENs against opening database (ECO files in
   `api/data/eco/ecoA-E.json`, keyed by FEN - simple lookup)
6. Store matched studies in `courses.json` keyed by FEN

**Files to create:**

| File                                            | Purpose                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `tools/course-discovery/index.js`               | Pipeline orchestrator                                                     |
| `tools/course-discovery/lib/lichess-fetcher.js` | Fetch studies + PGN via Lichess API                                       |
| `tools/course-discovery/lib/pgn-matcher.js`     | Parse PGN, generate FENs, match to openings                               |
| `tools/course-discovery/lib/course-merger.js`   | Merge discoveries into existing `courses.json` (preserves manual entries) |
| `tools/course-discovery/config/authors.json`    | Seed list of known Lichess educators                                      |

**Technical considerations:**

- **NDJSON parsing**: `/api/study/by/{username}` returns newline-delimited JSON,
  not standard JSON. Need line-by-line parsing.
- **PGN complexity**: Studies have multiple chapters with
  variations/annotations. chess.js `load_pgn()` handles the mainline; variations
  in `(...)` need stripping or iterative parsing per chapter.
- **Study filtering**: Not all studies are opening-related (could be endgames,
  puzzles, game analyses). Filter by: study name matching known opening terms,
  or simply rely on FEN matching - if a study's positions don't match any
  opening, it gets dropped.
- **Rate limiting**: Lichess requires sequential requests. Use ~1 req/second
  with 60s backoff on 429.
- **Simplified schema for auto-discovered entries**: Lichess studies don't have
  `quality_score`, `publication_year`, etc. Auto-discovered entries use a
  reduced set: `course_title`, `author`, `platform: "Lichess"`, `source_url`,
  `anchor_fens`. Manual entries keep the full schema.

**Patterns to reuse:**

| Pattern                          | Source                                        |
| -------------------------------- | --------------------------------------------- |
| StateManager (checkpoint/resume) | `tools/llm-enrichment/enrich_openings_llm.js` |
| Logger class                     | `tools/llm-enrichment/enrich_openings_llm.js` |
| CLI args (yargs)                 | `tools/llm-enrichment/enrich_openings_llm.js` |
| ECO file loading                 | `tools/video-pipeline/index.js:65-77`         |
| Step-based pipeline              | `tools/video-pipeline/index.js`               |
| chess.js for PGN/FEN             | `packages/shared` (already a dependency)      |

### 2. Search Link Fallback

**Modify `packages/api/src/services/course-service.js`:**

- Add `getSearchLinks(openingName)` returning `{ lichess, chessable }` URLs

**Modify `packages/api/src/routes/courses.routes.js`:**

- Accept optional `openingName` query param on `/:fen`
- Include `searchLinks` in response alongside `courses` array
- Every opening gets useful links even with no curated courses

### 3. Manual Curation

No tooling needed. Add entries directly to `courses.json` following the existing
schema. The pipeline merger preserves manual entries. Initial curations:

- Chessly courses (user to identify)
- Naroditsky Jobava London (Chessable)
- Alapin (Chessable)
- Build over time as good resources are found

## Backend Verification

1. `node tools/course-discovery/index.js --dryRun --limit=1` - test with 1
   author
2. Inspect generated `courses.json` - check FEN keys, study data, manual entries
   preserved
3. `npm start` then `curl http://localhost:3000/api/courses/stats` - verify
   counts
4. `curl "http://localhost:3000/api/courses/<fen>?openingName=French+Defense"` -
   verify courses + search links
5. `npx jest tests/unit/course-service.test.js tests/unit/course-routes.test.js` -
   existing tests pass

## Progress Tracking

**Overall Status:** ~80% Complete (Backend done, frontend deferred)

| Area                        | Status       | Notes                                                             |
| --------------------------- | ------------ | ----------------------------------------------------------------- |
| Infrastructure: Courses API | **Complete** | Service, routes, tests, Vercel wrapper all done                   |
| Known-Author Pipeline       | **Complete** | `tools/course-discovery/` with 57 unit tests                      |
| Search Link Fallback        | **Complete** | `getSearchLinks()` in course-service, `?openingName=` in routes   |
| Manual Curation             | **Complete** | Pipeline preserves manual entries; add to `courses.json` directly |
| UI: Courses Tab             | **Pending**  | Deferred to separate frontend task                                |

---

## Frontend Implementation Plan (Deferred - Separate Activity)

### Approach

Add a COURSES tab to `OpeningDetailPage.tsx` following the VIDEOS tab pattern
(conditional, only shown when data exists).

### Files to create

| File                                                                   | Purpose                     | Pattern to follow        |
| ---------------------------------------------------------------------- | --------------------------- | ------------------------ |
| `packages/web/src/components/detail/CourseGallery.tsx`                 | Course cards + search links | `VideoGallery.tsx`       |
| `packages/web/src/components/detail/CourseGallery.module.css`          | Styles                      | `CommonPlans.module.css` |
| `packages/web/src/components/detail/__tests__/course-gallery.test.tsx` | Tests                       | Existing detail tests    |

### Changes to OpeningDetailPage.tsx

1. Add `COURSES` to `TAB_TYPES`
2. Add courses state + `loadCourses()` fetch to
   `/api/courses/:fen?openingName=...`
3. Add conditional COURSES tab button (like VIDEOS - only shows when data
   exists)
4. Add tab content panel with `<CourseGallery>` component

### Component displays

- **Curated course cards**: title, author, platform badge, link (opens in new
  tab)
- **Search links section**: "Search Lichess Studies" + "Search Chessable"
  buttons (always visible)
- **Empty state**: Just search links when no curated courses exist

### Frontend Verification

1. Navigate to opening with curated data - COURSES tab appears with cards +
   search links
2. Navigate to opening without curated data - COURSES tab shows search links
   only (or tab hidden, search links in overview)
3. Responsive layout stacks properly on mobile
4. `npm run test:web` passes

---

## Key Files Reference

| File                                                  | Role                                           |
| ----------------------------------------------------- | ---------------------------------------------- |
| `packages/api/src/services/course-service.js`         | Service to modify (add search links)           |
| `packages/api/src/routes/courses.routes.js`           | Routes to modify (add openingName param)       |
| `packages/api/src/data/courses.json`                  | Data file to populate                          |
| `api/data/eco/ecoA-E.json`                            | Opening database for FEN matching              |
| `tools/llm-enrichment/enrich_openings_llm.js`         | Pipeline pattern (StateManager, Logger, yargs) |
| `tools/video-pipeline/index.js`                       | Pipeline structure pattern                     |
| `packages/shared/src/types/chess.ts`                  | Shared types (CourseRecommendation)            |
| `packages/web/src/pages/OpeningDetailPage.tsx`        | Frontend integration point                     |
| `packages/web/src/components/detail/VideoGallery.tsx` | Component pattern for CourseGallery            |

## Acceptance Criteria

1. Pipeline fetches studies from known Lichess authors via API (ToS compliant)
2. Studies matched to openings by FEN and stored in `courses.json`
3. Manual curation entries preserved when pipeline re-runs
4. API returns courses + search links for any opening
5. Existing tests continue to pass
6. _(Frontend, deferred)_ COURSES tab displays on opening detail page

Implementation plan: TASK004: Course Discovery Backend Implementation Context
Users viewing an opening want to find quality study materials. The API
infrastructure (service, routes, tests) is built but courses.json has only 1
entry. We need a pipeline to populate it from Lichess educator studies, plus
search link fallbacks for every opening.

User decisions:

Chapter-level linking (link to specific chapters, not whole studies) Author API
only (blog post identifies authors, but only fetch via Lichess API) Drop quality
scores for auto-discovered entries (simplified schema) Validation Findings Area
Status Notes chess.js Installed in packages/shared/node_modules/ (v1.4.0) Should
be hoisted to root by npm workspaces — verify at build time pgn-utils.ts Solid,
tested, 6 functions ESM module — can't require() from CJS tools. Use as
reference, write CJS equivalents ECO data Valid, FEN-keyed objects in
api/data/eco/ecoA-E.json ~4000+ positions, O(1) lookup Shared package ESM
("type": "module") Root is CJS ("type": "commonjs"). No CJS export from shared.
Node.js v24.3.0 Native fetch() available, no polyfills needed Root scripts
Several point to non-existent tools/production/ Not blocking for us — our
scripts go in tools/course-discovery/ yargs Root devDependency (v18) Available
for CLI arg parsing ESM/CJS decision: The pipeline will be CJS (matching other
tools). We'll write the PGN parsing functions directly in pgn-matcher.js using
chess.js, referencing the logic in pgn-utils.ts as a proven implementation. This
avoids ESM/CJS interop issues and keeps the tool self-contained.

Part 1: Known-Author Pipeline New files
tools/course-discovery/config/authors.json Seed list of known Lichess educators
(sourced from CyberShredder blog + staff picks):

{ "authors": [ { "username": "DrNykterstein", "note": "Magnus Carlsen" }, {
"username": "Fins", "note": "John Bartholomew" }, { "username": "Msb2", "note":
"Mateusz Bartel" }, { "username": "Chessexplained", "note": "Christof Sielecki"
} ] } Start small (4-6 authors), expand over time. We'll verify these usernames
exist during first dry-run.

tools/course-discovery/lib/lichess-fetcher.js Functions:

fetchStudyList(username) — GET https://lichess.org/api/study/by/{username} with
Accept: application/x-ndjson. Parse NDJSON: split by newlines, JSON.parse each
line. Returns [{id, name, createdAt, updatedAt}] fetchStudyPGN(studyId) — GET
https://lichess.org/api/study/{studyId}.pgn?comments=false&variations=false&clocks=false.
Returns raw PGN string containing all chapters sleep(ms) — Promise-based delay
for rate limiting rateLimitedFetch(url, options) — Wrapper: 1 req/sec minimum
delay, 60s backoff on 429 response, 3 retries with exponential backoff Uses
native fetch (Node 18+). No external HTTP library needed.

tools/course-discovery/lib/pgn-matcher.js Functions:

splitPGNIntoChapters(pgnText) — Split multi-chapter PGN by [Event " headers.
Extract chapter metadata from PGN headers: chapter name from [Event], chapter
URL from [Site] (format: https://lichess.org/study/{studyId}/{chapterId}).
Returns [{ chapterId, chapterName, studyId, pgn }] generateFENsFromPGN(pgnText)
— Port of pgn-utils.ts:124-162. Strip headers/comments/variations, regex-parse
moves, step through with new Chess(), collect FEN at each position
matchFENsToOpenings(fens, ecoIndex) — Check each FEN against ECO data. Return
the deepest match (furthest into the line). Logic from pgn-utils.ts:197-248,
simplified: normalize FEN (first 4 parts, strip move counters), lookup in
ecoIndex loadECOIndex() — Load api/data/eco/ecoA.json through ecoE.json, merge
into single FEN-keyed object. Normalize FEN keys (first 4 parts) for consistent
matching FEN normalisation: ECO data uses full FEN (e.g. rnb... w KQkq - 0 5).
For matching, strip halfmove + fullmove counters (use first 4 space-separated
parts: position, turn, castling, en passant). This matches the approach in
pgn-utils.ts:189-192.

Matching algorithm (deepest match):

Take a chapter's PGN mainline (e.g. 1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5...)
Replay moves one by one with chess.js, collecting FEN after each move Check each
FEN (normalised) against the ECO index (~4000 positions) Return the deepest
match — the FEN furthest into the line that still matches a known opening
Example: A chapter going 20 moves into the French Winawer → matched to the
Winawer FEN at move ~6, not to the broader "French Defense" at move 2 If no FEN
matches any opening → chapter is dropped (not an opening study) Each chapter is
matched independently, so one study can link to multiple openings
tools/course-discovery/lib/course-merger.js Functions:

loadExistingCourses(filePath) — Read and parse courses.json. Return {} if file
missing mergeDiscoveries(existing, discovered) — Merge algorithm: Clone existing
data For each FEN key: filter out entries where auto_discovered === true (clear
old auto entries) Add new auto-discovered entries from discovered Result: manual
entries untouched, auto entries refreshed writeCourses(filePath, merged) —
JSON.stringify(merged, null, 2) + write Key guarantee: Entries without
auto_discovered: true (manual curation) are never modified or removed.

tools/course-discovery/index.js Pipeline orchestrator using step-based pattern
from video-pipeline/index.js.

Reusable classes (copy Logger + StateManager from enrich_openings_llm.js —
they're self-contained, ~100 lines total):

Logger — verbose/quiet modes, file logging StateManager — tracks
processedAuthors[] for resume capability Pipeline steps:

Parse CLI args (yargs) + load config/authors.json Load ECO index (merge
ecoA-E.json) Load existing courses.json For each author (respecting --limit,
--author, --resume): Fetch study list via lichess-fetcher.fetchStudyList() For
each study: Fetch PGN via lichess-fetcher.fetchStudyPGN() Split into chapters
via pgn-matcher.splitPGNIntoChapters() For each chapter: generate FENs, match to
openings Collect matched chapters as course entries Mark author as processed in
state Merge discoveries via course-merger.mergeDiscoveries() Write result
(unless --dryRun) Print summary: authors processed, studies fetched, chapters
matched, FENs populated CLI args (yargs, root devDependency):

--dryRun Print what would be written, don't modify files --limit <n> Max authors
to process --author <u> Process single author only --verbose Detailed logging
--quiet Minimal output --resume Skip already-processed authors (uses state file)
--stateFile Custom state file path (default: tools/course-discovery/.state.json)
Auto-discovered entry schema

{ "course_title": "Study Name - Chapter Name", "author": "lichess_username",
"platform": "Lichess", "source_url":
"https://lichess.org/study/{studyId}/{chapterId}", "anchor_fens":
["matched_fen"], "auto_discovered": true, "discovered_at":
"2026-02-10T00:00:00.000Z" } No quality_score, publication_year, repertoire_for,
estimated_level, scope, or vetting_notes. The auto_discovered flag is the key
differentiator for the merger.

Part 2: Search Link Fallback Modify packages/api/src/services/course-service.js
Add method to the CourseService class:

getSearchLinks(openingName) { if (!openingName || typeof openingName !==
'string') return null; const encoded = encodeURIComponent(openingName.trim());
return { lichess: `https://lichess.org/study/search?q=${encoded}`, chessable:
`https://www.chessable.com/courses/s/?q=${encoded}` }; } Modify
packages/api/src/routes/courses.routes.js Update GET /api/courses/:fen handler:

Read optional openingName from req.query.openingName Call
courseService.getSearchLinks(openingName) Include in response: { success, fen,
courses, count, searchLinks } searchLinks is null when no openingName provided
Part 3: Tests All test files go in tests/unit/ (matching existing pattern, Jest
runner from root).

tests/unit/lichess-fetcher.test.js Mock global fetch Test NDJSON parsing
(multiple lines, empty response, malformed line) Test 429 rate limit handling
(backoff + retry) Test network error handling tests/unit/pgn-matcher.test.js
Test splitPGNIntoChapters() with multi-chapter PGN (verify chapterId extraction
from [Site] header) Test generateFENsFromPGN() with known moves (e.g. 1. e4 e6 →
verify French Defense FEN) Test matchFENsToOpenings() with mock ECO index Test
no-match scenario (endgame positions) Test FEN normalisation (strips move
counters) tests/unit/course-merger.test.js Test manual entries preserved after
merge Test auto-discovered entries replaced on re-run Test new FEN keys added
alongside existing Test empty existing file handled Test entries with
auto_discovered: true cleared before fresh insert Update existing tests
tests/unit/course-service.test.js — Add tests for getSearchLinks(): valid name,
null name, empty string tests/unit/course-routes.test.js — Add test for
?openingName=French+Defense query param, verify searchLinks in response
Implementation Order lib/lichess-fetcher.js + tests/unit/lichess-fetcher.test.js
lib/pgn-matcher.js + tests/unit/pgn-matcher.test.js lib/course-merger.js +
tests/unit/course-merger.test.js config/authors.json index.js (orchestrator)
Search links: modify course-service.js + courses.routes.js + update existing
tests End-to-end dry-run: node tools/course-discovery/index.js --dryRun
--limit=1 Critical Files Reference File Action
packages/shared/src/utils/pgn-utils.ts Reference only — port FEN generation +
matching logic to CJS packages/api/src/services/course-service.js Modify — add
getSearchLinks() packages/api/src/routes/courses.routes.js Modify — add
openingName query param, return searchLinks packages/api/src/data/courses.json
Pipeline output target api/data/eco/ecoA.json through ecoE.json Read — opening
database for FEN matching tools/llm-enrichment/enrich_openings_llm.js Reference
— copy Logger (lines 16-62), StateManager (lines 64-113)
tools/video-pipeline/index.js Reference — step-based pipeline structure
tests/unit/course-service.test.js Modify — add searchLinks tests
tests/unit/course-routes.test.js Modify — add openingName param tests
Verification npx jest tests/unit/lichess-fetcher.test.js
tests/unit/pgn-matcher.test.js tests/unit/course-merger.test.js — new unit tests
pass npx jest tests/unit/course-service.test.js tests/unit/course-routes.test.js
— existing + new tests pass node tools/course-discovery/index.js --dryRun
--limit=1 — test with 1 author, verify output looks correct node
tools/course-discovery/index.js --limit=1 — write to courses.json, verify manual
French Defense entry still present npx jest — full test suite passes (90%
coverage threshold) Manual API test: GET
/api/courses/:fen?openingName=French+Defense returns courses + searchLinks Root
package.json Script (optional) Add after pipeline is working:

"course:discover": "node tools/course-discovery/index.js" User approved the plan
The plan is approved. Let me start implementing. I'll set up the todo list and
begin with the implementation order from the plan:

lib/lichess-fetcher.js + tests lib/pgn-matcher.js + tests lib/course-merger.js +
tests config/authors.json index.js (orchestrator) Search links: modify
course-service.js + courses.routes.js + update tests End-to-end dry-run Let me
start by creating the directory structure and then the first file.
