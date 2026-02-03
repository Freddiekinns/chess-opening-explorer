# Video Pipeline

Discovers, enriches, and matches YouTube chess educational videos to chess openings.

## Quick Start

```bash
# Set your YouTube API key
export YOUTUBE_API_KEY="your-api-key-here"

# Run the complete pipeline
node tools/video-pipeline/index.js
```

## What It Does

1. **Discovers** videos from trusted chess channels via RSS feeds
2. **Filters** out non-educational content (tournaments, game analysis, etc.)
3. **Enriches** candidates with YouTube API metadata
4. **Matches** videos to openings using weighted scoring
5. **Saves** results to SQLite database
6. **Generates** static JSON files for the frontend

## Architecture

```
index.js                    # Main orchestrator
├── lib/
│   ├── rss-discovery.js    # Stage 1: RSS feed discovery
│   ├── candidate-filter.js # Stage 2: Pre-filtering
│   ├── video-enricher.js   # Stage 3: YouTube API enrichment
│   └── video-matcher.js    # Stage 4: Matching algorithm
├── database/
│   ├── schema-manager.js   # SQLite schema and queries
│   └── static-file-generator.js  # JSON export
└── tests/
    ├── rss-discovery.test.js
    └── video-matcher.test.js
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

| Tier | Duration Requirement | Scoring Bonus |
|------|---------------------|---------------|
| `premium` | 4+ minutes | +40 points |
| `standard` | 8+ minutes | +20 points |

## Using Components Independently

Each component can be used standalone:

### RSS Discovery

```javascript
const RSSVideoDiscovery = require('./lib/rss-discovery');

const discovery = new RSSVideoDiscovery();
const { videos, errors } = await discovery.discoverNewVideos({
  publishedAfter: '2024-01-01T00:00:00Z'
});
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
  clearDb: false  // Set true to start fresh
});
```

## Matching Algorithm

Videos are scored (0-200) based on:

| Factor | Points | Description |
|--------|--------|-------------|
| **Name Match** | +80 | Opening name in video title |
| **Content Match** | +60 | Opening name in description/tags |
| **Family Match** | +50 | Major opening family detected |
| **Abbreviation** | +35 | Known abbreviation (QGD, KID, etc.) |
| **Educational Keywords** | +30 | "explained", "theory", "guide" |
| **Premium Educator** | +40 | Naroditsky, St. Louis, etc. |
| **Good Duration** | +15 | 20-60 minutes |
| **Game Analysis** | -60 | "vs", "brilliant", "crushes" |
| **Short Video** | -25 | Under 5 minutes |

Minimum threshold: **60 points**

### Family Mismatch Protection

Videos are rejected if they discuss an incompatible opening family:
- A "Sicilian" video won't match French Defense openings
- A "Queen's Gambit" video won't match King's Indian openings

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

| Method | API Units |
|--------|-----------|
| YouTube Search | ~100 units/query |
| RSS Discovery | **0 units** |
| Video Details (batch) | 1 unit/video |

By using RSS feeds for discovery, the pipeline saves ~88% of API quota compared to search-based approaches.

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key |
| `NODE_ENV` | No | Set to `test` to skip delays |

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
