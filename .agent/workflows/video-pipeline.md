---
description: Run video pipeline to discover and match YouTube videos
---

This workflow manages the YouTube video integration pipeline. The pipeline has
three modes for different use cases.

## Prerequisites

- Ensure `.env` file has `YOUTUBE_API_KEY` or `GOOGLE_AI_API_KEY` set
- The database will be auto-initialized if needed

## Modes

### 1. Incremental (default) — regular updates

```bash
npm run pipeline
```

Fetches new videos from configured RSS feeds, deduplicates, pre-filters,
enriches via YouTube API, matches to openings, and generates static files. **Run
daily or weekly.**

### 2. Full Catalogue — historical rebuild

```bash
npm run pipeline:full
```

Uses YouTube Data API to discover ALL videos from every configured channel (full
upload history), then enriches new ones and re-matches everything. **Run when
adding new channels or doing a complete rebuild. Requires API key.**

### 3. Rematch — re-score only

```bash
npm run pipeline:rematch
```

Loads all existing videos from the database, clears match relationships only
(keeps video metadata), and re-runs the scorer. **Zero API cost. Run after
scorer changes (channel list updates, penalty adjustments, etc.).**

### 4. Backfill specific openings (optional)

```bash
node tools/video-pipeline/backfill-videos.js
```

Searches YouTube for specific major openings and populates the database. Edit
the file to add/remove opening names as needed.

### 5. Check database integrity (optional)

```bash
node tools/video-pipeline/debug-db.js
```

Shows stats on openings, videos, and relationships.

## What Gets Generated

After running any mode:

- **SQLite Database**: `tools/data/videos.sqlite` (video metadata and matches)
- **Static JSON files**: `public/api/openings/*.json` (one per opening position)
- **Video Index**: `api/data/video-index.json` (consolidated lookup file)

## Channel Configuration

Trusted channels are configured in `config/youtube_channels.json`. Currently 16
channels across premium and standard tiers.

To add a new channel:

1. Find the YouTube channel ID (starts with `UC`)
2. Add an entry to `trusted_channels` in the config
3. Run `npm run pipeline:full` to discover historical videos
4. Or wait for next incremental run to pick up new uploads

## Frequency

- **Incremental**: Run daily/weekly to fetch new RSS videos
- **Full**: Run once when adding channels or doing a rebuild
- **Rematch**: Run after updating the scoring algorithm
- **Backfill**: Run once or when targeting specific openings
