# Course Discovery Pipeline

Fetches public Lichess studies from known chess educators, parses PGN chapters,
matches positions to openings by FEN, and writes results to `courses.json`.

## Prerequisites

- Node.js >= 18 (uses native `fetch`)
- `npm install` from the repository root (installs `chess.js`, `yargs`)

## Quick Start

```bash
# Preview what would be discovered (no files modified)
node tools/course-discovery/index.js --dryRun --limit=1

# Run for all configured authors
node tools/course-discovery/index.js

# Run for a single author
node tools/course-discovery/index.js --author=Fins

# Or use the npm script
npm run course:discover -- --dryRun
```

## How It Works

1. **Load authors** from `config/authors.json`
2. **Fetch study list** for each author via
   `GET https://lichess.org/api/study/by/{username}` (legitimate documented API,
   returns NDJSON)
3. **Quality filter (study level)** - Filter studies BEFORE PGN fetch to save
   API calls
   - Require at least one opening keyword (opening, defense, gambit, etc.)
   - Reject blacklisted terms (puzzle, endgame, Q&A, game analysis, etc.)
   - Score based on freshness and keyword matching
4. **Fetch PGN** for studies that pass the quality filter via
   `GET https://lichess.org/api/study/{studyId}.pgn`
5. **Split PGN** into individual chapters, extracting chapter IDs from `[Site]`
   headers
6. **Quality filter (chapter level)** - Filter chapters AFTER parsing
   - Require minimum 8 moves (hard requirement)
   - Reject chapters with blacklisted terms
   - Score based on move depth and keyword matching
7. **Replay moves** with `chess.js`, collecting FEN at each position
8. **Match FENs** against the ECO opening database (~12,000 positions) to find
   the deepest opening match per chapter
9. **Merge** discoveries into `packages/api/src/data/courses.json`, preserving
   any manually curated entries

## CLI Options

| Flag                     | Description                                                       | Default |
| ------------------------ | ----------------------------------------------------------------- | ------- |
| `--dryRun`               | Preview output without writing files                              | `false` |
| `--limit <n>`            | Process at most `n` authors                                       |         |
| `--author <username>`    | Process a single author only                                      |         |
| `--verbose`              | Detailed logging (per-chapter matches)                            | `false` |
| `--quiet`                | Errors only                                                       | `false` |
| `--resume`               | Skip authors already processed (uses state file)                  | `false` |
| `--stateFile <path>`     | Custom state file (default: `tools/course-discovery/.state.json`) |         |
| `--skipFilter`           | Disable all quality filtering (for debugging)                     | `false` |
| `--minStudyScore <n>`    | Minimum study quality score (0-100)                               | `40`    |
| `--minChapterScore <n>`  | Minimum chapter quality score (0-100)                             | `50`    |
| `--minMoveDepth <n>`     | Minimum moves in chapter (hard requirement)                       | `8`     |
| `--logFiltered`          | Log all filtered studies/chapters                                 | `false` |

## Adding Authors

Edit `config/authors.json`:

```json
{
  "authors": [
    { "username": "LichessUsername", "note": "Description of who they are" }
  ]
}
```

Usernames must be valid Lichess accounts with public studies. The pipeline
gracefully skips 404s (non-existent users) and studies with no matching
openings.

## Adding Manual Courses

Add entries directly to `packages/api/src/data/courses.json` under the relevant
FEN key. Omit `auto_discovered` (or set it to `false`) so the pipeline never
modifies or removes them:

```json
{
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": [
    {
      "course_title": "French Defense Masterclass",
      "author": "Daniel Naroditsky",
      "platform": "Chessable",
      "source_url": "https://www.chessable.com/course/12345/",
      "anchor_fens": [
        "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
      ]
    }
  ]
}
```

When the pipeline runs, it clears all entries with `auto_discovered: true` and
replaces them with fresh data. Manual entries (without that flag) are never
touched.

## Output Format

Auto-discovered entries:

```json
{
  "course_title": "Study Name - Chapter Name",
  "author": "lichess_username",
  "platform": "Lichess",
  "source_url": "https://lichess.org/study/{studyId}/{chapterId}",
  "anchor_fens": ["matched_fen"],
  "auto_discovered": true,
  "discovered_at": "2026-02-11T00:00:00.000Z"
}
```

## Quality Filtering

The pipeline uses two-stage quality filtering to reduce noise and save API calls:

### Stage 1: Study-Level Pre-Filter (Before PGN Fetch)

**Purpose:** Eliminate obviously irrelevant studies to save ~1,500-2,500 API calls

**Signals:**

- **Opening keywords (REQUIRED):** Study name must contain at least one: opening,
  defense/defence, attack, gambit, variation, repertoire, theory, system, line
- **Blacklist (hard reject):** Rejects studies with terms like: Q&A, puzzle,
  endgame, game analysis, tournament, livestream, etc.
- **Freshness:** Recent updates (within 1 year) receive bonus points

**Default threshold:** Minimum score 40/100

### Stage 2: Chapter-Level Post-Filter (After PGN Fetch)

**Purpose:** Filter individual chapters that aren't theoretical opening content

**Signals:**

- **Move depth (REQUIRED):** Minimum 8 moves (4 full moves) - shallow game
  annotations are rejected
- **Chapter blacklist:** Same blacklist applied to chapter titles
- **Quality score:** Combines freshness, keywords, and move depth

**Default threshold:** Minimum score 50/100 AND minimum 8 moves

### Scoring Algorithm

Studies and chapters are scored 0-100 based on:

- **Baseline:** 50 points
- **Freshness:** 0-20 points (20 for <1 year, 10 for 1-2 years, 5 for 2-3
  years, 0 for 3+ years)
- **Keyword matches:** 0-15 points (5 points per keyword, max 15)
- **Move depth (chapters only):** 0-20 points (20 for 16+ moves, 15 for 12+, 10
  for 8+, -30 penalty for <8)

### Expected Outcomes

- **API calls saved:** ~1,500-2,500 PGN fetches (80-85% reduction)
- **Processing time:** 3-4x faster (~30-40 min vs ~90-120 min)
- **False negatives:** <5% (conservative thresholds)
- **False positives:** <10% (ECO matching provides second quality gate)

### Tuning Thresholds

If you find the filter too strict or too lenient:

```bash
# More lenient (allow more studies through)
node tools/course-discovery/index.js --minStudyScore=30 --minChapterScore=40

# More strict (higher quality, fewer results)
node tools/course-discovery/index.js --minStudyScore=60 --minChapterScore=70 --minMoveDepth=12

# Disable filtering entirely (for debugging)
node tools/course-discovery/index.js --skipFilter
```

### Debugging Filtering

To review what's being filtered:

```bash
# Show all filter decisions
node tools/course-discovery/index.js --logFiltered --limit=1

# Combine with verbose for full details
node tools/course-discovery/index.js --logFiltered --verbose --limit=1
```

The pipeline logs filter statistics in the summary:

```
=== Quality Filtering Stats ===
Studies filtered: 56
Chapters filtered: 12

Filter Reasons:
  no_opening_keywords: 50
  blacklisted_term: 6
  insufficient_moves: 8
  low_chapter_score: 4
```

## Rate Limiting

The pipeline respects Lichess API guidelines:

- Minimum 1.1 seconds between requests
- 60-second exponential backoff on 429 (rate limit) responses
- Maximum 3 retries per request

## Architecture

```
tools/course-discovery/
  index.js                    # Pipeline orchestrator (CLI, logging, state)
  config/authors.json         # Seed list of Lichess educators
  lib/
    lichess-fetcher.js        # Lichess API client with rate limiting
    pgn-matcher.js            # PGN parsing, FEN generation, ECO matching
    course-merger.js          # Merge discoveries into courses.json
    quality-filter.js         # Two-stage quality filtering system

tests/unit/
    lichess-fetcher.test.js   # API + NDJSON + rate limit tests
    pgn-matcher.test.js       # PGN split, FEN gen, opening match tests
    course-merger.test.js     # Merge algorithm tests
    quality-filter.test.js    # Quality filtering tests (64 tests)
```

## Tests

```bash
# Run all course-discovery tests
npx jest tests/unit/lichess-fetcher.test.js tests/unit/pgn-matcher.test.js tests/unit/course-merger.test.js tests/unit/quality-filter.test.js

# Run just quality filter tests
npx jest tests/unit/quality-filter.test.js

# Run full suite (includes course-service and course-routes)
npx jest
```

## Using Standalone

To reuse this pipeline in another project:

1. Copy `tools/course-discovery/` into your project
2. Install dependencies: `npm install chess.js yargs`
3. Provide ECO data files at `api/data/eco/ecoA.json` through `ecoE.json`
   (FEN-keyed JSON objects)
4. Provide or create a `courses.json` output target
5. Update the paths in `lib/pgn-matcher.js` (`loadECOIndex`) and
   `lib/course-merger.js` (`DEFAULT_COURSES_PATH`) to match your project layout
6. Run: `node tools/course-discovery/index.js --dryRun`
