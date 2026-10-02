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

## The corpus is the cache, not the database

`pipeline:rematch` scores the `videos` table **plus every other video in
`tools/data/video_enrichment_cache.json`** (`lib/enrichment-corpus.js`).

The table only holds past winners — matching writes back the top 10 per opening
and nothing else, so it carries ~1,700 of the ~10,200 videos ever fetched.
Scoring it alone is a ratchet: a better scorer can only reshuffle the previous
one's survivors. Never "simplify" rematch back to a DB-only read.

## Two things the scorer deliberately distrusts

- **A description mention is not a subject.** Series descriptions cross-link
  their sibling episodes, so on a sub-variation page a description/tags hit only
  counts when the title names the variation as well.
- **A score tie is not a coin toss.** Short variation names (Smith-Morra, Prins,
  O'Kelly) get no specificity swing by design, so their candidates all tie;
  `compareMatches` breaks that on how much of the variation the title names,
  before view count. Do not reduce it to popularity again.

## Before a rematch, backfill

Rematch does not re-fetch from YouTube. So `view_count` and `thumbnail_url` go
stale (recovered cache videos most of all), and on databases created before the
`description`/`tags` columns existed, content matches are scored from titles
alone.

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

## Jev filters the index after the scorer

Every mode ends with `scripts/apply-jev-filter.js`, which removes a pair from
`video-index.json` when Jev says the video is `mentioned_only` or `not_about`
that page with P(good) < 0.4. The scorer's output in SQLite is untouched, so **a
video the matcher kept can still be missing from the page** — check
`tools/data/jev-relation-cache.json` before debugging the scorer.

- Only confident rejections act. Jev's acceptances are unreliable on sibling
  variations, so never use them to rank.
- Answers are cached per video and named opening and committed; only new pairs
  are paid for. It fails open without `JEV_API_KEY`.
- Then `config/video_pins.json` puts hand-verified videos first on their named
  opening's pages (`lib/video-pins.js`). A video on a page that the scorer never
  matched is probably a pin. Pin only what Jev and the judge agree on, never on
  Jev's word alone.
- After a scorer change, the audit's "#1 names the variation" dips slightly
  under the filter. That metric is a keyword test, and most of what Jev removes
  there is a keyword false positive. Sample the changed pages before treating it
  as a regression.

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
`YOUTUBE_API_KEY` repo secret is set. The `JEV_API_KEY` secret is optional:
without it, new pairs go unfiltered.

Full architecture, matcher internals and troubleshooting:
`tools/video-pipeline/README.md`.
