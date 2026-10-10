# Active Context

**Date:** 2026-10-10

## Current Task: Fix the description claims the style briefs proved wrong

Branch `fix/brief-audited-descriptions`. The 105 researched briefs in
`tools/data/style-briefs/` audit each root position's `analysis_json`
description and `common_plans` claim by claim; 43 claims in 32 briefs were
"wrong". All 43 are corrected in `api/data/eco/` with narrow edits (41 lines,
one per field), plus one the audit mislabelled: the Ruy Lopez brief marks
"Nf3-d2-f1-g3" supported while its note says the route is the b1 knight's, the
same error flagged on the Morphy page. New text is British English; opening
names keep the data's spelling. Three audit verdicts were debatable (Old
Sicilian 3.c3 does transpose to the Alapin, BDG 2...c6, Najdorf ...e5 and d5),
so those fixes are worded to be true either way. The Dragon page's description
is rewritten whole — it described the Accelerated Dragon.

Follow-ups: the B54 name itself reads "Dragon Variation, Accelerated Dragon",
which is where the confusion started; the unsourced tail has no audit, so a Jev
pass needs evidence first (backlog → Enablers).

## Previous Task: Backlog "Now" items 1–3 (#170)

Analyse cards floor 3 with no `list[0]` fallback (owner decision, not 10/20),
"won X of Y", needs-work by games lost; billions as `B`; Discover facet
"Difficulty"; move-row legend; explorer steps keep their scroll. "off-book"
stays. Full text: `archive.md`. Left in **Now**: the popularity stats refresh
(parked by the owner 2026-10-10).
