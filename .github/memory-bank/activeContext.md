# Active Context

**Date:** 2026-10-05

## Current Task: Backlog rev 5 — one list of open work

Branch `claude/sleepy-bell-ehukrm` (merges #165's branch). Follow-ups had been
left in this file, `progress.md`'s "What's Left", proposals and older reviews;
all now sit in `docs/backlog.md`, and `AGENTS.md` ("Keeping docs current")
requires every follow-up to go there. TASK012 closed. Next: owner picks the next
task; recommended the Analyse statistics fix (top of **Now**).

Act before 1 November: #154, the October video refresh, was built before the Jev
filter (#157) and the family split (#159). Close it and re-run the workflow on
current `main` once `JEV_API_KEY` is confirmed as a repository secret.

## Previous Task: Style tags — merged, tail still to classify

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

Before the tail runs, spell out the gambit rule (KGA …d5 lines are not gambits).
Every follow-up is in `docs/backlog.md` (rev 5): the gambit rule, Dragon
description and intent parser under **Now**; the rest under **Later**,
**Enablers** and **Engineering health**.
