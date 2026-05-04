# Active Context

**Date:** 2026-05-04

## Current Task: Opening Family Rollups Phase 1 — Taxonomy module shipped

**Status:** In progress. Phase 1 Module 1 (taxonomy + build pipeline) complete.

Hand-curated `data/families.json` (28 families) plus
`data/family-overrides.json` (~140 rules covering all common ECO naming variants
— `Sicilian:` vs `Sicilian Defense:`, `QGD/QGA` abbreviations, Gruenfeld
no-umlaut, Spanish=Ruy Lopez aliases, Indian Game splits to
KID/Nimzo/QID/Grünfeld) feed a pure resolver in
`tools/family-taxonomy/resolve-family.js`. Build-time enrichment via
`tools/family-taxonomy/build-family-index.js` (wired into
`scripts/prepare-vercel-data.js`) writes `family_id` + `family_display_name`
into every ECO record.

**Coverage: 98.45%** (192 / 12,377 uncategorised). Coverage-gate Jest test
asserts <2% uncategorised. 14 unit tests passing across the two test files
(`tools/family-taxonomy/tests/`).

**Scope deviation logged:** Plan estimated ~80% colon-prefix coverage; reality
was 21% pre-backfill. Override file went from 14 → 140 rules. Mitigation: 5%
threshold left as design lever in `build-family-index.js` if data drifts.

**Branch:** `feature/opening-family-rollups`. Six commits since branch point
(plan doc + 5 implementation commits).

**Next:** Module 2 (`/api/families` endpoint, search-index family fields) and
Module 3 (Analyse-page Variation/Family toggle with rollup rendering). Plan in
`docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1.md`.

## Previous Task: TASK008 Rewrite — Feature Roadmap & Exploration

Replaced old competitive-analysis TASK008 with a UX-level roadmap of 12
features. Top-three: family rollups, rating-contextualised stats, spaced
repetition.
