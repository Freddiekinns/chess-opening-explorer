# Active Context

**Date:** 2026-09-28

## Current Task: Style tags and the Jev experiment

The LLM style tags barely tell openings apart — "Initiative" on 99% of
positions, the "solid" filter passes 84% — because the model copied the prompt's
examples. Two proposals, both in the backlog:

- `docs/proposals/2026-10-02-opening-style-classification.md` — exclusive axes
  of named values per variation, validated by script, no hand-labelling. Gated
  on `query_shape` (now on `search_select`): wait ~2 weeks of PostHog data.
- `docs/proposals/2026-10-02-jev-video-experiment.md` — **run 2026-10-02**,
  $1.60. Jev's rejections are 99% right (all three criteria pass), but it keeps
  sibling-variation mismatches. Decision: adopt as a rejection filter (demote
  same-family rejections to the family shelf, drop the rest), in a separate
  `video-pipeline` PR. Scripts in `scripts/experiments/jev-video/`; raw output
  (37 MB) in `tools/data/experiments/`, not yet committed or ignored.
  `JEV_API_KEY` must come from console.typesafe.ai, not the reseller.

## Previous Task: Sixth Dependabot pass

#149–#152 merged; vitest 5 pair as one PR. typescript 7 (#107) stays open:
typescript-eslint 8.70.1 still peers `typescript <6.1.0`. Detail in
`archive.md`.
