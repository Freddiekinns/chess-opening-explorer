# Slice 1 — Evidence Engine (Lichess Explorer Integration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detail pages gain a level-aware Win Rate panel (live Lichess explorer
bands + zero-interaction level check + notable master games), a bridge card to
Analyse, and fire-and-forget instrumentation — per PRD
`docs/proposals/2026-07-11-deviation-trainer-prd.md` §5.

**Architecture:** A pure client module (`lichessExplorer.ts`) fetches and
normalises explorer data with a two-layer cache (in-memory + localStorage, TTL +
LRU). Pure logic modules (`levelCheck.ts`, `myLevel.ts`, `analytics.ts`) stay
React-free and unit-testable. One new container component (`WinRatePanel.tsx`)
owns band state and lazy fetching; `WinRateBar` stays a dumb presenter. One tiny
serverless route (`api/event.js`) receives beacons and logs structured JSON to
Vercel runtime logs (the v1 "store" — counts only).

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library (frontend), Jest
(backend, repo-root `tests/`), CSS Modules, Vercel serverless wrappers.

## Decisions locked during PRD review (deviations from PRD prose)

1. **Target component**: the live Win Rate panel is
   `packages/web/src/components/detail/WinRateBar.tsx` (PRD names
   `OpeningStats.tsx`, which is exported but unused on the detail page).
2. **§9 / open question 3 — beacon wins**: one `/api/event` route takes both
   usage events and `explorer_error` events. That satisfies S4-lite ("error
   monitoring captures explorer failures") without a Sentry integration; full
   Sentry stays open as S4-proper.
3. **"Swaps the continuations list"**: live bands swap the panel and show the
   explorer's own top continuations _inside the stats panel_. The Opening book
   navigator (our index tree) is untouched — it answers "what is named theory",
   the explorer list answers "what do people play at this level".
4. **Scoring copy**: "scores N%" = points percentage (wins + draws/2), the chess
   convention, not raw win rate. Tested in `levelCheck.test.ts`.
5. **"My level" = any explicit band selection** (masters included); clearable
   via a small "reset" control on the panel.

## Global Constraints

- Speeds param is always `blitz,rapid,classical` (PRD §5.2).
- Band → ratings mapping (PRD table): Masters→`/masters`; 2200+→`2200,2500`;
  1800–2200→`1800,2000`; 1400–1800→`1400,1600`; Under 1400→`0,1000,1200`.
- Cache TTL: `/masters` 7 days, `/lichess` 24 h; LRU cap 200 entries.
- Minimum sample for any rendered evidence: **≥100 games** per band per position
  (PRD §11.1). Level-check gap threshold: **≥8 pp** (PRD §11.2).
- No explorer request before the stats section is in view or the selector is
  touched (PRD acceptance).
- Failure mode: silent revert to snapshot panel; the page must never be worse
  than today's.
- Only FENs go to Lichess; only counts + anonymous id go to `/api/event`.
- Every new API route gets a `Cache-Control` entry in `vercel.json` (site rule).
- New visual surfaces get a design-system preview card in the same change
  (CLAUDE.md lockstep rule). No new tokens expected — reuse existing.
- Copy: sentence case, no "mistake/blunder" framing anywhere.
- Storage keys namespaced `openingbook:*` (existing convention).

---

### Task 1: Explorer client — `lichessExplorer.ts`

**Files:**

- Create: `packages/web/src/lib/lichessExplorer.ts`
- Test: `packages/web/src/lib/__tests__/lichessExplorer.test.ts`

**Interfaces (produced):**

```ts
export const BANDS: readonly {
  id: BandId;
  label: string;
  ratings: string | null; // null = /masters
}[];
export type BandId = 'masters' | '2200' | '1800' | '1400' | 'u1400';

export interface ExplorerMove {
  san: string;
  games: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}
export interface ExplorerTopGame {
  id: string;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  winner: 'white' | 'black' | null;
  year: number | null;
}
export interface ExplorerResult {
  totalGames: number;
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  topGames: ExplorerTopGame[];
}
export class ExplorerError extends Error {
  status?: number;
}
export function buildExplorerUrl(fen: string, band: BandId): string;
export function fetchExplorer(
  fen: string,
  band: BandId
): Promise<ExplorerResult>;
export function sideScorePct(r: ExplorerResult, side: 'w' | 'b'): number;
export function rankNotableGames(
  games: ExplorerTopGame[],
  cap?: number
): ExplorerTopGame[];
export function __resetExplorerCacheForTests(): void;
```

Implementation notes:

- URLs: masters →
  `https://explorer.lichess.org/masters?fen=…&moves=12&topGames=15`; lichess →
  `https://explorer.lichess.org/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=…&fen=…&moves=12&topGames=0&recentGames=0`.
  (Discovered during implementation: the API host is `explorer.lichess.org` per
  the current official spec; the legacy `explorer.lichess.ovh` from the PRD-era
  knowledge returns 401.)
- Normalisation truncates moves to 12 and topGames to 15 (cache-size control);
  tolerates missing `topGames` (lichess endpoint) as `[]`; throws
  `ExplorerError` on non-OK status (status captured, 429 included) and on
  malformed payloads (non-numeric totals).
- Cache: module-level `Map` (session) + localStorage key
  `openingbook:explorer-cache` holding `{ [band + '|' + fen]: { t, u, d } }` (t
  = fetchedAt for TTL, u = lastUsed for LRU). Prune to 200 by oldest `u`.
  In-flight promise dedupe map.
- `rankNotableGames`: sort by average of the two ratings desc; skip a game if
  either player's name already appears in the kept list; cap 5 (default).

- [ ] Steps: failing tests → implement → green. Test cases: URL per band
      (masters vs ratings param); normalisation of a realistic payload;
      malformed payload throws; 429 throws `ExplorerError` with status; second
      call hits memory cache (fetch called once); localStorage entry expires
      past TTL (vi.setSystemTime); LRU prunes past 200; `sideScorePct` =
      (wins+draws/2)/total; `rankNotableGames` sort/dedupe/cap/empty.

### Task 2: Preference + level-check logic — `myLevel.ts`, `levelCheck.ts`

**Files:**

- Create: `packages/web/src/lib/myLevel.ts`,
  `packages/web/src/lib/levelCheck.ts`
- Test: `packages/web/src/lib/__tests__/myLevel.test.ts`,
  `packages/web/src/lib/__tests__/levelCheck.test.ts`

**Interfaces (produced):**

```ts
// myLevel.ts — localStorage 'openingbook:my-level'
export function getMyLevel(): BandId | null; // null when unset/invalid
export function setMyLevel(band: BandId): void;
export function clearMyLevel(): void;

// levelCheck.ts
export interface LevelCheck {
  side: 'White' | 'Black'; // side to move in the fen
  mastersPct: number; // rounded points pct for that side
  bandPct: number;
  bandId: BandId; // the club band compared
  direction: 'band-better' | 'masters-better';
}
export function computeLevelCheck(
  masters: ExplorerResult,
  band: ExplorerResult,
  bandId: BandId,
  fen: string,
  opts?: { minSample?: number; minGapPp?: number } // defaults 100 / 8
): LevelCheck | null;
```

- [ ] Tests: set/get/clear round-trip; invalid stored value → null. Level check:
      gap ≥8 both directions; gap <8 → null; either sample <100 → null;
      black-to-move fen uses black's score; gap computed pre-rounding.

### Task 3: Instrumentation — `analytics.ts` + `api/event.js` + `vercel.json`

**Files:**

- Create: `packages/web/src/lib/analytics.ts`, `api/event.js`
- Test: `packages/web/src/lib/__tests__/analytics.test.ts`,
  `tests/api/event.test.js` (Jest)
- Modify: `vercel.json` (headers: `/api/event` → `Cache-Control: no-store`;
  rewrites: self-entry like `/api/health`)

**Interfaces (produced):**

```ts
export function getAnonId(): string; // localStorage 'openingbook:anon-id', crypto.randomUUID, stable
export function trackEvent(
  event: string,
  data?: Record<string, string | number>
): void;
// POST JSON string {event, page, id, ...data} via navigator.sendBeacon('/api/event', …)
// falls back to fetch(…, {method:'POST', keepalive:true}); never throws.
```

`api/event.js`: standalone handler (no Express needed) — 204 on valid POST, 405
otherwise; parses raw body chunks (sendBeacon sends text/plain); validates
`event` is a string ≤64 chars; `console.log(JSON.stringify({...}))` to Vercel
runtime logs; always `Cache-Control: no-store`.

- [ ] Tests: trackEvent calls sendBeacon with parseable payload incl. event,
      page, id; anon id stable across calls; no-throw when sendBeacon absent.
      Jest: GET → 405; POST valid → 204 + one structured log line; oversized
      event name ignored (still 204, no log).

### Task 4: Panel components — `WinRatePanel`, level check strip, notable games, live continuations

**Files:**

- Create: `packages/web/src/components/detail/WinRatePanel.tsx` +
  `WinRatePanel.module.css`
- Modify: `packages/web/src/components/detail/WinRateBar.tsx` (add optional
  `meta?: string` line), `packages/web/src/components/detail/index.ts`
- Modify: `packages/web/src/test/setup.ts` (IntersectionObserver mock)
- Test: `packages/web/src/components/detail/__tests__/WinRatePanel.test.tsx`

**Interfaces:**

```ts
interface WinRatePanelProps {
  popularityStats: PopularityStats | null; // snapshot (incl. analysis_date passthrough)
  fen: string;
}
```

Behaviour (all PRD §5.2/§5.4):

- Default view = snapshot WinRateBar with meta
  `Master games · updated {analysis_date}`.
- If `getMyLevel()` set → that band is default; else snapshot until touched.
- IntersectionObserver: first intersection triggers level-check fetches
  (masters + comparison band = myLevel ?? '1400', sequential, cached);
  `trackEvent('level_check_view')` only when the strip actually renders.
- Band pills (Masters / 2200+ / 1800–2200 / 1400–1800 / Under 1400): select →
  `setMyLevel`, `trackEvent('band_select', {band})`, swap panel to live data
  with meta `Lichess games, {label} · live` (or `Master games · live`), loading
  state inside the panel only; sub-100-game live samples render the "not enough
  games at this level" note instead of numbers.
- Live view also lists top 5 explorer continuations (san, games, W/D/L pcts).
- "Reset" control visible when a preference exists → `clearMyLevel()`, back to
  snapshot.
- Any `ExplorerError` → silent snapshot revert +
  `trackEvent('explorer_error', {status})`.
- Notable games: from cached masters result; `rankNotableGames`; links to
  `https://lichess.org/{id}`; section omitted entirely when empty.
- Rating-scale hint line: "Lichess ratings; chess.com players typically sit 1–2
  bands lower than their number suggests." shown with the pills.

- [ ] Component tests (mock `lichessExplorer` module): snapshot default + date
      label; selector swap renders live meta + continuations; loading state;
      error → snapshot (and no crash); level-check strip renders only when
      computeLevelCheck non-null (mock both fetches); strip absent when gap
      small; notable games render/omit; my-level preselects band; reset clears.

### Task 5: Bridge card + page wiring + analyse_run event

**Files:**

- Create: `packages/web/src/components/detail/AnalyseBridgeCard.tsx` +
  module.css
- Modify: `packages/web/src/pages/OpeningDetailPage.tsx` (WinRateBar →
  WinRatePanel; bridge card below the right-column stats)
- Modify: `packages/web/src/components/personal/usePersonalGames.ts:153`
  (`trackEvent('analyse_run')` at the top of a successful `handleAnalyse`)
- Test:
  `packages/web/src/components/detail/__tests__/AnalyseBridgeCard.test.tsx`

Bridge card: renders only when snapshot `games_analyzed >= 1000`; copy "See how
you actually play the {family} — free, no account." where family =
`opening.name` up to the first colon; plain `<Link to="/analyse">`; dismiss (×)
writes `openingbook:bridge-dismissed` = '1' to sessionStorage; click →
`trackEvent('bridge_click')`.

- [ ] Tests: hidden <1000 games; renders ≥1000 with family name; dismiss hides
      and persists for session; click fires event.

### Task 6: Design-system card, docs, full verification

**Files:**

- Create: `design-system/project/preview/components-level-check.html` (level
  check strip + band pills + notable games row, mirroring existing preview
  format)
- Modify: `.github/memory-bank/activeContext.md` (current task swap, keep <50
  lines), `.github/memory-bank/progress.md` (one-liner)
- Verify: `npm run test:frontend`,
  `npm test -- --testPathIgnorePatterns='\.worktrees'`, `npm run build`, browser
  check via dev server (level check on a popular opening page, band swap, bridge
  card, beacon request visible).

- [ ] All suites green, build green, behaviour verified in the running app.
