# Active Context

**Date:** 2026-06-13

## Current Task: Video Pipeline Assessment

**Status:** Assessment complete on branch
`claude/video-pipeline-assessment-0gg422` (based on PR #41). Report:
`docs/reviews/2026-06-13-video-pipeline-assessment.md`. No behaviour changes —
measurement + prioritised recommendations only.

Measured the live `video-index.json` (2026-03-15) against ECO + popularity data.
Provenance is the pipeline's strength (16-channel allowlist, family-level
accuracy 94%); variation-level matching is the weakness:

- Family-generic videos blanket sub-variation pages (one Alapin video on 383
  pages); only 36.9% of sub-variation pages have a variation-specific #1 video.
- 6.0% cross-family contamination via shared variation names (Tartakower,
  Exchange, Steinitz…) — enumerated incompatibility pairs are incomplete.
- Score saturation: 85% of pages have ties inside the displayed top-4; views/
  recency/`boost_factor` unused in ranking.
- Pre-filter regexes lack word boundaries: `fun` rejects "Fundamentals", `live`
  rejects "delivers", `round` rejects "grounded" — verified.
- Rematch is lossy (no description/tags persisted); index 3 months stale (RSS
  15-video window makes gaps permanent); 4 FEN lowercase-collision pairs.

Recommendations tiered: serving-side tiebreakers + regex fixes (T1), moves-based
family compatibility (T2), scheduled runs + hub-page fallbacks (T3), one-time
LLM classification of the 917-video corpus (T4), plus an
`audit-video-matches.js` regression harness with 4 target metrics.

## Previous Task: Common Plans Provenance Fix (2026-06-12, PRs #40/#41)

Root-caused the design-review "wrong plans" finding: `/eco-analysis/:code`
served the alphabetically-first record per ECO bucket (95.9% of pages wrong).
Fixed by passing the page's own plans as a prop and deleting the bucket route.
Audit tool: `scripts/audit-common-plans.js`. Details in `archive.md`/PR #40.
