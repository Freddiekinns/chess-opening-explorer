# Course Discovery Pipeline

Fetches public Lichess studies from known chess educators, parses PGN chapters, matches positions to openings by FEN, and writes results to `courses.json`.

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
2. **Fetch study list** for each author via `GET https://lichess.org/api/study/by/{username}` (legitimate documented API, returns NDJSON)
3. **Fetch PGN** for each study via `GET https://lichess.org/api/study/{studyId}.pgn`
4. **Split PGN** into individual chapters, extracting chapter IDs from `[Site]` headers
5. **Replay moves** with `chess.js`, collecting FEN at each position
6. **Match FENs** against the ECO opening database (~12,000 positions) to find the deepest opening match per chapter
7. **Merge** discoveries into `packages/api/src/data/courses.json`, preserving any manually curated entries

## CLI Options

| Flag | Description |
|------|-------------|
| `--dryRun` | Preview output without writing files |
| `--limit <n>` | Process at most `n` authors |
| `--author <username>` | Process a single author only |
| `--verbose` | Detailed logging (per-chapter matches) |
| `--quiet` | Errors only |
| `--resume` | Skip authors already processed (uses state file) |
| `--stateFile <path>` | Custom state file (default: `tools/course-discovery/.state.json`) |

## Adding Authors

Edit `config/authors.json`:

```json
{
  "authors": [
    { "username": "LichessUsername", "note": "Description of who they are" }
  ]
}
```

Usernames must be valid Lichess accounts with public studies. The pipeline gracefully skips 404s (non-existent users) and studies with no matching openings.

## Adding Manual Courses

Add entries directly to `packages/api/src/data/courses.json` under the relevant FEN key. Omit `auto_discovered` (or set it to `false`) so the pipeline never modifies or removes them:

```json
{
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": [
    {
      "course_title": "French Defense Masterclass",
      "author": "Daniel Naroditsky",
      "platform": "Chessable",
      "source_url": "https://www.chessable.com/course/12345/",
      "anchor_fens": ["rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]
    }
  ]
}
```

When the pipeline runs, it clears all entries with `auto_discovered: true` and replaces them with fresh data. Manual entries (without that flag) are never touched.

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

tests/unit/
    lichess-fetcher.test.js   # API + NDJSON + rate limit tests
    pgn-matcher.test.js       # PGN split, FEN gen, opening match tests
    course-merger.test.js     # Merge algorithm tests
```

## Tests

```bash
# Run all course-discovery tests
npx jest tests/unit/lichess-fetcher.test.js tests/unit/pgn-matcher.test.js tests/unit/course-merger.test.js

# Run full suite (includes course-service and course-routes)
npx jest
```

## Using Standalone

To reuse this pipeline in another project:

1. Copy `tools/course-discovery/` into your project
2. Install dependencies: `npm install chess.js yargs`
3. Provide ECO data files at `api/data/eco/ecoA.json` through `ecoE.json` (FEN-keyed JSON objects)
4. Provide or create a `courses.json` output target
5. Update the paths in `lib/pgn-matcher.js` (`loadECOIndex`) and `lib/course-merger.js` (`DEFAULT_COURSES_PATH`) to match your project layout
6. Run: `node tools/course-discovery/index.js --dryRun`
