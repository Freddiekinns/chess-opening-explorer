# Common Plans mismatch — root cause, fix options, evaluation

Follow-up to finding #1 ("content-pipeline artifacts") in the
[2026-06-11 design review](../reviews/2026-06-11-design-review.md). The review
observed the King's Pawn Game detail page describing "a primitive attack on f7
with Ne2–g3 and Qh5" and hypothesised an LLM-enrichment quality problem. This
investigation shows that hypothesis was wrong: **the enrichment data is fine —
the serving logic shows the wrong record's plans on 96% of pages.**

> **Status (2026-06-12):** Options A and B are implemented in PR #41 — the
> detail page renders its own record's plans and the bucket-lookup route is
> deleted. Tiers 1–2 of the evaluation and Option D remain open.

## Root cause

The chain, traced end to end:

1. `OpeningDetailPage` renders `<CommonPlans ecoCode={opening.eco} />`
   (`packages/web/src/pages/OpeningDetailPage.tsx`).
2. `CommonPlans` fetches `GET /api/openings/eco-analysis/:code`
   (`packages/web/src/components/detail/CommonPlans.tsx`).
3. That route calls `ecoService.getECOAnalysis(ecoCode)`
   (`packages/api/src/services/eco-service.js`), which iterates the merged ECO
   dataset and returns the analysis of the **first record whose `eco` field
   matches** — i.e. whichever opening happens to sort first in the data file.

ECO codes are coarse buckets: C20 alone contains 30+ named openings. The records
in `api/data/eco/*.json` are ordered alphabetically by name, so every page in a
bucket gets the plans of the alphabetically-first enriched record. For C20 that
is **"Barnes Opening: Walkerling"** (`1. f3 e5 2. e4 Nf6 3. Bc4`) — whose plans
correctly describe a primitive f7 attack and punishing White's poor opening. The
King's Pawn Game page (`1. e4 e5`) faithfully displayed them.

The bitter irony: **all 12,377 openings already have their own correct plans**,
and the `/api/openings/fen/:fen` payload the detail page fetches already
includes them (`formatOpeningData` returns `common_plans`). The data is sitting
unused in the page's own state while a second request fetches the wrong data.

## Evidence

`node scripts/audit-common-plans.js` models the serving logic against the real
data (2026-06-12 run):

| Measure                                        | Count  | Share |
| ---------------------------------------------- | ------ | ----- |
| Opening pages                                  | 12,377 | —     |
| Pages with their own enriched plans            | 12,377 | 100%  |
| Pages served another record's plans            | 11,871 | 95.9% |
| …where the served record is a different family | 8,923  | 72.1% |

Worst buckets: every A00 page (239 of them — Grob, Polish, Van Geet, …) shows
**Amar Gambit** plans; every D00 queen's-pawn page shows **Amazon Attack**
plans; every B00 page shows **Barnes Defense** plans.

Separately, a content lint of each record's _own_ plans (mentions of a foreign
family name) flags only 477 records (3.9%) — and spot checks show most are
legitimate transposition advice ("transpose into a favorable Sicilian"). The LLM
content itself is broadly trustworthy.

## Fix options

### Option A — use the page's own plans (recommended, do first)

`OpeningDetailPage` already holds `opening.common_plans`. Pass it to
`CommonPlans` as a prop; the component skips its network fetch when plans are
provided.

- **Impact:** provenance mismatch goes from 95.9% to 0% for every enriched
  record — which is currently all of them. One fewer request per page view.
- **Effort:** small — a prop, a conditional in the `useEffect`, test updates.
- **Risk:** minimal. The classification logic (White/Black/general) is
  client-side and unchanged.

### Option B — fix or retire `/eco-analysis/:code`

`CommonPlans` is the endpoint's only consumer. After Option A, either delete the
route (and `getECOAnalysis`) or, if a bucket-level answer is ever wanted, make
it deterministic and honest: serve the bucket's root line (shortest `moves` —
e.g. A00 → "Anderssen's Opening", not "Amar Gambit") and include the source
record's name so the UI can attribute it.

- **Impact:** prevents the next feature from re-importing the same bug.
- **Effort:** small. Recommend deletion over repair — dead code with a
  misleading contract is a trap.

### Option C — family-level plans for family surfaces

If family hub pages (the opening-family rollups, PR #34) want plans that
describe the family rather than one variation, generate them deliberately:
enrich the family root FEN (or a curated family summary keyed by `families.json`
slug), not "first record in the ECO bucket". Per-variation pages keep their own
plans.

- **Impact:** content improvement for hub/rollup surfaces only.
- **Effort:** medium — a small enrichment pass over ~100 family roots, plus
  wiring. Only worth doing when a surface actually needs it.

### Option D — re-enrich records whose own plans fail validation

After Option A the residual risk is genuine LLM errors in a record's own plans.
Run the evaluation below, triage the flagged set (477 lint flags is the upper
bound; the true bad set will be much smaller), and re-run `npm run enrich` for
just those FENs.

- **Impact:** cleans up the long tail.
- **Effort:** mostly triage time; enrichment cost is per-flagged-record, not
  per-12k.

### Recommended path

A → B in one small PR (the actual bug fix), then run the Tier 1/Tier 2
evaluation below and do D on whatever it flags. C only when a family surface
needs family-level copy.

## How we evaluate whether plans match openings

Three tiers, cheapest first; each tier gates the next:

**Tier 0 — provenance (deterministic, automated).** The plans rendered on a page
must come from the page's own FEN record. Option A satisfies this by
construction — the component takes the page's own plans as a prop and cannot
fetch anything else, guarded by a unit test. `scripts/audit-common-plans.js`
keeps a simulation of the removed bucket lookup as the record of the bug and as
a measure of what any reintroduced ECO-code-level lookup would serve — it needs
no API keys and runs in seconds.

**Tier 1 — content lint (deterministic, triage signal).** For each record's own
plans, flag text that names a different opening family (the audit script's
second report). Flags are review-worthy, not verdicts — transposition advice is
legitimate. Possible extension if the flag set proves noisy: parse SAN tokens
from plan text (Qh5, Ne2–g3) and check piece-plausibility against the opening's
position with chess.js.

**Tier 2 — LLM-as-judge on a weighted sample (probabilistic, final QA).** Sample
~300–500 openings weighted by popularity (`popularity_stats.json`), so the pages
learners actually visit dominate the score. For each, ask a cheap model: "Given
this name, ECO code, and move sequence, do these plans describe this opening?
Score 1–5 with a reason." Manually spot-check everything scoring ≤3. This is the
only tier that can catch a fluent-but-wrong plan on the page it belongs to.

**Acceptance criteria:** Tier 0 = 0 mismatches; Tier 1 flags triaged with
genuine errors queued for re-enrichment; Tier 2 ≥95% scoring 4–5 on the
popularity-weighted sample.

## Out of scope (same review finding, different root causes)

The review bundled two more symptoms under "content-pipeline artifacts". They
are **not** explained by this bug and need their own (smaller) investigations:

- **Wrong studies on detail pages** (Semi-Slav study under King's Pawn Game) —
  verified: `/api/courses/:fen` is an exact-FEN lookup with no bucket fallback,
  and `api/data/courses.json` really does map the Semi-Slav study to the King's
  Pawn Game FEN. The error happened at import/matching time in the course
  pipeline (`tools/course-discovery`), so it needs a data fix plus a
  match-validation step there.
- **Duplicated study titles** ("The Ponziani Guide: … – The Ponziani Guide:…") —
  verified in the same courses.json record: `course_title` already contains the
  "name – name: chapter" concatenation (plus emoji noise). Cheap render-time
  dedupe in `StudiesGallery`, or normalise at import.
