# Active Context

**Date:** 2026-07-13

## Current Task: Slice 1 Evidence Engine + right-column redesign (branch `feat/evidence-engine-slice1`)

**Status:** Slice 1 shipped (PR raised 2026-07-12); the 2026-07-13 right-column
redesign is the outcome of Fred's separate design review and is committed onto
the same branch/PR. PRD `docs/proposals/2026-07-11-deviation-trainer-prd.md` §5.

**Evidence engine:** `/api/explorer` proxy attaches `LICHESS_EXPLORER_TOKEN`
(auth-gated since 2026-03; zero-scope, 25 req/min; the **route owns its CDN
Cache-Control** — no vercel.json entry). **Token is set in Vercel env.** Client
`lib/lichessExplorer.ts` normalises + caches (TTL 7d/24h, LRU 200, dedupe).
Beacon `api/event.js` (`band_select`, `explorer_error`, `analyse_run`).

**Right-column redesign (2026-07-13):** the **PRD §5 as-built note is the
authoritative record**. Summary: `WinRatePanel` = one Stats card (LevelLens
pills → Total games / Average Elo → win bar → master games); level-check strip
and bridge card cut; games-weighted `averageRating` (null when absent);
`OpeningNavigator` rows two-line with W/D/L bars incl. mobile; new **`All`**
band is the default (live stats + off-book on first load, ~3 Lichess queries per
uncached page view — see backlog); design-system preview
`components-opening-detail-right-column.html`. Verified: all suites green, build
clean, no 375px overflow (TASK007 guards hold).

**Merge-readiness pass (2026-07-13):** proxy 403s known crawler UAs before
touching Lichess (JS-rendering bots over 12k pages must not spend the 25/min
token; bots index the snapshot fallback); `/api/explorer` header entry removed
from vercel.json — the route owns per-band Cache-Control (config headers would
override function headers); PRD §4/§5 + plan doc annotated as-built (level
check + bridge card cut, `All` band default, dead metrics flagged).

**Snapshot fallback follow-up (branch `feat/snapshot-book-fallback`, on top of
PR #50):** tree API ships per-node snapshot W/D/L; book rows keep the same bars
when live data is absent (no off-book rows; sources never mixed in one list);
stats card holds a loading state instead of flashing the snapshot; snapshot
relabelled honestly — it is **all rated Lichess games**, not master games
(pipeline reads the full rated DB; CLAUDE.md corrected).

**Shipped (2026-07-13):** PR #50 and follow-up PR #51 both squash-merged to
main; production verified — explorer CDN cache HITs with route-owned headers,
crawler UAs 403. **Next:** Slice 2 per PRD §6. Watch beacons post-deploy.

## Previous Task: Study Matching V2 (PR #48, merged)

Cache + offline rematch, multi-anchor scored matcher, schema v2 + UI badges.
Coverage 18.2%→36.4% all / 92.0% top-200; contamination 0. Follow-ups: monthly
study-refresh Action; periodic `--refetch` for likes freshness.
