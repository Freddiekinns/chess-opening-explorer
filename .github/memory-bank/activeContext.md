# Active Context

**Date:** 2026-06-13

## Current Task: Video Pipeline Fixes (Tier 1 + Tier 2 of the assessment)

**Status:** Implemented on `claude/video-pipeline-assessment-0gg422`, after the
assessment in `docs/reviews/2026-06-13-video-pipeline-assessment.md`. All
backend tests pass; verified end-to-end by simulating `pipeline:rematch` against
the 917 live-index videos.

- **Move-prefix family compatibility**
  (`tools/video-pipeline/lib/opening-families.js`): families map to defining
  moves; conflicts derived, not enumerated. Multi- opening titles reject only if
  every named family conflicts. Cross-family contamination: 7.9% → **0%**.
- **Variation specificity** (+25 specific / −40 miss) + view/recency tiebreakers
  (matcher sort + `getTopVideosForOpening` ORDER BY). #1-video specificity 36.9%
  → **57.6%**; displayed-order ambiguity → 0.
- **Move-notation names** ("Scandinavian: 2.exd5") match via family part —
  coverage 28.2% → **71%**, top-200 played 150 → 163.
- **Pre-filter word boundaries** + educational exemption for casual terms;
  `fun`/`live`/`round` no longer reject "Fundamentals"/"delivers"/"background".
- **Config externalised**: weights/threshold in `config/video_matching.json`;
  channel tiers solely from `config/youtube_channels.json` (Hanging Pawns,
  GingerGM, Eric Rosen promoted to premium = old scorer behaviour).
- **DB persists description/tags** (migration in schema-manager);
  `backfill-views.js` now also fills them — run it BEFORE rematch on old DBs.
- **FEN case collisions fixed**: shared
  `packages/api/src/utils/fen-sanitizer.js` (uppercase → `0x` escape); API looks
  up new key, falls back to legacy.
- **Audit harness**: `node scripts/audit-video-matches.js` (+ `--json`).

**To ship the new index (user, locally):**
`node tools/video-pipeline/scripts/backfill-views.js` →
`npm run pipeline:rematch` → `node scripts/audit-video-matches.js`. Deferred by
design: scheduling (user runs manually), hub-page family fallbacks (needs
labelled-UI decision), channel-list expansion (IDs must be user-verified), LLM
classification (T4).

## Previous Task: Video Pipeline Assessment (2026-06-13)

Measured the live index against ECO + popularity data; found family blanketing,
6% cross-family contamination, 85% top-4 score ties, word-boundary pre-filter
bugs, lossy rematch, staleness. Full report + metrics in
`docs/reviews/2026-06-13-video-pipeline-assessment.md`.
