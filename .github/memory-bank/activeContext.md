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

- **Correctness (P0):** removed top-10 truncation — rollups aggregate the FULL
  classified set (cache `v3`→`v4`); totals/line-counts no longer undercount.
- **Win rate:** unified on pure `wins/games` (family sort, flat sort, cards).
  Featured cards now need ≥4 games and pick "Needs work" by loss rate (was
  lowest win rate, which contradicted the displayed %).
- **Polish:** long lists scroll in-component (600px, like the opening tree);
  `/api/families` retries + slug fallback; 34px mobile tap targets;
  unrecognised-game count in the header.

**Quality:** 195 frontend tests (`DistributionBar` + `FamilyRow` +
`familyAggregation` at 100%); contrast AA-pass; pill heights matched (24.8px
mobile / 28.2px desktop); build + format clean. Verified live on desktop and
mobile (both views, expand/collapse, toggles, sort menu).

## Previous Task: Family Rollups Phase 1 (2026-05-08)

28-family taxonomy + ~140 override rules → build-time `family_id` (98.45%). New
`GET /api/families` + `family_id` on the search-index. History in `archive.md`.
