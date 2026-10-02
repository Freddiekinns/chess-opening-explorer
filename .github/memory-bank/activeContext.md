# Active Context

**Date:** 2026-10-02

## Current Task: Jev rejection filter for videos

Branch `feat/jev-video-filter`. The pipeline now ends by removing pairs Jev
confidently rejects (`mentioned_only`/`not_about`, P(good) < 0.4) from
`video-index.json`: `tools/video-pipeline/lib/jev-filter.js`, run by
`scripts/apply-jev-filter.js`. Answers are cached in
`tools/data/jev-relation-cache.json`, seeded from the experiment's 32,005
answers. It fails open without `JEV_API_KEY`.

Applied to the current index: 31,605 of 72,283 position pairs removed. Top-200
own-page coverage fell from 178 to 172; those pages show the family shelf. The
0.4 cut-off spares parent-variation lectures on their own sub-lines (~0.47),
which the owner counts as useful.

Open: add the `JEV_API_KEY` repo secret. Four of the emptied top-200 pages land
on the `irregular` family shelf, which is a grab-bag (Queen's Pawn Game, Owen
and Horwitz have no family of their own).

## Previous Task: Style tags and the Jev experiment

Style tags barely discriminate; the classification proposal is gated on ~2 weeks
of `query_shape` data. The Jev experiment ran on 2026-10-02 for $1.60: its
rejections were 99% right and its acceptances half wrong. Results are in
`docs/proposals/2026-10-02-jev-video-experiment.md`.
