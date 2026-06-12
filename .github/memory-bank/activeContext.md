# Active Context

**Date:** 2026-06-12

## Current Task: Common Plans Mismatch — Root Cause + Fix Proposal

**Status:** Investigation complete (proposal PR #40); fix implemented in PR #41
(`fix/common-plans-provenance`) — `CommonPlans` now takes the page's own plans
as a prop and the `/eco-analysis/:code` route + `getECOAnalysis` are deleted.
Remaining: Tier 1/2 content evaluation, Option D re-enrichment, and the separate
course-pipeline data fixes.

The design review (2026-06-11, PR #39) flagged detail pages showing plans for
the wrong opening (King's Pawn Game describing "a primitive attack on f7").
Traced it: **not an LLM data-quality problem**. `CommonPlans` fetches
`/api/openings/eco-analysis/:code`, and `getECOAnalysis` returns the **first
record in the ECO bucket** (alphabetical) — so 11,871 of 12,377 pages (95.9%)
show another record's plans; 8,923 (72.1%) show a different family's. All 12,377
records have their own correct plans, already present in the `/fen/:fen` payload
the page fetches.

Deliverables:

- `scripts/audit-common-plans.js` — models the serving logic, reports Tier-0
  provenance mismatch + Tier-1 foreign-name lint (477 records, mostly benign).
- `docs/proposals/2026-06-12-common-plans-provenance.md` — fix options (A: pass
  own plans as prop — recommended; B: delete/fix the eco-analysis route; C:
  deliberate family-level plans; D: re-enrich flagged records) and a 3-tier
  evaluation framework with acceptance criteria.

Also verified the sibling symptoms have separate root causes: courses.json maps
a Semi-Slav study directly to the KPG FEN (course-pipeline matching), and
`course_title` carries the duplicated-title concatenation in the data.

## Previous Task: Design-Review Fixes (2026-06-11)

PR #39: removed fabricated `Math.random()` card stats, fixed the search dropdown
stacking bug (`animation-fill-mode: both` → `backwards`), made search results
distinguishable (`formatMovesPreview` keeps the line's tail). Full review in
`docs/reviews/2026-06-11-design-review.md`.
