# Active Context

**Date:** 2026-06-23

## Current Task: Video Matching — Intra-Family Variation Guard

**Status:** On `claude/video-pipeline-assessment-0gg422`. Review of the earlier
fixes found the 28%→71% coverage gain was mostly **family-level blanketing** of
move-notation pages: one Sicilian video could attach to 1,400+ pages, and
specific-variation videos (Dragon) landed on sibling pages (Najdorf) — an
intra-family error the move-prefix guard (e4 vs d4) can't catch.

- Deleted dead `runNewMatching()` (unused, had a latent ISO-vs-seconds bug).
- Added **intra-family variation guard** (`calculateMatchScore`): a family match
  on a sub-variation page is kept only if the video names that page's variation;
  generic overviews still cover pages, move-tail pages match on named tokens
  (ignoring "7.Bb3"), pure move-notation pages keep generics only.
  `specific_variation_keywords` in `config/video_matching.json`.
- Verified by offline re-score of the 917 live videos (no DB/key in this env):
  coverage 67%, top-200 81.5%, #1-specificity **61.9%** (was 36.9%),
  cross-family **0%**. Strictly dominates the live index on every metric.
- **Known limitation:** denylist can't catch the long tail (Chekhover, Prins,
  apostrophe variants); mean fan-out still ~82/video. The real fix is
  variation-level classification (one-time taxonomy/LLM pass) — recommended next
  project, also fixes the title-keyword quality gap.

**Decision pending:** ship coverage-first (this guard) vs precision-first
(disable family blanketing, ~26% coverage but every match exact). Leaning ship.

## Previous Task: Video Pipeline Fixes — Tiers 1 + 2 (2026-06-13)

Implemented after `docs/reviews/2026-06-13-video-pipeline-assessment.md`:
move-prefix family compatibility (`opening-families.js`, cross-family 7.9%→0%),
variation specificity + view/recency tiebreakers, move-notation name matching,
pre-filter word boundaries, config externalised (`video_matching.json`, channel
tiers from `youtube_channels.json`), DB persists description/tags
(+`backfill-views.js`), FEN case-collision fix (`fen-sanitizer.js`), audit
harness (`scripts/audit-video-matches.js`). Older history in `archive.md`.

**To ship the new index (user, locally):**
`node tools/video-pipeline/scripts/backfill-views.js` →
`npm run pipeline:rematch` → `node scripts/audit-video-matches.js`.
