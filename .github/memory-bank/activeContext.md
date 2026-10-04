# Active Context

**Date:** 2026-10-04

## Current Task: Style tags — unsourced tail

Branch `feat/style-taxonomy`, PR #160. Fixed taxonomy (`docs/style-taxonomy.md`)
replacing the LLM style tags; pipeline in `tools/style-tags/` (README has the
steps). Pilot: 105 researched variations, owner-reviewed 2026-10-04.

The other 1,308 variations get **unsourced briefs** (`UNSOURCED.md`): Sonnet
writes evidence and its own tags from memory, no web, in waves of 4 agents × 20
from `_inputs/tail-NN.json` (most-played first). Then `jev-classify.js --new`,
`collect-unsourced.js`, `validate.js`. Blind test and the rules it forced (0.65
confidence floor, gambit check for the judge): proposal, "Unsourced tier".

**Done 2026-10-04: tail-01 to tail-23** (458 variations). Tagged now: 80% of
pages and 65% of games; hubs (no tags by design) hold another 34% of games. The
rest, tail-24 to tail-66 (~850 variations), is ~16% of pages and ~1% of games;
one wave of 80 costs ~25% of a 5-hour window and 4% of the week. Recommended
order, pending the owner's call: ship first, with untagged pages showing no tags
rather than old ones, and fill the tail in over the following weeks.

1. Judge (`JUDGE.md`, Opus): the "unresolved" and "Unsourced gambits the name
   does not mention" lists in `validate.js`.
2. Consistency pass: one opening split over several names gets different tags
   (Veresov: `richter-veresov-attack`, `queens-pawn-game-veresov`,
   `queens-pawn-game-veresov-attack`). Merge with `shared-briefs.json`.
3. Export into `api/data` and wire the detail page, `OpeningCard`, Discover
   facets and both halves of search, via the `seo-crawl-graph` and
   `search-ranking` skills. Ship all at once.

Follow-ups: split the Maróczy Bind (5.c4) out of the Accelerated Dragon (Bind
Advanced, the rest Intermediate); fix the Dragon page description, which
describes the Accelerated Dragon. Commits of 100+ briefs exceed the Windows
command line in the prettier pre-commit hook; commit them in chunks of ~100.

## Previous Task: Jev rejection filter for videos

Merged as #157. The pipeline drops pairs Jev confidently rejects (P(good) < 0.4)
and `config/video_pins.json` adds 18 verified videos. Open: the scorer gives 0
to Veresov, Owen and Nimzo-Larsen videos that name their opening.
