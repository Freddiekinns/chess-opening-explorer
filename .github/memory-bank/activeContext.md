# Active Context

**Date:** 2026-07-06

## Current Task: Review Remediation — Perf + Existing-Feature Fixes

**Status:** Complete on `claude/chess-resource-review-xmdqkl`. Implements the
2026-07-02 project review's §1.1–1.3 and §2.2–2.4 (user-selected scope; §2.1
studies/videos split out for later, §3 new features and §1.4 ops automation
deliberately not done — §1.4 recommendation: monthly pipeline GitHub Action +
E2E in CI still worth scheduling).

Shipped (all measured/tested):

- **P1/P2**: route-level code splitting + static MiniBoard (vendored piece SVGs
  in `pieceSvgs.ts`) — main chunk 409→189 kB; chess stack (112 kB) loads only on
  detail route / PGN modal / first analysis.
- **P3**: Analyse loads the search-index lazily at first analysis (was every
  mount); browser `max-age` on search-index; fixed `fields=lookup` cache-key
  collision. Note: `fields=lookup` itself is NOT usable by Analyse — the page
  renders moves + family_id.
- **P4**: self-hosted variable-font woff2 (public/fonts/, immutable-cached,
  middleware matcher excludes `fonts/`).
- **P5/P8**: console.log sweep, on-brand splash; `/api/openings/all` → 410.
- **P6**: seo-lookup sharded ×16 (~107 kB each); djb2 hash pinned by test in
  both generator and middleware.
- **P9**: `GET /api/openings/page/:fen` aggregates opening+stats+videos+
  courses+tree; detail page makes ONE fetch (was 5 across 4 functions).
- **P10**: cold-start timing logs (ECO parse, video-index parse).
- **P11**: `api/data/` is the single canonical data location — removed dup
  video-index (16 MB) + stub popularity_stats from packages/api/src/data, moved
  courses.json, dropped pipeline/vercel-prepare copy steps. **The
  copy-after-regenerate gotcha is gone** (CLAUDE.md updated).
- **§2.2**: audio fetch path removed (oscillator tones only); hero-cards show
  full distinguishing lines; family child rows labelled "Main line";
  PersonalOpeningStats split (862 lines + usePersonalGames/useFamilyRollups/
  personalStatsLib/OpeningRow/PersonalStatsControls); **practice depth** — short
  lines extend up to +6 plies into the most popular book continuation via the
  tree (tagged "incl. book continuation").
- **§2.3**: OpeningCard/RepertoireSection cards are real `<a>` links (crawlable,
  middle-click, Space); MiniBoard aria-hidden; detail section headings H3→H2.
- **§2.4**: "Star any opening" copy, "1 game" pluralisation, mobile filter chips
  scroll in one row. Footer links stay bundled with family hubs.

Suites: 52/724 backend, 17/200 frontend, build green.

## Previous Task: Project Review (2026-07-02, PR #44 merged)

Two docs: `docs/reviews/2026-07-02-project-review.md` +
`2026-07-02-video-experience-review.md`. Video rematch still NOT shipped — user
must run the §2 ship checklist locally (backfill → pipeline → audit → commit; no
copy step anymore). Older history in `archive.md`.
