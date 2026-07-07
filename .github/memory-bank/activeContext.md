# Active Context

**Date:** 2026-07-07

## Current Task: Video Experience V1–V3 (branch `claude/video-experience-v1-v3`)

**Status:** Complete. Implements the "Next/Then" horizon of
`docs/reviews/2026-07-02-video-experience-review.md`:

- **V1 — family fallback** (`family-resource-service.js`): when a page has no
  exact-position videos/studies, `/videos/:fen` and `/page/:fen` return the
  family's best resources (deduped by video id / study URL, ranked by score then
  views / likes, capped 8 videos / 6 studies). Response carries
  `source: 'position'|'family'|'none'` + `family {id, name}`; the page labels
  the shelf "Videos for the <family>" with a muted attribution note. Family
  index builds lazily once per process (~0.5 s, then instant).
- **V2 — match-reason badges**: `matchReason: 'variation'|'family'` per video on
  sub-variation pages (family-root pages get no badge). Logic extracted to
  `packages/api/src/utils/variation-words.js`, shared with
  `scripts/audit-video-matches.js` (audit re-verified: same numbers).
- **V3 — in-place player + watched**: thumbnail is a play button; clicking swaps
  in a `youtube-nocookie.com` iframe (nothing loads from YouTube until play).
  Watched state in localStorage (`lib/watchedVideos.ts`, capped 500); "Watched"
  chip on cards. Title remains an external YouTube link.

Also: `tests/unit/VideoGallery.test.tsx` was an orphan (jest only runs
`*.test.js`, web vitest only scans `packages/web`) — moved to
`packages/web/src/components/detail/__tests__/` where it actually runs, which
exposed and fixed a real `formatDate` invalid-date bug.

Suites: backend 55/739, frontend 17/207, e2e 9/9, lint + tsc + build green.
Verified against the live index with Playwright (fallback shelf on an empty
Sicilian page, badges on the Najdorf page, player expansion + watched chip).

Freshness Action shipped too (`.github/workflows/video-refresh.yml`): monthly
RSS pipeline + audit + auto-PR with metric diff, guarded against a collapsed
index. **PR #46 open**; a coverage-gate follow-up commit lifted global branches
to 90.33%. Safe to merge before the enablement steps — the workflow only runs on
schedule/dispatch and fails fast at its guards without touching anything.

Note: this PR improves how existing studies are SURFACED (family fallback
applies to studies too); the studies data itself (discovery runs, curation) is
untouched.

**What's left (video programme):**

1. User, local: commit `tools/data/videos.sqlite` (gitignore exception is in the
   PR) and confirm the `YOUTUBE_API_KEY` Actions secret exists — then the
   monthly Action is live (verify via workflow_dispatch; guards report which
   piece is missing).
2. User, local: §2 ship checklist — backfill → `npm run pipeline` → audit →
   commit index (the single biggest win: 28.2%→~67% coverage, 0% cross-family).
3. Later: V4 family video shelves (needs family hub pages), V5+V6 taxonomy/
   LLM + chapter matching (one project), studies data-quality work.

## Previous Task: Analyse Dashboard Visual Redesign (PR #45, merged)

Personal-performance tokens (sage/grey/brick) replacing the misapplied result
colours, carded performance sections (desktop + mobile family cards), slim
distribution bars, warm hovers/popovers, sort-menu a11y polish, dead mobile-row
path removed. Older history in `archive.md`.
