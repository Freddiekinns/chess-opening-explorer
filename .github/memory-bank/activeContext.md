# Active Context

**Date:** 2026-10-05

## Current Task: Style tags — merged, tail still to classify

Merged 2026-10-05 as #160. Fixed taxonomy (`docs/style-taxonomy.md`) replacing
the LLM style tags; pipeline in `tools/style-tags/` (README has the steps). 105
researched variations plus 458 unsourced (`UNSOURCED.md`, tail-01 to tail-23);
judge pass done, 0 unresolved.

`export.js` writes `api/data/style-tags.json`; `style-tags-service.js` serves it
as `style_profile` to the detail page, `OpeningCard`, Discover's level and style
facets (solid, sharp, gambit, dubious, system, offbeat; old values aliased in
`browse_facets.json`) and style search (`STYLE_AXES`). Coverage by position:
tagged 80% of pages / 64.8% of games, hubs 4% / 34.5% (no tags by design),
untagged 16% / 0.8%. Untagged pages and the middleware pre-render show none.

Next: the tail, tail-24 to tail-66 — 848 variations, each under 1.6M games
(median ~100k). Owner plans to run it late in the week on leftover usage. Waves
of 4 agents × 20 (~11 waves), each ~25% of a 5-hour window and ~4% of the week,
so it needs at least three 5-hour windows. Per wave: `jev-classify.js --new`,
`collect-unsourced.js`, `validate.js`, judge any new lists, `export.js`; commit
briefs in chunks of ~100. Work on a new branch off `main`.

Follow-ups: split the Maróczy Bind (5.c4) out of the Accelerated Dragon; fix the
Dragon description (describes the Accelerated Dragon); the intent parser
misreads "solid response to e4", "solid e4 openings", "… for white" and
"advanced sicilian defence" (all older than the tags); `search-by-category` and
`search-categories` still read the old tags and have no caller; saved repertoire
entries keep their old level. A protected preview shows Vercel's login on a
direct `/opening/` load (middleware fetches `/index.html`).

## Previous Task: Splitting the `irregular` family (#159)

`irregular` held 940 positions, from 1.e4 to the Grob, so its family shelf (the
video fallback for pages with no videos of their own) was a grab-bag. It was 16
of the 19 top-200 pages that fall back to a shelf. Three new families in
`data/families.json`: `queens-pawn` (Queen's Pawn Game, 210 positions),
`kings-pawn` (King's Pawn Game, 157) and `offbeat-e4` (Offbeat 1.e4 Defenses,
110). Six narrow re-routes in `data/family-overrides.json`: 2…Nc6 → `italian`,
London-named → `london`, 1.d4 g6 → `pirc-modern`, Neo-Indian → `nimzo-indian`,
Veresov → `trompowsky`, and a mislabelled B01 → `scandinavian`. `irregular`
keeps 421 flank and offbeat positions; top-200 pages on its shelf 16 → 4.

`tools/family-taxonomy/tests/family-taxonomy-data.test.js` pins the real
taxonomy and fails when the committed ECO files drift from the resolver.
Analysis and decisions: `docs/proposals/2026-10-02-irregular-family-split.md`.
Left open: 1.g3 (Hungarian, Benko Opening) stays in `irregular` because KIA's
own shelf is contaminated; the 192 `uncategorised` positions get no shelf.
