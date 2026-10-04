# Active Context

**Date:** 2026-10-03

## Current Task: Style tags — pilot

Branch `feat/style-taxonomy`. Replacing the LLM style tags with a fixed
taxonomy: `docs/style-taxonomy.md` (rubric, glossary, anchors, search words).
Plan and calibration results:
`docs/proposals/2026-10-02-opening-style-classification.md`, "Execution plan".
Owner chose not to wait for the `query_shape` gate.

Pipeline (`tools/style-tags/`): `select-roots.js` groups positions by move order
into 1,429 variations (12 hubs skipped) and writes researcher inputs; Sonnet
subagents follow `RESEARCHER.md` and write sourced briefs to
`tools/data/style-briefs/<slug>.json`, including a claim-by-claim audit of the
current description; `jev-classify.js` (classifier B, Jev) and a Sonnet subagent
on `CLASSIFIER.md` (classifier A, reads `_classify/states.json`) tag them
independently.

Pilot done 2026-10-04: 105 variations (top 100 plus calibration), all validation
checks pass (`node tools/style-tags/validate.js`). Results and the rules it
forced (Flexible structure, disputes take classifier A's answer) are in the
proposal, "Pilot results". The owner is on Pro: research runs in waves sized to
the 5-hour window, ~1.3–2% of it per brief.

Next: owner review of `_classify/pilot-tags.md` and the plans list (his
openings: Vienna, Jobava, Alapin as White; Accelerated Dragon, King's Indian,
Nimzo as Black), then extend (two tiers) or ship the pilot tags. Nothing is
committed yet.

## Previous Task: Jev rejection filter for videos

Merged as #157. The pipeline drops pairs Jev confidently rejects (P(good) < 0.4)
and `config/video_pins.json` adds 18 verified videos. Open: the scorer gives 0
to Veresov, Owen and Nimzo-Larsen videos that name their opening.
