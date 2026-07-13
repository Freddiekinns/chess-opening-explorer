# Active Context

**Date:** 2026-07-13

## Current Task: Slice 1 Evidence Engine + right-column redesign (branch `feat/evidence-engine-slice1`)

**Status:** Slice 1 shipped (PR raised 2026-07-12); the 2026-07-13 right-column
redesign is the outcome of Fred's separate design review and is committed onto
the same branch/PR. PRD `docs/proposals/2026-07-11-deviation-trainer-prd.md` §5.

**Evidence engine (unchanged):** `/api/explorer` proxy attaches
`LICHESS_EXPLORER_TOKEN` (Lichess gated the explorer behind auth in 2026-03;
zero-scope, 25 req/min; CDN-cached via vercel.json). **Set the token in Vercel
env before deploy.** Client `lib/lichessExplorer.ts` normalises + caches (TTL
7d/24h, LRU 200, in-flight dedupe). Beacon `api/event.js` (`band_select`,
`explorer_error`, `analyse_run`) → runtime logs, counts only.

**Right-column redesign (2026-07-13, Claude Design mock, match-mock-exactly):**
spec
`docs/superpowers/specs/2026-07-13-opening-detail-right-column-redesign-design.md`.

- `WinRatePanel` is now one **Stats card**: level pills (`LevelLens`, label
  dropped, aria kept) → `Total games` / `Average Elo` stat pair → win bar +
  legend → master games. **Dropped** the level-check strip (+ `levelCheck.ts`,
  deleted), the analyse bridge link, and the card title. `onBandChange` prop.
- `lib/lichessExplorer.ts`: added games-weighted position `averageRating` (from
  `moves[].averageRating`); `null` when absent — never fabricated.
- `OpeningNavigator`: rows restyled to a two-line stacked layout (move+name /
  white% · bar · black% · count); result bar now shown on mobile (the old
  `display:none` is gone). Structure (breadcrumb / Next moves / "Instead of …")
  unchanged.
- **`All` band (2026-07-13):** new broadest band (every Lichess rating), now the
  default when no level is saved, so the book shows live win rates + off-book on
  first load. Reset pill removed (`All` is the reset-equivalent). Costs ~3
  Lichess queries per uncached page view — see backlog rate-limit note.
- Overview card unchanged. Design-system preview replaced:
  `components-opening-detail-right-column.html` (old
  `components-level-check.html` removed).
- Verified: 46 targeted frontend tests green, `tsc`+`vite` build clean, no 375px
  overflow (TASK007 guards hold), live band re-ranks Next moves in dev. Note:
  the Stats-card live fetch is `IntersectionObserver`-gated and doesn't fire in
  the Browser pane (known stall) — its logic is covered by unit tests.

**Next:** Fred to review the redesign; then Slice 2 (deviation detection, leak
panel, practice-param CTA) per PRD §6. Watch beacons post-deploy.

## Previous Task: Study Matching V2 (PR #48, merged)

Cache + offline rematch, multi-anchor scored matcher, schema v2 + UI badges.
Coverage 18.2%→36.4% all / 92.0% top-200; contamination 0. Follow-ups: monthly
study-refresh Action; periodic `--refetch` for likes freshness.
