# Course Discovery Pipeline

Discovers Lichess studies and matches them to chess openings with the
multi-anchor scored matcher (study matching v2): each study chapter anchors to
**every** ECO position along its move path, guarded by opening-family
compatibility, scored, and aggregated to one entry per study per page in
`api/data/courses.json`.

## Prerequisites

- Node.js >= 18 (uses native `fetch`)
- `npm install` from the repository root (installs `chess.js`, `yargs`)

## Quick Start

```bash
# Fetch curated studies into the cache + rebuild courses.json
npm run course:import

# Re-score offline from the cache (zero API calls) — after weight changes
npm run course:rematch

# Discover new popular studies (500+ likes)
npm run course:discover

# Add a single study URL
npm run course:import -- --url https://lichess.org/study/abc123

# Verify match quality (coverage, contamination, duplication, ties)
node scripts/audit-study-matches.js
```

## Workflow

The pipeline has three phases: **discovery** (find study URLs), **fetch** (cache
raw PGN + metadata locally), and **match** (rebuild courses.json from the whole
cache).

```
Discovery                  Review           Fetch                Match (offline)
┌──────────────┐          ┌────────┐       ┌──────────────┐     ┌──────────────┐
│ discover-     │─writes─▶│curated-│─read─▶│ add-studies   │────▶│ study-matcher│──▶ api/data/
│ popular.js   │          │studies │       │ (fetch+cache) │     │ (build index)│    courses.json
└──────────────┘          │.txt    │       └──────┬───────┘     └──────▲───────┘
                          └────────┘              │                    │
Manual paste ────────────────▶│                   ▼                    │
                              │          tools/data/study-cache/ ──────┘
Single URL ───────────────────┴──▶ add-studies --url        (--fromCache reuses it)
```

Because raw study PGN + metadata are cached (one JSON per study, gitignored),
`npm run course:rematch` rebuilds the entire index offline in seconds — the same
fetch-once / re-score-freely model as the video pipeline's `pipeline:rematch`.

### 1. Discover Popular Studies

Searches Lichess with ~46 opening-related terms, sorted by popularity. Filters
out non-opening content (endgames, puzzles, etc.) and cross-references against
the existing curated list to find new studies.

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

### 2. Fetch + Match

Reads study URLs from `curated-studies.txt` (and, with `--includeDiscovered`,
`discovered-studies.txt`), fetches metadata and PGN from Lichess into
`tools/data/study-cache/`, then rebuilds `courses.json` from the whole cache.
Studies already in the cache are not re-fetched unless `--refetch` is given.

```bash
# Fetch everything (curated + discovered) and rebuild
npm run course:import -- --includeDiscovered --verbose

# Dry run (preview without writing)
npm run course:import -- --dryRun --limit 10

# Offline rebuild only (e.g. after editing config/study_matching.json)
npm run course:rematch
```

### 3. Audit

After any matcher or weight change, verify with:

```bash
node scripts/audit-study-matches.js          # human-readable
node scripts/audit-study-matches.js --json   # machine-readable
node scripts/audit-study-matches.js path/to/other-courses.json  # compare
```

Reports coverage (all pages / top-200 / top-1000 most-played), cross-family
contamination, same-study duplication, title duplication, and ranking ties. The
script reads both the legacy v1 and the current v2 schema, so it can compare an
old index against a new one.

## Matching model

- **Multi-anchor**: a chapter that reaches a Najdorf position also anchors on
  the Sicilian Defense page and every intermediate ECO position it passed
  through, so learners find deep studies from parent pages.
- **Family guard**: the study's families (from its title, else the majority of
  its chapters' deepest matches) must be move-prefix-compatible with the page's
  family — a London System model game that transposes through a Caro-Kann
  position is rejected (`tools/video-pipeline/lib/opening-families.js`, shared
  with the video matcher).
- **Scoring** (`config/study_matching.json`): specificity (how deep the anchor
  sits in the chapter's line), family agreement, log-scaled likes, and number of
  matching chapters, with deterministic tiebreakers (score → likes → study URL).
  Entries below `min_match_score` are dropped and each page keeps at most
  `max_studies_per_page` entries.
- **Aggregation**: one entry per (study, page); the best-matching chapter is the
  card's link target.

## CLI Options

### discover-popular.js

| Flag              | Description                               | Default |
| ----------------- | ----------------------------------------- | ------- |
| `--minLikes <n>`  | Minimum likes threshold                   | `500`   |
| `--dryRun`        | Show results without writing files        | `false` |
| `--append`        | Append discoveries to curated-studies.txt | `false` |
| `--output <path>` | Custom output file path                   |         |
| `--verbose`       | Show excluded studies for review          | `false` |

### add-studies.js

| Flag                  | Description                                    | Default                      |
| --------------------- | ---------------------------------------------- | ---------------------------- |
| `--file <path>`       | Input file with study URLs                     | `config/curated-studies.txt` |
| `--url <url>`         | Fetch a single Lichess study URL               |                              |
| `--fromCache`         | Skip fetching; rebuild from the cache only     | `false`                      |
| `--includeDiscovered` | Also fetch `config/discovered-studies.txt`     | `false`                      |
| `--refetch`           | Re-fetch studies already in the cache          | `false`                      |
| `--cacheDir <path>`   | Raw study cache directory                      | `tools/data/study-cache`     |
| `--dryRun`            | Preview without writing courses.json           | `false`                      |
| `--limit <n>`         | Fetch at most n studies                        |                              |
| `--resume`            | Skip previously processed studies (state file) | `false`                      |
| `--verbose`           | Detailed logging                               | `false`                      |
| `--output <path>`     | courses.json output path                       | `api/data/courses.json`      |

## Input Format

`curated-studies.txt` uses alternating title/URL lines:

```
# Lines starting with # are comments
Sicilian Defense Study
https://lichess.org/study/abc123
Caro-Kann Defense
https://lichess.org/study/def456
```

Titles are optional (used only until Lichess metadata is fetched). The importer
deduplicates by study ID automatically.

## Output Format (schema v2)

`courses.json` is FEN-keyed; each entry is one study on that page, sorted
best-first:

```json
{
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": [
    {
      "study_title": "The Complete Najdorf",
      "chapter_title": "Main Line",
      "study_url": "https://lichess.org/study/abc123",
      "chapter_url": "https://lichess.org/study/abc123/def456",
      "author": "gm_example",
      "platform": "Lichess",
      "likes": 1234,
      "chapters_matched": 7,
      "curated": true,
      "match": { "score": 92, "depth": 10, "reason": "covers-position" },
      "discovered_at": "2026-07-10T00:00:00.000Z"
    }
  ]
}
```

`match.reason` is `covers-position` (the chapter's content culminates at or near
this page's position) or `line-context` (the page is an ancestor of the
chapter's deeper line) — the UI renders these as badges.

The index is a **full rebuild from the cache** on every run; there is no merge
step (all entries are curated Lichess studies).

## Rate Limiting

Both tools respect Lichess API guidelines:

- Minimum 1.1-1.5 seconds between requests
- 60-second exponential backoff on 429 responses
- Maximum 3 retries per request

## Architecture

```
tools/course-discovery/
├── add-studies.js           # Fetch studies into cache + rebuild courses.json
├── discover-popular.js      # Find popular studies on Lichess
├── config/
│   ├── curated-studies.txt  # Source of truth for study URLs
│   └── discovered-studies.txt  # Output from discover-popular
├── lib/
│   ├── lichess-fetcher.js   # Lichess API client with rate limiting
│   ├── pgn-matcher.js       # PGN parsing, FEN generation, ECO index
│   ├── study-matcher.js     # Multi-anchor scoring + aggregation (v2)
│   ├── study-cache.js       # Raw PGN/metadata cache (offline rematch)
│   └── course-merger.js     # courses.json load/write helpers
└── README.md

config/study_matching.json   # Scoring weights + thresholds
scripts/audit-study-matches.js  # Quality audit (v1+v2 schemas)
tools/data/study-cache/      # Raw study cache (gitignored)

tests/unit/
├── add-studies.test.js      # Import tool tests
├── study-matcher.test.js    # Matcher scoring/guard/aggregation tests
├── study-cache.test.js      # Cache round-trip tests
├── audit-study-matches.test.js  # Audit dual-schema tests
├── discover-popular.test.js # Discovery tool tests
├── lichess-fetcher.test.js  # API client tests
├── pgn-matcher.test.js      # PGN/FEN matching tests
└── course-merger.test.js    # Load/write tests
```

## Tests

```bash
# Run all course-related tests
npx jest tests/unit/add-studies.test.js tests/unit/study-matcher.test.js \
  tests/unit/study-cache.test.js tests/unit/audit-study-matches.test.js \
  tests/unit/discover-popular.test.js tests/unit/lichess-fetcher.test.js \
  tests/unit/pgn-matcher.test.js tests/unit/course-merger.test.js

# Full suite
npx jest
```
