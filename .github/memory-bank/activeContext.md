# Active Context

**Date:** 2026-07-11

## Current Task: Deviation Trainer — Slice 1 Evidence Engine (branch `feat/evidence-engine-slice1`)

**Status:** Implemented, pending review/PR. PRD
`docs/proposals/2026-07-11-deviation-trainer-prd.md` §5; plan
`docs/superpowers/plans/2026-07-11-slice1-evidence-engine.md`.

- **Explorer proxy** `/api/explorer`
  (`packages/api/src/routes/explorer.routes.js`
  - `api/explorer.js` wrapper): Lichess gated the explorer behind auth in
    2026-03 (DDoS defence), so the server attaches `LICHESS_EXPLORER_TOKEN`
    (zero-scope, 25 req/min) and vercel.json CDN-caches responses (24h; masters
    7d via route header). **Set the token in Vercel env before deploy.**
- **Explorer client** `packages/web/src/lib/lichessExplorer.ts`: fetches via the
  proxy, band mapping server-side (PRD table), normalised result, memory +
  localStorage cache (TTL 7d/24h, LRU 200), in-flight dedupe, `ExplorerError`.
- **Logic modules**: `levelCheck.ts` (≥8 pp gap, ≥100 games/sample, points
  percentage for the side to move), `myLevel.ts` (site-wide band preference),
  `analytics.ts` (sendBeacon → `/api/event`, anon id, no-throw).
- **UI**: `WinRatePanel.tsx` wraps `WinRateBar` (new `meta` line) with band
  pills (lowest→highest), level-check strip, live continuations, notable games
  (avg-rating ranked, one game per player, cap 5), snapshot fallback (silent
  when passive; visible note after an explicit band click);
  `AnalyseBridgeCard.tsx` (≥1,000 games, session dismiss). Wired in
  `OpeningDetailPage`; `analyse_run` tracked in `usePersonalGames`.
- **Beacon route** `api/event.js`: 204/405, structured console line → Vercel
  runtime logs (counts only, no PII); `vercel.json` no-store header + rewrite.
  Doubles as S4-lite (`explorer_error` events).
- **Tests**: 41 new frontend (explorer/levelCheck/myLevel/analytics/panel/
  bridge) + 15 backend (event endpoint, explorer proxy). Design-system preview:
  `components-level-check.html`. Verified live end-to-end in dev (band swap,
  notable games, masters 34/48/19 vs club 48/5/47).

**Deviations from PRD prose**: target component was `WinRateBar` (PRD named the
unused `OpeningStats.tsx`); §9 beacon chosen over breadcrumbs; live
continuations render inside the stats panel (Opening book navigator untouched).

**Next**: Slice 2 (deviation detection in `usePersonalGames`, leak panel,
practice-param CTA) per PRD §6.

## Previous Task: Study Matching V2 (PR #48, merged)

Cache + offline rematch, multi-anchor scored matcher, schema v2 + UI badges.
Coverage 18.2%→36.4% all / 92.0% top-200; contamination 0. Follow-ups: monthly
study-refresh Action; periodic `--refetch` for likes freshness.
