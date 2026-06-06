# Active Context

**Date:** 2026-06-06

## Current Task: Opening Family Rollups — Shipped

**Status:** Complete on branch `feature/opening-family-rollups`. The Analyse
page groups a player's openings by family with an expandable distribution-bar
row, in both the family and all-openings views.

**What shipped:**

- Shared `DistributionBar` (amber win / grey draw / cream loss, counts + tinted
  percentages) used by both `OpeningRow` (all-openings) and `FamilyRow`
  (family).
- `FamilyRow`: chevron + family name + "N lines" + GP + aggregate W/D/L bar;
  expands to indented per-variation bars (family prefix stripped).
  `groupByFamily` aggregates per family with a sortMode + uncategorised summary.
- Controls are **per column / per side**: a `Group by family` toggle chip
  (default on) and a compact `Sort` dropdown (`SortMenu` — role=menu /
  menuitemradio, full keyboard + click-outside). Both breakpoints render
  `[⊞ Group by family] [⇅ Sort ▾]`, group-left / sort-right, on one line.
  `UncategorisedFootnote` collapses "Other".
- Desktop shows As White / As Black side-by-side; mobile has an As White / As
  Black segmented switch. Family grouping is the default. (Rejected designs and
  their components/CSS/tests were removed along the way; history in
  `archive.md`.)

**Pre-production hardening:**

- **P0 (correctness):** removed the top-10 truncation — family rollups now
  aggregate over the FULL classified set (cache key `v3`→`v4`). Previously
  family totals/line-counts undercounted because grouping ran over only the 10
  most-played openings.
- **Win-rate consistency:** `groupByFamily` now uses pure `wins/games` (was
  draw-weighted), matching the flat sort + highlight cards.
- **Robustness/polish:** `/api/families` fetch retries (×2) and falls back to a
  prettified slug; mobile filter pills bumped to a 34px tap target; unrecognised
  game count surfaced in the header (desktop + mobile).

**Quality:** 195 frontend tests (`DistributionBar` + `FamilyRow` +
`familyAggregation` at 100%); contrast AA-pass; pill heights matched (24.8px
mobile / 28.2px desktop); build + format clean. Verified live on desktop and
mobile (both views, expand/collapse, toggles, sort menu).

## Previous Task: Family Rollups Phase 1 (2026-05-08)

28-family taxonomy + ~140 override rules → build-time `family_id` (98.45%). New
`GET /api/families` + `family_id` on the search-index. History in `archive.md`.
