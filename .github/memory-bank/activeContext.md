# Active Context

**Date:** 2026-07-02

## Current Task: Project Review — Performance + Feature Assessment

**Status:** Complete on `claude/chess-resource-review-xmdqkl`. Full review
written to `docs/reviews/2026-07-02-project-review.md`, assessing the project
against the goal of an excellent opening learning resource. No production code
changed.

Key findings (measured, not estimated):

- **Perf**: single 409 kB JS chunk (no route splitting; `MiniBoard` drags
  react-chessboard into the landing bundle); Analyse re-downloads the full 1.6
  MB search-index every mount (no browser `max-age`, ignores `fields=lookup`);
  edge middleware fetches a 1.7 MB SEO lookup per cold start; 5 API calls per
  detail page across 4 functions; `/api/openings/all` (24.8 MB) still exposed
  with zero client users; `video-index.json` ×2 and a 2-byte
  `popularity_stats.json` in `packages/api/src/data/`.
- **Trust leftovers**: **video rematch was NEVER run** — both index copies
  byte-identical, stamped 2026-03-15; audit shows old baseline (28.2% coverage,
  7.9% cross-family = 1,577 wrong-family matches live). ALL popularity stats
  dated 2025-07-15 (~12 months stale). Study title dupes + wrong-family studies
  unfixed; practice audio files don't exist; OpeningCard still
  `div role="button"`.
- **Ops**: 8 Playwright E2E specs never run in CI; no data-freshness automation
  (doc §1.4 proposes monthly RSS-pipeline GitHub Action + audit auto-PR).
- **Health**: both suites green (716 + 198) — progress.md's "16 broken tests"
  was stale, now corrected.
- **Feature ranking (re-ranked from TASK008)**: book-deviation trainer first
  (Analyse already imports 500 games — cheap now), then rating-contextualised
  stats + master games (one Lichess-explorer integration), family hub pages with
  video shelves, SRS, repertoire v2, middlegame bridge last. Doc §6 adds the
  video-experience plan: family fallback for empty galleries, embedded player +
  watched state, chapter-level matching (deep-link `?t=` into survey videos).

**Next step (user decision):** run the §6.2 ship checklist locally (backfill →
pipeline → audit → copy → commit), then pick from the "Now" row of the
sequencing table.

## Previous Task: Video Matching — Intra-Family Variation Guard (2026-06-23)

On `claude/video-pipeline-assessment-0gg422` (merged as PR #43): intra-family
variation guard in `calculateMatchScore` — family matches on sub-variation pages
kept only if the video names that variation; offline re-score: coverage 67%,
#1-specificity 61.9%, cross-family 0%. Ship via `backfill-views.js` →
`pipeline:rematch` → `audit-video-matches.js` (user, locally — still pending).
Older history in `archive.md`.
