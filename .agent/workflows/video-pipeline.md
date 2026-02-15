---
description: Run video pipeline to discover and match YouTube videos
---

This workflow manages the YouTube video integration pipeline.

## Prerequisites

- Ensure `.env` file has `YOUTUBE_API_KEY` or `GOOGLE_AI_API_KEY` set
- The database will be auto-initialized if needed

## Steps

### 1. For a fresh database or to find videos for specific openings

// turbo

```bash
node tools/video-pipeline/backfill-videos.js
```

This searches YouTube for major openings (Sicilian, Ruy Lopez, Queen's Gambit,
etc.) and populates the database.

**Note:** Edit `backfill-videos.js` to add/remove opening names as needed.

### 2. Run the main pipeline (RSS + matching + static file generation)

// turbo

```bash
node tools/video-pipeline/index.js
```

This will:

- Fetch new videos from configured RSS feeds
- Match them against the opening database
- Generate/update static JSON files in `public/api/openings/`

### 3. Check database integrity (optional)

```bash
node tools/video-pipeline/debug-db.js
```

Shows stats on openings, videos, and relationships.

## What Gets Generated

After running the pipeline:

- **SQLite Database**: `tools/data/videos.sqlite` (video metadata and matches)
- **Static JSON files**: `public/api/openings/*.json` (one per opening position)
- **Video Index**: `api/data/video-index.json` (consolidated lookup file)

## Frequency

- **Backfill**: Run once or when you want to find videos for new openings
- **Main Pipeline**: Run daily/weekly to fetch new RSS videos and update matches
