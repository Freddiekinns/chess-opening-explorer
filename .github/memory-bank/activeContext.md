# Active Context

**Date:** 2026-07-28

## Current Task: UX review phase 3 — faceted filter bar (`ux/phase-3-filter-bar`)

Fourth of six phases implementing the 2026-07 UX review. Stacked on
`ux/phase-2-browse-api` (PRs #58, #59 and #60 still open into `feat/ux-review`).

Two unlabelled pill rows — level plus raw ECO letters, reading as one row of ten
— become four facet buttons that each state what they filter and what they are
set to: **Level · Style · Family · Sort**. Grid, result count and facet counts
now come from **one** `/api/openings/browse` request, so the number on screen
and the cards under it cannot disagree — the bug the review found and phase 2
built the endpoint to fix.

- **Filter state in URL search params** (`replace`, not `push` — four facet taps
  must not cost four Back presses). Cards stay real `<Link>`s; facet controls
  are `<button>`s, so no crawlable filter URLs and canonical stays `/`. "Load
  more" depth is deliberately NOT in the URL.
- **Family replaces ECO categories**, grouped by first move derived server-side
  (`BrowseService.familyFirstMoves`). Under 60% modal share reports `null` and
  lands in "Other openings" — Irregular Openings is 32% 1.d4, not a fact. 27 of
  29 families have a first move.
- **The applied facet value survives at count 0** in its own facet list, or the
  bar cannot label the user's own selection and an empty grid has no visible
  cause.
- **The mobile sheet must be portalled to `<body>`.** `position: fixed` resolves
  against the nearest transformed ancestor, and `.popular-openings-section`
  animates `sectionReveal`, whose keyframes carry `translateY` — rendered in
  place the sheet landed ~1,000px down the page. New variant of the documented
  transform gotcha; caught in the browser, regression-tested.
- One sheet holds all four facets (the mock draws one per facet = three taps to
  set a level); choices apply live so the footer count is never stale.
- `ComplexityFilters`, `CategoryFilter` and their CSS are deleted.

**Known:** level is 61% Advanced, 1.4% Beginner — now that the facet is on
screen, measure usage before deciding whether to re-enrich or drop it.

**Verified:** 833 backend, 413 frontend, clean build, exercised live at 1360 and
390 (facet counts reconcile to the total on real data; back restores facets).
**Spec/plans:** `docs/superpowers/{specs,plans}/2026-07-2*-ux-*`

## Previous Task: UX review phase 2 — browse API (PR #60)

`GET /api/openings/browse` returning items, `total`, `remaining` and facet
counts from one index in one request. One primary style per opening; facets
exclude their own dimension; unknown values 400; page size capped at 48. No UI
change. **Detail in `archive.md`.**
