# Video Pipeline

Discovers, enriches, and matches YouTube chess educational videos to chess
openings. Unified pipeline with three modes: incremental (RSS), full catalogue
(YouTube API), and rematch (re-score only).

## Quick Start

```bash
# Set your YouTube API key
export YOUTUBE_API_KEY="your-api-key-here"

# Incremental: discover new videos via RSS (default, free)
npm run pipeline

# Full catalogue: rebuild from all channel history (requires API key)
npm run pipeline:full

# Rematch: re-score existing videos with updated scorer (zero API cost)
# (run the backfill first on older databases — it populates views, thumbnails,
# descriptions and tags, which the scorer's content checks use)
node tools/video-pipeline/scripts/backfill-views.js
npm run pipeline:rematch

# Verify match quality after any scorer/data change
node scripts/audit-video-matches.js
```

## Monthly automation (`.github/workflows/video-refresh.yml`)

A scheduled GitHub Action runs the incremental pipeline on the 1st of every
month, audits before/after, and opens a PR carrying the metric diff (it refuses
to open one if coverage collapses >20%). Two one-time steps enable it:

1. **Commit the matcher database** — the pipeline needs its catalogue and CI has
   no other way to get it. From the machine that owns it:

   ```bash
   git add tools/data/videos.sqlite   # .gitignore already carries the exception
   git commit -m "chore(videos): commit matcher catalogue for CI refreshes"
   ```

   The DB is a rebuildable cache (`npm run pipeline:full` regenerates it from
   the YouTube API). SQLite doesn't diff well, so monthly refreshes grow git
   history by roughly the file size — move it to Git LFS if that becomes a
   problem.

2. **Add the `YOUTUBE_API_KEY` repository secret** (Settings → Secrets and
   variables → Actions) so newly discovered videos can be enriched.

Until both are in place the workflow fails fast at its guard steps with a
message pointing here.

## Modes

| Mode          | Command                    | Discovery     | API Cost | Use Case                       |
| ------------- | -------------------------- | ------------- | -------- | ------------------------------ |
| `incremental` | `npm run pipeline`         | RSS feeds     | Low      | Regular updates (daily/weekly) |
| `full`        | `npm run pipeline:full`    | YouTube API   | High     | Historical catalogue rebuild   |
| `rematch`     | `npm run pipeline:rematch` | None (corpus) | Zero\*   | Re-score after scorer changes  |

\* Rematch itself is zero cost. Run `backfill-views.js` first (~35 API calls for
~1700 videos) so views/thumbnails are fresh and descriptions/tags are available
to the scorer's content checks.

### The matching corpus

Rematch scores the `videos` table **plus everything else in
`tools/data/video_enrichment_cache.json`** (`lib/enrichment-corpus.js`).

That second half is load-bearing. Matching only writes back the videos that won
a top-10 slot on some opening, so the table holds ~1,700 of the ~10,200 videos
the pipeline has fetched. Re-scoring the table alone is a ratchet: a better
scorer can only reshuffle the winners of the worse one, and a video an early
scorer rejected is gone for good. That is what emptied the Accelerated Dragon
page of its best lectures — Seirawan's 455k-view lecture and two Naroditsky
theory speedruns score 155–175 under today's scorer but had been dropped by an
older one and were never reconsidered.

Recovered candidates go through the same pre-filter discovery uses, so nothing
enters that discovery would have rejected. Their view counts are as stale as the
cache; run `backfill-views.js` after a recovery-heavy rematch.

## What It Does

1. **Discovers** videos from trusted chess channels via RSS feeds or YouTube API
2. **Deduplicates** against existing database
3. **Filters** out non-educational content (tournaments, game analysis, etc.)
4. **Enriches** candidates with YouTube API metadata
5. **Matches** videos to openings using weighted scoring
6. **Saves** results to SQLite database
7. **Generates** static JSON files for the frontend

## Architecture

```
index.js                    # Main orchestrator (mode-based dispatch)
├── lib/
│   ├── rss-discovery.js    # RSS feed discovery (incremental mode)
│   ├── channel-discovery.js # YouTube API full-catalogue discovery (full mode)
│   ├── candidate-filter.js # Pre-filtering
│   ├── video-enricher.js   # YouTube API enrichment
│   ├── enrichment-corpus.js # Cache → matcher input (rematch corpus recovery)
│   ├── channel-tiers.js    # Config → premium/standard, by id or title
│   └── video-matcher.js    # Matching algorithm + scorer
├── database/
│   ├── schema-manager.js   # SQLite schema and queries
│   └── static-file-generator.js  # JSON export
└── tests/
    ├── rss-discovery.test.js
    ├── enrichment-corpus.test.js
    ├── channel-tiers.test.js
    ├── video-matcher.test.js
    ├── channel-discovery.test.js
    └── pipeline-modes.test.js
```

## Configuration

### YouTube Channels

Trusted channels are configured in `config/youtube_channels.json`:

```json
{
  "trusted_channels": [
    {
      "name": "Saint Louis Chess Club",
      "channel_id": "UCM-ONC2bCHytG2mYtKDmIeA",
      "quality_tier": "premium",
      "min_views": 1000
    }
  ]
}
```

### Quality Tiers

| Tier       | Duration Requirement | Scoring Bonus | Examples                                        |
| ---------- | -------------------- | ------------- | ----------------------------------------------- |
| `premium`  | 4+ minutes           | +40 points    | Naroditsky, Hanging Pawns, St. Louis, GingerGM  |
| `standard` | 8+ minutes           | +20 points    | GothamChess, Chessbrah, agadmator, Ben Finegold |

Entertainment-focused channels (chess24, World Chess, FIDE Chess) receive a -30
penalty instead.

`lib/channel-tiers.js` resolves the tier — by `channel_id` when one is known,
otherwise by channel title. **The title comparison is normalised to letters and
digits**, because a channel's config display name and its YouTube title differ
in spacing and punctuation: the config says "Chess Network", the channel calls
itself "ChessNetwork". Comparing the raw strings dropped that premium channel to
the unknown tier — worth 60 points in the scorer (+40 not awarded, -25 instead
of -5) and the stricter 8-minute gate in the pre-filter, which alone withheld
183 of its videos from corpus recovery. The enrichment cache never stored
channel ids, so every recovered candidate depends on this path.

## Using Components Independently

Each component can be used standalone:

### RSS Discovery (incremental)

```javascript
const RSSVideoDiscovery = require('./lib/rss-discovery');

const discovery = new RSSVideoDiscovery();
const { videos, errors } = await discovery.discoverNewVideos({
  publishedAfter: '2024-01-01T00:00:00Z',
});
```

### Channel Discovery (full catalogue)

```javascript
const ChannelDiscovery = require('./lib/channel-discovery');

const discovery = new ChannelDiscovery(process.env.YOUTUBE_API_KEY, {
  requestDelay: 200, // ms between paginated requests
});
const { videos, totalVideos, errors } = await discovery.discoverAllVideos();
```

### Video Enrichment

```javascript
const VideoEnrichment = require('./lib/video-enricher');

const enricher = new VideoEnrichment(process.env.YOUTUBE_API_KEY);
const enrichedVideos = await enricher.batchEnrichVideos(videos);
```

### Video Matching

```javascript
const VideoMatcher = require('./lib/video-matcher');

const matcher = new VideoMatcher('./data/videos.sqlite');
const results = await matcher.runMatchingWithVideos(enrichedVideos, {
  clearDb: false, // Set true to start fresh
});
```

## Matching Algorithm

All weights and the threshold live in `config/video_matching.json` — tune them
there (no code change), then run `npm run pipeline:rematch`. Defaults:

| Factor                   | Points | Description                                      |
| ------------------------ | ------ | ------------------------------------------------ |
| **Name Match**           | +80    | Opening name in video title                      |
| **Content Match**        | +60    | Opening name in description/tags                 |
| **Family Match**         | +50    | Opening family in title (incl. move-notation     |
|                          |        | names like "Scandinavian: 2.exd5")               |
| **Abbreviation**         | +35    | Known abbreviation (QGD, KID, etc.)              |
| **Educational Keywords** | +30    | "explained", "theory", "guide"                   |
| **Premium Educator**     | +40    | `quality_tier: premium` in youtube_channels.json |
| **Variation Specific**   | +25    | Title names the page's exact variation           |
| **Good Duration**        | +15    | 20-60 minutes                                    |
| **Player vs Player**     | -60    | "Magnus vs Hikaru" (capitalized)                 |
| **Game Analysis**        | -60    | "brilliant", "crushes", etc.                     |
| **Sub-variation Miss**   | -40    | Generic family video on a specific variation     |
| **Short Video**          | -25    | Under 5 minutes                                  |

Minimum threshold: **60 points** (`min_match_score`).

Per-opening ranking breaks score ties by **how much of the variation the title
names** (full segment → some word → none), then **view count**, then **publish
date**, so the displayed order is never arbitrary. That first term matters
because the ±65 specificity swing only applies to variation names carrying a
word of six characters or more: short ones (Smith-Morra, Prins, O'Kelly, Lolli)
get no swing by design, so their whole candidate list ties on score and view
count alone decided it — which is how a Maróczy Bind lecture came to lead the
Smith-Morra page over a Naroditsky Smith-Morra speedrun.

### Anti-Overindexing Protections

- **Move-prefix family compatibility** (`lib/opening-families.js`): every family
  maps to its defining moves (Caro-Kann = `1.e4 c6`, QGD = `1.d4 d5 2.c4 e6`); a
  video is rejected when the families its title names all diverge from the
  page's moves. This is what stops "Caro-Kann, Exchange Variation" landing on
  QGD Exchange pages via the shared word "Exchange". Multi-opening titles
  ("Owen's Defense + Ruy Lopez") stay eligible for every compatible family they
  name.
- **Boundary + modifier-aware name matching** (`findPhrase`): opening names only
  match on word boundaries — "accelerated dragon" never matches inside
  "Hyperaccelerated Dragon". Hyphenated compounds still expose their parts
  ("smith" matches in "Smith-Morra"); sibling protection comes from the modifier
  check: a variation word found only behind a foreign prefix modifier
  (`config/video_matching.json` → `variation_modifiers`: accelerated,
  hyperaccelerated, semi, anti, reversed, …) marks a **sibling variation** and
  the match is rejected outright — "The Accelerated Dragon" is rejected from the
  plain Dragon page, "Semi-Slav" titles from pure Slav pages, and vice versa.
  Diacritics are normalized ("Maróczy" matches "maroczy"), a trailing s/d is
  tolerated ("Advanced" counts for "Advance Variation" pages), and the "Acc."
  title shorthand expands to "accelerated".
- **2-word alias minimum**: Alias fragments from comma/semicolon splitting must
  have 2+ words (prevents "Accepted" matching everything); bare shared variation
  names ("Exchange Variation") are skipped entirely
- **An alias equal to the page's own family name is skipped.** The same comma
  splitting turns `"Sicilian Defense, O'Kelly Variation"` into a bare
  `"Sicilian Defense"` alias on the **Kan** page, and that title-matched every
  generic Sicilian video at 80 points — above any real variation match, and
  clear of both the intra-family guard (family matches only) and the
  description-corroboration rule (content matches only). The Kan page led with a
  Najdorf lecture at 165 because of it. Family-level evidence has its own path
  further down the cascade; it must not enter as a name match
- **Cross-opening title check**: Content-only matches rejected if the video
  title names a different gambit/defense/attack
- **Description corroboration**: a hit in the description or tags only counts on
  a sub-variation page when the **title** names the variation too. Series
  descriptions cross-link their sibling episodes ("The theory of the Accelerated
  Dragon: https://youtu.be/…"), so every Sicilian lecture in a playlist mentions
  every other one; at face value that is +60, above a family match, and it
  bypassed the intra-family guard. It put the Alapin, Scheveningen and Prins
  lectures on the Accelerated Dragon page at 100+. An uncorroborated mention now
  falls through to the family path, where the guard polices it. Family-level
  pages have no variation to corroborate, so their content matches stand.
- **Variation specificity**: a ±65-point swing (+25/−40) guarantees a
  variation-specific video outranks a generic family video on sub-variation
  pages, regardless of channel bonuses. The +25 requires the title to name a
  **full comma-segment** of the page's variation ("Accelerated Dragon" needs
  both words; on "Accelerated Dragon, Maróczy Bind" either segment suffices) —
  partial word overlap ("Dragon" alone) takes the −40 instead
- **Intra-family variation guard**: a family match only proves the video and
  page share an _opening family_ (both Sicilian), not the same variation. When a
  title names a distinctive sub-variation (`config/video_matching.json` →
  `specific_variation_keywords`: Najdorf, Dragon, Alapin, …) it is kept on a
  sub-variation page only if it names _that_ page's variation — a Dragon lecture
  is rejected from a Najdorf page. Pure move-notation pages ("Scandinavian:
  2.exd5") keep only generic family overviews, since the variation can't be read
  from the moves alone.

  > **Known limitation:** `specific_variation_keywords` is a denylist, so it
  > only catches named variations it lists. The long tail (Chekhover, Prins,
  > apostrophe spelling variants, …) still lets _generic-looking_ titles blanket
  > sibling pages at the family level. A complete fix needs variation-level
  > classification of each video (a one-time taxonomy/LLM pass), not a longer
  > list — see the assessment in `docs/reviews/`.

### Auditing match quality

```bash
node scripts/audit-video-matches.js          # human-readable report
node scripts/audit-video-matches.js --json   # full report
```

Reports coverage (overall + top-200 most-played), variation specificity,
cross-family contamination, ranking-tie ambiguity, and index age. Run before and
after any scorer change to verify it helped.

## Utilities

### Backfill Videos

Search for videos about specific openings:

```bash
node tools/video-pipeline/backfill-videos.js
```

### Analyze Performance

Generate a comprehensive matching report:

```bash
node tools/video-pipeline/analyze_comprehensive_performance.js
```

### Debug Database

Check database integrity:

```bash
node tools/video-pipeline/debug-db.js
```

## Testing

```bash
# Run all video pipeline tests
npx jest tools/video-pipeline/tests/

# Run specific test file
npx jest tools/video-pipeline/tests/video-matcher.test.js
```

## API Quota Efficiency

The pipeline is optimized for minimal YouTube API usage:

| Method                | API Units        |
| --------------------- | ---------------- |
| YouTube Search        | ~100 units/query |
| RSS Discovery         | **0 units**      |
| Video Details (batch) | 1 unit/video     |

By using RSS feeds for discovery, the pipeline saves ~88% of API quota compared
to search-based approaches.

## Output

### SQLite Database

Location: `tools/video-pipeline/data/videos.sqlite`

Tables:

- `openings` - Chess openings with ECO codes
- `videos` - Video metadata
- `opening_videos` - Match relationships with scores

### Static JSON Files

Location: `public/api/openings/{opening_id}.json`

Each file contains the top 10 matched videos for that opening.

### Video Index

Location: `api/data/video-index.json` (consolidated from static files)

`api/data/` is the single canonical data location — the API reads the index from
there in every environment, so regenerating it is enough (the old
copy-to-`packages/api/src/data/` step is gone).

### Backfill Views

Location: `tools/video-pipeline/scripts/backfill-views.js`

Restores view counts, thumbnails, **descriptions and tags** from the YouTube API
for all videos in the DB (~35 API calls for ~1700 videos). Descriptions and tags
are persisted in the `videos` table and feed the matcher's content checks — run
this once on a database created before those columns existed, then
`npm run pipeline:rematch` re-scores with full evidence.

## Environment Variables

| Variable          | Required | Description                  |
| ----------------- | -------- | ---------------------------- |
| `YOUTUBE_API_KEY` | Yes      | YouTube Data API v3 key      |
| `NODE_ENV`        | No       | Set to `test` to skip delays |

## Troubleshooting

### "No API Key found"

Set your YouTube API key:

```bash
export YOUTUBE_API_KEY="AIza..."
```

### "Video not found in YouTube API"

The video may be private, deleted, or region-restricted.

### Low match scores

Check if the opening name uses common abbreviations. The pipeline recognizes:

- QGD, QGA (Queen's Gambit)
- KID (King's Indian)
- London, Dragon, Najdorf, etc.

## Contributing

1. Add tests for new features in `tests/`
2. Follow existing code patterns
3. Update this README if adding new functionality
