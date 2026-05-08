# Active Context

**Date:** 2026-05-08

## Current Task: Opening Family Rollups Phase 1 — Shipped

**Status:** Complete on branch `feature/opening-family-rollups`. All 12 tasks
across Modules 1–4 landed. Ready for review/merge.

**What shipped:**

- Hand-curated `data/families.json` (28 families) + `data/family-overrides.json`
  (~140 rules) → resolver in `tools/family-taxonomy/resolve-family.js` enriches
  every ECO record at build time. **Coverage 98.45%** (192/12,377
  uncategorised), gated by Jest test.
- `family_id` exposed on `/api/openings/search-index` (full mode only;
  lookup-only branch unchanged). Search-index payload grew **+10.36%** — inside
  the 20% bandwidth gate. Display name intentionally NOT shipped per-row; joined
  client-side from `/api/families` to keep payload small.
- New `GET /api/families` endpoint (28 entries, ~5 KB, includes `opening_count`
  per family). Cache-Control
  `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`.
- Pure `groupByFamily()` aggregation helper + Variation/Family toggle on
  `PersonalOpeningStats`. Family rows show display name, total games, variation
  count, distribution bar; expand to reveal per-variation breakdown. Disclosure
  pattern with `aria-expanded` + `aria-controls`.

**Tests:** 14 backend (taxonomy + families route) + 14 frontend
(PersonalOpeningStats including 3 new family-rollup tests) + 5 aggregation
helper. All green. `npm run build` clean.

**Spec deviations logged:**

- Aggregation is client-side (not server-side `?group_by=family` per spec §5.2)
  — kept payloads small.
- `family_display_name` deliberately omitted from search-index to halve raw
  payload growth.
- Coverage came in at 21% pre-backfill (plan hypothesis 80%); ~140 override
  rules added to reach 98.45%.

**Follow-ups (not blocking merge):**

- `/api/openings/search-index` `s-maxage` is currently 3600 (1h); should be
  bumped to 86400 (24h) to amortise the now-3.2 MB payload across edges.
  Pre-existing; flagged for separate PR.
- Phase 2 (family lens route + chip system) and Phase 3 (repertoire grouping) to
  be planned when their turn comes.

**Branch:** `feature/opening-family-rollups`. 11 commits since branch point
(plan doc + 10 implementation commits across Modules 1–4).

## Previous Task: TASK008 Rewrite — Feature Roadmap & Exploration

Replaced old competitive-analysis TASK008 with a UX-level roadmap of 12
features. Top-three: family rollups, rating-contextualised stats, spaced
repetition.
