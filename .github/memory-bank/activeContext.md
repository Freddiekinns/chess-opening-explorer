# Active Context

**Date:** 2026-10-05

## Current Task: Style tags — shipped to the site, tail still filling

Branch `feat/style-taxonomy`, PR #160. Fixed taxonomy (`docs/style-taxonomy.md`)
replacing the LLM style tags; pipeline in `tools/style-tags/` (README has the
steps). 105 researched variations plus 458 unsourced (`UNSOURCED.md`, tail-01 to
tail-23). Judge pass done 2026-10-05: 0 unresolved.

**Wired 2026-10-05.** `export.js` writes `api/data/style-tags.json` (80% of
pages, 65% of games; hubs hold another 34%). `style-tags-service.js` serves it:
detail page and `OpeningCard` draw `StyleTags` from `style_profile`; Discover's
level and style facets read the axes (styles: solid, sharp, gambit, dubious,
system, offbeat; old values aliased in `browse_facets.json`); style search maps
words to axes through `STYLE_AXES`. Untagged pages show no tags, not old ones.
The middleware pre-render carries no tags, as before.

Next: the owner decides whether to merge now. Then the tail, tail-24 to tail-66
(~850 variations, ~16% of pages, ~1% of games): waves of 4 agents × 20, then
`jev-classify.js --new`, `collect-unsourced.js`, `validate.js`, judge any new
lists, `export.js`. One wave costs ~25% of a 5-hour window and 4% of the week.

Follow-ups: split the Maróczy Bind (5.c4) out of the Accelerated Dragon; fix the
Dragon description (describes the Accelerated Dragon); "solid response to e4"
returns nothing (`filterByResponseToMoves` excludes lines starting 1.e4);
`search-by-category` and `search-categories` still read the old tags and have no
caller; saved repertoire entries keep the old level they were saved with. Commit
briefs in chunks of ~100 (the prettier hook's command line).

## Previous Task: Jev rejection filter for videos

Merged as #157. The pipeline drops pairs Jev confidently rejects (P(good) < 0.4)
and `config/video_pins.json` adds 18 verified videos. Open: the scorer gives 0
to Veresov, Owen and Nimzo-Larsen videos that name their opening.
