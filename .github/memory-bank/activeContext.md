# Active Context

**Date:** 2026-07-10

## Current Task: Study Matching V2 (branch `feat/study-matching-v2`)

**Status:** Complete, pending PR. Rebuilt Lichess study → opening matching with
the video-pipeline lessons (spec
`docs/superpowers/specs/2026-07-10-study-matching-v2-design.md`, report
`docs/reviews/2026-07-10-study-matching-v2.md`):

- **Cache + offline rematch**: raw study PGN/metadata in
  `tools/data/study-cache/` (gitignored); `npm run course:rematch` rebuilds
  `api/data/courses.json` in seconds with zero API calls.
- **Multi-anchor scored matcher** (`lib/study-matcher.js`): every ECO position
  along a chapter's move path is a candidate anchor, guarded by move-prefix
  family compatibility (shared `opening-families.js`), scored via
  `config/study_matching.json` (specificity + family + log-likes + chapters),
  aggregated to one entry per (study, page), capped 20/page.
- **Schema v2 + UI**: `study_title`/`chapter_title` split, `match.score/reason`;
  `StudiesGallery` renders one card per study with chapter count and "Covers
  this variation" / "Explores deeper lines" badges.
- **Audit** `scripts/audit-study-matches.js` (reads v1+v2). Results: coverage
  18.2%→35.7% all, 62.5%→**91.5%** top-200, 45.2%→80.3% top-1000; contamination
  5.8%→**0**; dupes 1,329→0; title dupes→0; max/page 103→20.
- Extras: fixed path-resolver in git worktrees (ECO data unresolvable there),
  "London Opening" title detector, 403 = private study (not an error), legacy
  `course-discovery/index.js` + merge helpers deleted.

Suites: backend 748, frontend 213, build green; verified in the running app
(Sicilian + Caro-Kann Advance pages — no London studies on Caro pages).

**Follow-ups:** prune 190 dead studies from `curated-studies.txt` / fresh
`course:discover` run; monthly study-refresh Action mirroring
`video-refresh.yml`; periodic `--refetch` for likes freshness.

## Previous Task: Video Index Refresh — §2 Ship Checklist (PR #47, merged)

Backfilled views/thumbnails/descriptions/tags for 1,708 videos, full rematch:
coverage 28.2%→72.8%, top-200 91.5%, cross-family 0%. Monthly Action live (one
repo setting pending: "Allow GitHub Actions to create and approve pull
requests"). Older history in `archive.md`.
