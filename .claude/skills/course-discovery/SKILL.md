---
name: course-discovery
description:
  Run or modify the Lichess study import pipeline that matches study chapters to
  openings by FEN. Use when refreshing courses.json, changing study matching
  weights, adding curated studies, or auditing study coverage, contamination and
  duplication.
---

# Course discovery (study matching v2)

Matches Lichess study chapters to openings by FEN position, sorted by study
popularity. Output is `courses.json`.

```bash
npm run course:discover   # find popular Lichess studies (500+ likes)
npm run course:import     # fetch studies into the local cache + rebuild courses.json
npm run course:rematch    # rebuild from the cache only — offline, seconds
node scripts/audit-study-matches.js
```

## What rematch does and doesn't do

`course:rematch` rebuilds from the local study cache (`tools/data/study-cache/`,
gitignored) and makes **zero Lichess API calls**. So `likes` counts go stale,
and newly curated studies are missing until a `course:import` run fetches them.
Cache hits are skipped on import; `--refetch` forces a re-fetch.

`courses.json` is a **full rebuild** on every run. Never hand-edit it.

## After any matcher or weight change, audit

```bash
node scripts/audit-study-matches.js
```

Reports coverage, contamination, duplication and ranking ties, and reads both v1
and v2 schemas.

## Configuration

- `config/study_matching.json` — scoring weights
- `tools/video-pipeline/lib/opening-families.js` — family compatibility, shared
  with the video matcher. A change here affects both pipelines; audit both.

Full documentation: `tools/course-discovery/README.md`.
