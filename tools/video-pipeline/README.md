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
npm run pipeline:rematch
# After rematch, restore view counts/thumbnails from YouTube API:
node tools/video-pipeline/scripts/backfill-views.js
```

## Modes

| Mode          | Command                    | Discovery      | API Cost | Use Case                       |
| ------------- | -------------------------- | -------------- | -------- | ------------------------------ |
| `incremental` | `npm run pipeline`         | RSS feeds      | Low      | Regular updates (daily/weekly) |
| `full`        | `npm run pipeline:full`    | YouTube API    | High     | Historical catalogue rebuild   |
| `rematch`     | `npm run pipeline:rematch` | None (DB only) | Zero\*   | Re-score after scorer changes  |

\* Rematch itself is zero cost, but run `backfill-views.js` after to restore
view counts/thumbnails (~35 API calls for ~1700 videos).

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
│   └── video-matcher.js    # Matching algorithm + scorer
├── database/
│   ├── schema-manager.js   # SQLite schema and queries
│   └── static-file-generator.js  # JSON export
└── tests/
    ├── rss-discovery.test.js
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

Videos are scored (0-200) based on:

| Factor                    | Points | Description                                    |
| ------------------------- | ------ | ---------------------------------------------- |
| **Name Match**            | +80    | Opening name in video title                    |
| **Content Match**         | +60    | Opening name in description/tags               |
| **Family Match**          | +50    | Major opening family detected                  |
| **Abbreviation**          | +35    | Known abbreviation (QGD, KID, etc.)            |
| **Educational Keywords**  | +30    | "explained", "theory", "guide"                 |
| **Premium Educator**      | +40    | Naroditsky, St. Louis, etc.                    |
| **Good Duration**         | +15    | 20-60 minutes                                  |
| **Player vs Player**      | -60    | "Magnus vs Hikaru" (capitalized)               |
| **Game Analysis**         | -60    | "brilliant", "crushes", etc.                   |
| **Short Video**           | -25    | Under 5 minutes                                |
| **Sub-variation Penalty** | -15    | Generic family video vs specific sub-variation |

Minimum threshold: **60 points**

### Anti-Overindexing Protections

- **2-word alias minimum**: Alias fragments from comma/semicolon splitting must
  have 2+ words (prevents "Accepted" matching everything)
- **Cross-opening title check**: Content-only matches rejected if the video
  title names a different gambit/defense/attack
- **Family mismatch protection**: Videos rejected if they discuss an
  incompatible opening family (e.g., Sicilian video won't match French Defense)
- **Sub-variation penalty**: Generic family videos score lower against specific
  sub-variations (e.g., "Sicilian Defense" video vs "Sicilian Defense: Najdorf")

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

**Important:** The API reads from `packages/api/src/data/video-index.json`.
After regeneration, copy:

```bash
cp api/data/video-index.json packages/api/src/data/video-index.json
```

### Backfill Views

Location: `tools/video-pipeline/scripts/backfill-views.js`

Restores view counts and thumbnails from YouTube API for all videos in the DB.
Run after `pipeline:rematch` which does not re-fetch this metadata.

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
