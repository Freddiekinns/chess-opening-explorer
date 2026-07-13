# Opening Detail — Right Column Redesign

**Date:** 2026-07-13 **Branch:** `feat/evidence-engine-slice1` (commit directly
onto the existing PR) **Source design:** Claude Design — "Opening Detail Right
Column.dc.html" (decoded from the standalone bundle the user supplied). Uses the
Warm Editorial Dark tokens verbatim.

## Goal

Refine the opening-detail right column to match the approved mock. This is a
**consolidation + restyle** of existing components, not a rebuild. No new data
sources beyond wiring per-move `averageRating` through the explorer normaliser.

## Decisions (confirmed with user)

1. **Match the mock exactly** — drop the "level check" insight note and the
   "Analyse your own games in this opening" bridge link. (Consequence: this page
   no longer emits `bridge_click`; the analyse funnel is reached elsewhere.)
2. **Average Elo = real games-weighted average**, computed from the explorer
   moves' `averageRating`. Never fabricated — omitted when unavailable.
3. **Mobile is a first-class acceptance criterion**, gated by the existing
   `tests/e2e/mobile-overflow.spec.ts` (375px, no horizontal scroll).

## Current → target structure

The right column renders `LevelLens` + `WinRatePanel` + Overview +
`OpeningNavigator`. The mock unifies the first two into one **Stats card** and
restyles the book rows.

### 1. Stats card — merge `LevelLens` into `WinRatePanel`

`WinRatePanel` becomes the single card. Top to bottom:

- **Level pills** (rendered via `LevelLens`, preserving `setMyLevel`
  persistence + `band_select` analytics). Drop the visible "Level" text label
  (the `role="group" aria-label="Level"` still labels it for AT). Keep the
  dashed **Reset → snapshot** pill, shown only when a band is active — a
  functional affordance the single-state mock doesn't depict.
- **Stat pair** — `Total games` (left) + `Average Elo` (right, orange). Already
  implemented in `WinRateBar`; Average Elo currently shows for the snapshot
  only.
- **Win bar + legend** — already implemented in `WinRateBar` (2px-gap segments,
  coloured-square legend). No change.
- **Master games** — keep the existing list (3 rows + "Show N more"). Match the
  mock's row format: `Name – Name` then `result · year`, dropping the inline
  `(rating)` figures.
- **Removed**: the `panelHeader` ("Win rates" / "Who wins from here" — the mock
  has no card title), the `levelCheck` note, and the `analyseLink`.

Fetch changes in `WinRatePanel`: keep the `masters` fetch (it powers the master
games list) but **drop** the comparison-band fetch, `computeLevelCheck`,
`level_check_view` tracking, and the note. Add `onBandChange` prop for the
pills. Wire live Average Elo by passing `avg_rating: live.averageRating` into
`liveStats`.

### 2. Average Elo data — `lib/lichessExplorer.ts`

- Add `averageRating?: number` to `ExplorerMove`.
- Add `averageRating: number | null` to `ExplorerResult`, computed in
  `normalise()` as `Σ(games × avgRating) / Σ games` over the returned moves that
  carry a rating (the `/api/explorer` proxy passes Lichess JSON through
  untouched, so `moves[].averageRating` is present). `null` when none carry one.
- Snapshot path continues to use `popularityStats.avg_rating`.

### 3. Overview card

Structurally unchanged. Minor restyle to match the mock (Bricolage-800 headline,
body at `opacity: 0.78`, `line-height: 1.6`). Lives in
`OpeningDetailPage.module.css`.

### 4. Opening book — `OpeningNavigator` (+ `.module.css`)

Same structure (breadcrumb → Next moves → "Instead of 5.d3"). Restyle move rows
to the mock's **two-line stacked** layout:

- Line 1: mono move + ellipsized variation name.
- Line 2: white% (cream, `--color-result-white`) + segmented result bar + black%
  (amber, `--color-result-black`) + games count (muted, right).

Markup: wrap each row's contents in a line-1 span and a line-2 span; set
`.contRow { flex-direction: column }`. Add the black% figure (today only white%
shows). Alternatives section keeps its darker row background.

Because the bar now has its own line, **remove the mobile
`.rowBarWrap { display:none }` rule** — the stacked layout keeps the bar
readable at narrow widths instead of hiding it.

### 5. Page wiring — `OpeningDetailPage.tsx`

Remove the standalone `<LevelLens>`; pass `band` + `onBandChange={setBand}` to
`<WinRatePanel>`. Overview and `<OpeningNavigator>` unchanged.

## Mobile

- Preserve the TASK007 overflow guards: `.two-column-layout` `minmax(0, 1fr)` +
  `min-width: 0` on grid children (do not touch). Keep name ellipsis +
  `min-width: 0` on the flexing bar so long variation names can never expand the
  track.
- Stat pair, legend, and pills use `flex-wrap` / `space-between` + tabular
  numerals so they hold at ~360px.
- Acceptance: `tests/e2e/mobile-overflow.spec.ts` stays green at 375px, and a
  manual 375px pass in the browser preview.

## Files touched

- `packages/web/src/lib/lichessExplorer.ts` — `averageRating` on move + result.
- `packages/web/src/components/detail/WinRatePanel.tsx` + `.module.css` — merge
  pills, add stat wiring, remove level-check + analyse link + card title.
- `packages/web/src/components/detail/LevelLens.tsx` + `.module.css` — drop
  visible label (keep aria-label + reset).
- `packages/web/src/components/detail/OpeningNavigator.tsx` + `.module.css` —
  stacked rows, black% figure, mobile bar visible.
- `packages/web/src/pages/OpeningDetailPage.tsx` + `.module.css` — wiring +
  Overview restyle.
- `packages/web/src/components/detail/WinRateBar.tsx` — no change (already
  matches); verify the `card` variant elsewhere is unaffected.

## Tests

- `lichessExplorer` — new test: weighted `averageRating` from moves; `null` when
  absent.
- `WinRatePanel.test.tsx` — remove the "titles itself", "level check strip", "no
  strip under threshold", and "analyse funnel link" tests; keep snapshot, live
  source line, no-move-list, band-fail note, thin-sample note, notable games +
  collapse, omit-master-games, renders-nothing. Add: Average Elo renders for a
  live band. Update `renderPanel` to pass `onBandChange`.
- `LevelLens.test.tsx` — update if it asserts the visible "Level" label.
- `mobile-overflow.spec.ts` — unchanged; must stay green.

## Design-system lockstep

Tokens are unchanged (the mock uses them verbatim), so no token sync. Update the
`design-system/` preview for this surface per the maintenance protocol in
`design-system/README.md` (the right column is a changed visual surface).

## Out of scope

Left column (board, move strip, FEN utilities), full-width sections (plans,
learning resources), and the analyse page itself.
