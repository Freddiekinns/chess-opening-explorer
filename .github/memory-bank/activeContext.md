# Active Context

**Date:** 2026-07-28

## Current Task: UX review phase 5 — Analyse (`ux/phase-5-analyse`)

Last of six phases implementing the 2026-07 UX review. Stacked on
`ux/phase-4-detail-desktop` (PRs #58–#62 still open into `feat/ux-review`).

The page had two headers, a record card claiming a lifetime for numbers
describing one run, and no way to see what a report looks like before typing a
username.

- **One header** carrying the payoff; the "Ready to analyse your openings?"
  block is gone. Scope stated once: "Reads your public rated games — rapid,
  blitz & classical. Bullet excluded. Nothing is stored."
- **"Career totals / Overall performance" → "This analysis / Your record"**,
  wins sage and losses brick via the existing `--color-perf-*` tokens (the
  mock's hexes already _are_ those tokens). "GP" → "Games".
- **Sample reports.** "See a sample report — Magnus · Hikaru", served from
  committed fixtures (`packages/web/src/data/sample-reports/`, 100 games each,
  code-split). `npm run sample:generate` rebuilds them; the dashboard prints the
  generated date, so staleness is visible. Loading one **never** writes the
  session cache — a sample must not return as "your" saved result.
- **The reduction moved to `packages/shared/src/utils/personal-analysis.ts`** so
  the generator and the page compute a report with one implementation.
- **Accessibility**: platform choice is a real radio group; the username field
  has a real label, not just a placeholder.
- **Progress and errors moved inside the centred column** — rendered after a
  65vh block, both landed a third of a viewport below the input they describe.
- **Gear off the blank state**, into the dashboard-side search overlay.

**Deviation from the mock:** the gear goes to the overlay, not the dashboard
header. The header's only control _opens_ that overlay, so a gear beside it
would set a value consumed two clicks away.

**Verified:** 462 frontend, 833 backend, clean build; sage/brick confirmed
rendering at 1360 (`rgb(157,189,124)` / `rgb(201,133,121)`). **Spec/plans:**
`docs/superpowers/{specs,plans}/`

## Previous Task: UX review phase 4 — opening detail desktop (PR #62)

`ExplorerCard` draws one border around the level filter and everything it
governs; master games move outside it into a shared `MasterGamesCard`. **Detail
in `archive.md`.**
