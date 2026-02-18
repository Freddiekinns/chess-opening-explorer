# Course Discovery Pipeline

Discovers and imports Lichess studies into `courses.json`, matching each study
chapter to chess openings by FEN position.

## Prerequisites

- Node.js >= 18 (uses native `fetch`)
- `npm install` from the repository root (installs `chess.js`, `yargs`)

## Quick Start

```bash
# Import curated studies into courses.json
npm run course:import

# Discover new popular studies (500+ likes)
npm run course:discover

# Add a single study URL
npm run course:import -- --url https://lichess.org/study/abc123
```

## Workflow

The pipeline has two phases: **discovery** (find study URLs) and **import**
(fetch PGN, match to openings, write courses.json).

```
Discovery                    Review              Import
┌──────────────┐             ┌────────┐         ┌──────────────┐
│ discover-     │ ──writes──▶│curated-│──read──▶│ add-studies.js│──▶ courses.json
│ popular.js   │             │studies │         │              │
└──────────────┘             │.txt    │         └──────────────┘
                             └────────┘
Manual paste ──────────────▶     │
                                 │
Single URL ────────────────────────────────────▶ add-studies.js
```

### 1. Discover Popular Studies

Searches Lichess with ~46 opening-related terms, sorted by popularity.
Filters out non-opening content (endgames, puzzles, etc.) and cross-references
against the existing curated list to find new studies.

```bash
# Preview (no files written)
npm run course:discover -- --dryRun --verbose

# Write new discoveries to discovered-studies.txt
npm run course:discover

# Use a different likes threshold
npm run course:discover -- --minLikes 1000

# Append directly to curated-studies.txt
npm run course:discover -- --append
```

### 2. Import Studies

Reads study URLs from `curated-studies.txt`, fetches metadata and PGN from
Lichess, splits each study into chapters, replays moves with `chess.js`, and
matches FEN positions against the ECO database (~12,000 positions).

```bash
# Import all curated studies (with resume support)
npm run course:import -- --resume --verbose

# Dry run (preview without writing)
npm run course:import -- --dryRun --limit 10

# Import a single study URL
npm run course:import -- --url https://lichess.org/study/abc123

# Process a subset
npm run course:import -- --limit 50
```

## CLI Options

### discover-popular.js

| Flag             | Description                                  | Default |
| ---------------- | -------------------------------------------- | ------- |
| `--minLikes <n>` | Minimum likes threshold                      | `500`   |
| `--dryRun`       | Show results without writing files           | `false` |
| `--append`       | Append discoveries to curated-studies.txt     | `false` |
| `--output <path>`| Custom output file path                      |         |
| `--verbose`      | Show excluded studies for review             | `false` |

### add-studies.js

| Flag                   | Description                                    | Default              |
| ---------------------- | ---------------------------------------------- | -------------------- |
| `--file <path>`        | Input file with study URLs                     | `config/curated-studies.txt` |
| `--url <url>`          | Import a single Lichess study URL              |                      |
| `--dryRun`             | Preview without writing courses.json           | `false`              |
| `--limit <n>`          | Process at most n studies                      |                      |
| `--resume`             | Skip previously processed studies              | `false`              |
| `--replaceCurated`     | Replace existing curated entries               | `false`              |
| `--verbose`            | Show per-chapter matching details              | `false`              |

## Input Format

`curated-studies.txt` uses alternating title/URL lines:

```
# Lines starting with # are comments
Sicilian Defense Study
https://lichess.org/study/abc123
Caro-Kann Defense
https://lichess.org/study/def456
```

Titles are optional (used for display only). The importer deduplicates by study
ID automatically.

## Output Format

Each chapter becomes an entry in `courses.json`, keyed by the matched FEN:

```json
{
  "rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3": [
    {
      "course_title": "Caro-Kann Defense - Introduction",
      "author": "leninperez",
      "platform": "Lichess",
      "source_url": "https://lichess.org/study/jtlLwUvh/abc123",
      "anchor_fens": ["rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3"],
      "curated": true,
      "likes": 41363,
      "discovered_at": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

## Rate Limiting

Both tools respect Lichess API guidelines:

- Minimum 1.1-1.5 seconds between requests
- 60-second exponential backoff on 429 responses
- Maximum 3 retries per request

## Architecture

```
tools/course-discovery/
├── add-studies.js           # Import curated URLs into courses.json
├── discover-popular.js      # Find popular studies on Lichess
├── config/
│   ├── curated-studies.txt  # Source of truth for study URLs
│   └── discovered-studies.txt  # Output from discover-popular
├── lib/
│   ├── lichess-fetcher.js   # Lichess API client with rate limiting
│   ├── pgn-matcher.js       # PGN parsing, FEN generation, ECO matching
│   └── course-merger.js     # Load/write courses.json
└── README.md

tests/unit/
├── add-studies.test.js      # Import tool tests
├── discover-popular.test.js # Discovery tool tests
├── lichess-fetcher.test.js  # API client tests
├── pgn-matcher.test.js      # PGN/FEN matching tests
└── course-merger.test.js    # Merge logic tests
```

## Tests

```bash
# Run all course-related tests
npx jest tests/unit/add-studies.test.js tests/unit/discover-popular.test.js \
  tests/unit/lichess-fetcher.test.js tests/unit/pgn-matcher.test.js \
  tests/unit/course-merger.test.js

# Full suite
npx jest
```
