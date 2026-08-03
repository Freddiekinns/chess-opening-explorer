---
name: video-pipeline
description:
  Run or modify the YouTube video discovery pipeline that matches chess videos
  to openings. Use when refreshing the video index, changing matcher scoring or
  channel config, debugging why a video ranks on the wrong opening, or auditing
  video coverage and contamination.
---

# Video pipeline

Discovers YouTube videos from trusted channels and matches them to openings.
Output is `api/data/video-index.json` — written directly by the pipeline, no
copy step. Database is `tools/data/videos.sqlite`.

## Modes

```bash
npm run pipeline          # incremental: RSS discovery, free, the default
npm run pipeline:full     # full catalogue rebuild via YouTube API, needs key
npm run pipeline:rematch   # re-score existing videos, zero API cost
```

Legacy standalone steps (`pipeline:complete`, `pipeline:discover`,
`pipeline:prefilter`, `pipeline:enrich`, `pipeline:match`) still work but are
superseded by the modes above.

`YOUTUBE_API_KEY` in `.env` is required for `full`. YouTube allows 10,000 quota
units/day; RSS is free.

## Before a rematch, backfill

`pipeline:rematch` re-scores **from the database only** — it does not re-fetch
from YouTube. So `view_count` and `thumbnail_url` go stale, and on databases
created before the `description`/`tags` columns existed, content matches are
scored from titles alone.

```bash
node tools/video-pipeline/scripts/backfill-views.js   # ~35 API calls for ~1700 videos
npm run pipeline:rematch
```

Run the backfill **once before** a rematch to populate views, thumbnails,
descriptions and tags.

## After any scorer or data change, audit

```bash
node scripts/audit-video-matches.js
```

Checks coverage, variation specificity, cross-family contamination, and ranking
ties. Treat a rise in contamination or a fall in top-200 coverage as a
regression.

## Configuration

- `config/video_matching.json` — scoring weights, `variation_modifiers`
  (accelerated/semi/anti/…), `specific_variation_keywords`
- `config/youtube_channels.json` — the 16 trusted channels and their tiers. This
  is the single source of truth; never hardcode channel lists in matcher code.

Never guess a YouTube channel ID. Verify with the user, or test the RSS feed at
`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`.

## Automation

`.github/workflows/video-refresh.yml` runs the incremental pipeline monthly,
audits before and after, and opens a PR with the metric diff. It fails fast at
guard steps until `tools/data/videos.sqlite` is committed and the
`YOUTUBE_API_KEY` repo secret is set.

Full architecture, matcher internals and troubleshooting:
`tools/video-pipeline/README.md`.
