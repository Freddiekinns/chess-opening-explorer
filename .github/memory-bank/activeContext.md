# Active Context

**Date:** 2026-09-28

## Current Task: Style tags and the Jev experiment

The LLM style tags barely tell openings apart — "Initiative" on 99% of
positions, the "solid" filter passes 84% — because the model copied the prompt's
examples. Two proposals, both in the backlog:

- `docs/proposals/2026-10-02-opening-style-classification.md` — exclusive axes
  of named values per variation, validated by script, no hand-labelling. Gated
  on `query_shape` (now on `search_select`): wait ~2 weeks of PostHog data.
- `docs/proposals/2026-10-02-jev-video-experiment.md` — Jev (TypeSafe's typed
  decision model) as a judge of video matches, $5 budget. Waiting on the owner's
  API key and docs.

## Previous Task: Sixth Dependabot pass

#149–#152 merged; vitest 5 pair as one PR. typescript 7 (#107) stays open:
typescript-eslint 8.70.1 still peers `typescript <6.1.0`. Detail in
`archive.md`.
