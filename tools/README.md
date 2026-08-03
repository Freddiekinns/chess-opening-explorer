# Tools

Four data pipelines. Each has its own README with full documentation; the
`.claude/skills/` entries carry the runbooks.

| Directory           | Purpose                                            | Language | Skill              |
| ------------------- | -------------------------------------------------- | -------- | ------------------ |
| `video-pipeline/`   | YouTube discovery and matching to openings         | Node     | `video-pipeline`   |
| `course-discovery/` | Lichess study import, matched to openings by FEN   | Node     | `course-discovery` |
| `llm-enrichment/`   | Opening descriptions via Google Vertex AI          | Node     | —                  |
| `analysis/`         | Opening statistics from the Lichess rated database | Python   | `popularity-stats` |

`data/` holds the persistent stores: `videos.sqlite` (video database),
`study-cache/` (gitignored Lichess study cache), and API response caches.
`packages/` holds shared internal modules.

## Where output goes

All pipelines write to `api/data/`, which is the canonical data location in
every environment. Nothing copies to `packages/api/src/data/` — that mirror was
removed in July 2026 and holds only `seed.sql`.

## Commands

See `package.json`. The non-obvious ones:

- `npm run pipeline:rematch` re-scores videos from the database with zero API
  calls — but run `tools/video-pipeline/scripts/backfill-views.js` first, or
  view counts and thumbnails go stale.
- `npm run course:rematch` rebuilds `courses.json` from the local cache with
  zero API calls — `likes` go stale and newly curated studies are missing until
  a `course:import` run.
- `python tools/analysis/run_pipeline.py --incremental` processes only new
  months, which is much faster than a full re-run.
