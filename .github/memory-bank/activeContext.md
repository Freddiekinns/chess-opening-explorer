# Active Context

**Date:** 2026-10-08

## Current Task: Model and effort routing for Claude Code

Pro plan, so usage is the constraint. The main session stays on Opus (a wrong
turn costs more than it saves) with effort as the dial: medium by default, high
for search ranking, SEO, new design, or a bug unexplained after one attempt.
Delegation only for self-contained, command-verifiable, output-heavy work.
Pinned agents: `scout` (Haiku, replaces Explore, which inherits Opus),
`verifier` (Haiku, failures only), `implementer` (Sonnet, written plans),
`pipeline-reviewer` (Sonnet high); `/docs-sync` skill forks to Sonnet. Table in
`CLAUDE.md`. Then `AGENTS.md` cut from 441 lines (26.6 KB) to ~220 (11.7 KB),
moved not deleted: Tooling into a new `dependencies-tooling` skill, the missing
video gotchas into `video-pipeline`, PostHog and search-index sizes into
`packages/web/AGENTS.md`, the explorer proxy and search projection into
`packages/api/AGENTS.md`. Root keeps one-line pointers plus the cross-cutting
rules. The claude-md-management plugin was not installed; done by hand. Memory
bank: stale facts fixed in `context.md` (token values now point at the CSS,
Vertex not Gemini, search painted client-side) and `user-journeys.md` (style
tags); `progress.md` no longer read at start; `tasks/` archived to
`docs/archive/memory-bank-tasks/`, the rollups spec to `docs/proposals/`,
TASK006 to issue #166. Next: invariant tests for prose-only rules, own PR.

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

Follow-ups (Maróczy split, Dragon description, intent-parser misreads, dead
category routes): `archive.md`, "Style tags — follow-ups".
