# Opening Family Rollups — Phase 1 Completion Report

**Branch:** `feature/opening-family-rollups` **Shipped:** 2026-05-08 **Spec:**
`.github/memory-bank/specs/2026-05-04-opening-family-rollups.md` **Plan:**
`docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1.md`

---

## Outcome

Phase 1 of the opening family rollups feature shipped end-to-end across four
modules: taxonomy data + build pipeline, API surface, Analyse-page rollup UI,
and memory bank. The Analyse page now offers a Variation/Family toggle that
groups a user's openings by parent family (Sicilian, French, Ruy Lopez, …), with
expand-to-reveal per-variation breakdowns. Family classification is resolved at
build time and embedded in the search-index payload; display names are joined
client-side from a new `/api/families` endpoint to keep bandwidth in check.

The work is on `feature/opening-family-rollups` (13 commits ahead of main),
ready for review and merge.

---

## What's in the box

### Module 1 — Taxonomy + build pipeline

- `data/families.json` — 28 hand-curated families with `id`, `display_name`,
  `slug`, `eco_anchor`, `colour_for`, `short_description`, and
  `popular_variation_ecos`.
- `data/family-overrides.json` — ~140 first-match-wins rules covering ECO naming
  variants (`Sicilian:` vs `Sicilian Defense:`, `QGD/QGA` abbreviations,
  `Gruenfeld` no-umlaut, `Spanish` aliasing Ruy Lopez, Indian Game splits to
  KID/Nimzo/QID/Grünfeld) plus judgment-call routings (Two Knights → italian,
  Hodgson Attack → trompowsky, etc.) and a long-tail irregular bucket.
- `tools/family-taxonomy/resolve-family.js` — pure resolver: override match →
  colon-prefix display-name match → bare-name match → `uncategorised` fallback.
  12 unit tests.
- `tools/family-taxonomy/build-family-index.js` — wired into
  `scripts/prepare-vercel-data.js`. Writes `family_id` and `family_display_name`
  into every ECO record at build time, emits
  `api/data/family-coverage-report.json`.
- Coverage-gate Jest test asserts ≤2% uncategorised (currently 1.55%).

**Coverage:** 98.45% (192/12,377 uncategorised).

### Module 2 — API surface

- `family_id` field added to `/api/openings/search-index` (full mode only;
  `?fields=lookup` branch unchanged). Display name deliberately not shipped
  per-row.
- New `GET /api/families` endpoint at
  `packages/api/src/routes/families.routes.js` returning the 28 families with
  metadata + per-family `opening_count`. ~5 KB payload, in-memory cached 1 h,
  CDN cached 24 h with stale-while-revalidate.
- Vercel rewrite for `/api/families` added to `vercel.json`.

### Module 3 — Analyse page rollup

- `packages/web/src/components/personal/familyAggregation.ts` — pure
  `groupByFamily()` helper. 5 unit tests.
- `PersonalOpeningStats.tsx`:
  - Variation/Family toggle (segmented pill, `role="tablist"`).
  - Families dict fetch on mount.
  - `family_id` plumbed through `OpeningAgg` and `upsertAgg`.
  - Field-name adapter (`OpeningAgg.win/draw/loss` →
    `OpeningAggInput.wins/draws/losses`) used in the family render path.
  - `FamilyRow` sub-component with disclosure pattern (`aria-expanded` +
    `aria-controls`), distribution bar, expand-to-reveal variations.
  - Both desktop and mobile render branches updated.
  - SortBar hidden in family view (rows are pre-sorted by games desc).
- 3 new component tests covering toggle visibility, family rendering after
  toggle, and expand/collapse interaction.

### Module 4 — Memory bank

- `activeContext.md`, `progress.md`, `tasks/_index.md` updated to reflect
  completion.

---

## Performance

The search-index payload was the only material bandwidth concern.

| Metric         | Before    | After     | Delta                |
| -------------- | --------- | --------- | -------------------- |
| Raw bytes      | 2,877,488 | 3,175,557 | **+10.36%**          |
| Bandwidth gate | —         | —         | 20% ceiling (passed) |

Why the gate held: shipping `family_id` only (28 distinct values that gzip
heavily) instead of `family_id` + `family_display_name` per row (which would
have added ~870 KB raw, ~54%). The display name is fetched once via
`/api/families` (~5 KB, browser-cached 1 h, CDN-cached 24 h) and joined
client-side inside `groupByFamily`.

Other surfaces:

- `/api/families` — small payload, aggressively cached. One origin hit per edge
  per day at most.
- `groupByFamily` — pure function over user's distinct openings (typically <100
  entries on Analyse). Sub-millisecond.
- Build time — Module 1 added ~500 ms to `prepare-vercel-data.js`. Already in
  production.
- Bundle size — `familyAggregation.ts` + `FamilyRow` together <1 KB minified.

---

## Spec deviations (logged with rationale)

1. **Client-side aggregation, not server-side `?group_by=family`** (spec §5.2).
   The Analyse page already builds per-opening `Map<string, OpeningAgg>`
   client-side from PGN parsing — server aggregation would duplicate that work
   and add a second roundtrip. Pure helper is simpler and faster.
2. **`family_display_name` deliberately omitted from search-index.** Halves the
   payload growth (10% vs 20%). Display name flows from the families dict at
   render time. The aggregation helper accepts a `families` parameter and
   prefers dict lookup, falling back to the per-row field if present (defensive
   only — production never populates it).
3. **Coverage hypothesis revised mid-implementation.** Plan estimated 80%
   coverage from colon-prefix matching alone; reality was 21%. ECO data uses
   `Sicilian:` (not `Sicilian Defense:`), abbreviations like `QGD:`/`QGA:`,
   `Gruenfeld` without the umlaut, `Spanish` for Ruy Lopez, and several Indian
   Game splits. Override file expanded from 14 → ~140 rules to reach 98.45%.

---

## Code review findings (resolved before merge)

Two issues caught during the first cross-cutting review and fixed in commit
`48a36bfd2`:

1. **Missing `vercel.json` rewrite for `/api/families`** — the route was defined
   and the Cache-Control header was set, but the production rewrite table didn't
   include it, so requests would fall through to the SPA catch-all. Frontend's
   `.catch(() => {})` would have swallowed the resulting HTML-as-JSON parse
   error, leaving family rows showing raw slugs. Added the rewrite alongside the
   existing `/api/health` entry.
2. **SortBar misleading in family view** — `<SortBar>` was rendered regardless
   of `groupBy`; in family view, sort changes had no visible effect (family rows
   are pre-sorted by games desc inside `groupByFamily`). Wrapped all three
   `<SortBar>` callsites in `groupBy === 'variation' && …`.

A second review pass surfaced two more issues, fixed before merge:

3. **`/api/families` path resolution would 500 in Vercel production.** The route
   hard-coded a four-up `__dirname` traversal to `data/families.json`, but
   Vercel only bundles files reachable through `process.cwd()` or static
   `require()` tracing. `prepare-vercel-data.js` already copies the file to
   `api/data/families.json` (via `TARGET_DATA_DIR`), so the fix routes through
   the existing `pathResolver.getDataPath()` helper with a fallback to the
   repo-root source for `npm run dev:api` (where the prep script may not have
   run). Test mock updated to use `real.existsSync` for non-families paths so
   the candidate-resolution logic doesn't recurse.
4. **Search-index `s-maxage` bumped from 3600 → 86400.** This PR is the one that
   grew the search-index payload by 10.36% (now 3.2 MB raw). Leaving the edge
   TTL at 1 hour while the payload jumped would have amplified bandwidth cost on
   every cache miss across the global CDN footprint, exactly the regression the
   TASK011 gotcha warns against. Aligned with other heavy read-mostly endpoints
   (`/api/openings/all`, `/api/openings/eco/*`).

Other checks passed: `isLookupOnly` branch correctly excludes `family_id`,
override ordering preserves `King's Indian Attack` before `King's Indian`,
`groupByFamily` score formula sums raw counts (not averages of percentages),
`eco-service` instantiation guard handles class export, no naming collision
between top-level `/api/families` and ECO-letter `/api/openings/family/:`.

---

## Tests

| Layer                            | Count      | File(s)                                                                        |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Resolver                         | 12         | `tools/family-taxonomy/tests/resolve-family.test.js`                           |
| Coverage gate                    | 2          | `tools/family-taxonomy/tests/build-family-index.test.js`                       |
| `/api/families` route            | 2          | `tests/unit/families-routes.test.js`                                           |
| `groupByFamily` helper           | 5          | `packages/web/src/components/personal/__tests__/familyAggregation.test.ts`     |
| `PersonalOpeningStats` component | 14 (3 new) | `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx` |

All passing. `npm run build` clean. `npm run build:vercel` runs family
enrichment cleanly under the coverage gate.

---

## Follow-ups (not blocking merge)

1. **Phase 2 — Family lens routes and chip system.** Standalone family pages
   (`/family/:slug`), chip system on opening detail pages, family filtering in
   search. Will need its own spec/plan when prioritised.
2. **Phase 3 — Repertoire grouping.** Extend "My Repertoire" to group starred
   openings by family with the same rollup pattern. Will need its own spec/plan.

---

## Commit log (this branch)

```
48a36bfd2  fix(family-rollups): wire /api/families rewrite + hide SortBar in family view
27e215ceb  docs(memory-bank): record Phase 1 family rollups completion
4d6f43545  test(personal): cover family-rollup toggle and render
d6a8b7ec7  feat(personal): family-grouped opening rollup with expand
dddb5d41b  feat(personal): group-by toggle UI and families fetch
40f5a17ab  feat(personal): pure family-rollup aggregation helper
fa8af6c39  feat(api): add GET /api/families endpoint
3aed98a6c  feat(api): expose family_id on search-index (display name joined client-side)
1ea11e53e  docs(memory): record family rollups taxonomy module landing
2d428a185  feat(taxonomy): backfill overrides to 98.45% coverage
33f300694  feat(taxonomy): build-time family enrichment + coverage gate
163a22776  feat(taxonomy): pure resolver function with TDD coverage
1dbbd1c95  feat(taxonomy): seed canonical family list and override rules
73e37e2a5  docs(plan): phase 1 implementation plan for opening family rollups
```
