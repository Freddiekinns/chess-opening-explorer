# Opening Family Rollups — Design Spec

**Status:** Draft for review **Date:** 2026-05-04 **Branch:**
`feature/opening-family-rollups` **Source:**
[TASK008 §2](../tasks/TASK008-competitive-analysis.md#L119)

---

## 1. Purpose

Make "opening family" a first-class concept across the app so that a user who
has played seven Sicilian sub-variations sees one meaningful row ("Sicilian — 7
games — 43% score") instead of seven scattered one-game rows. Family is already
implicit in the data (it's the prefix before the colon in every opening name)
but is currently re-derived by string-splitting in two components and never
reaches the API, search, or stats layers.

This spec turns the implicit concept into stored, indexed, queryable data.

## 2. Goals & non-goals

**Goals**

- Every opening in the database is mapped to exactly one family id.
- Analyse page can render personal stats grouped by family with weighted
  win/loss/draw aggregates.
- Search surfaces families as first-class results when a user types a family
  name.
- Opening detail page links the existing orange family header to a family
  overview page.
- Repertoire view groups starred openings by family for at-a-glance scanning.
- The taxonomy is auditable, version-controlled, and easy to amend.

**Non-goals**

- Sub-families. The taxonomy is flat in v1. "Sicilian: Najdorf" is not itself a
  family; it's a variation belonging to the Sicilian family.
- "Star a whole family" as a new repertoire action. Storage churn (which
  variations get auto-starred? what about new ones?) outweighs benefit. v1 only
  groups existing stars in the display.
- Auto-generating family taxonomy from ECO codes alone. ECO ranges approximate
  families but break down for systems (London, KIA) and at family roots (Indian
  Game splits into KID/Nimzo/Queen's Indian).
- Rewriting opening URLs. All existing `/opening/<eco>/<slug>` routes stay.
  Family pages are additive.

## 3. Taxonomy

The hardest decision in the spec, so it gets its own section.

### 3.1 Sources of truth

**Primary signal: name-before-colon.** ~80% of openings are named
`<Family>: <Variation>` (e.g. `Sicilian Defense: Najdorf Variation`). Splitting
on `:` gets us a free family for the bulk of the dataset.

**Secondary signal: opening name itself.** Roots have no colon (`Pirc Defense`,
`Caro-Kann Defense`, `London System`). The opening's own name _is_ the family
name in these cases.

**Override file: `data/family-overrides.json`.** A hand-curated map from opening
identifier (ECO + name hash, or canonical slug) to `family_id`, used for:

- Transposition systems that don't follow the colon convention (e.g.
  `London System`, `King's Indian Attack`, `Colle System`).
- Edge cases where the colon split lies (e.g. `Indian Game: ...` should not
  become an "Indian Game" family — it splits into KID, Nimzo, Queen's Indian,
  Grünfeld).
- Aliases and historical naming (`Sicilian, Najdorf` vs
  `Sicilian Defense: Najdorf`).

### 3.2 The canonical family list

Hand-authored at `data/families.json`. Initial cut, ~25 entries:

| id            | display name           | colour anchor (ECO) |
| ------------- | ---------------------- | ------------------- |
| sicilian      | Sicilian Defense       | B20–B99             |
| french        | French Defense         | C00–C19             |
| caro-kann     | Caro-Kann Defense      | B10–B19             |
| pirc-modern   | Pirc & Modern Defense  | B06–B09             |
| scandinavian  | Scandinavian Defense   | B01                 |
| alekhine      | Alekhine's Defense     | B02–B05             |
| ruy-lopez     | Ruy Lopez              | C60–C99             |
| italian       | Italian Game           | C50–C59             |
| scotch        | Scotch Game            | C44–C45             |
| kings-gambit  | King's Gambit          | C30–C39             |
| vienna        | Vienna Game            | C25–C29             |
| petroff       | Petroff Defense        | C42–C43             |
| philidor      | Philidor Defense       | C41                 |
| queens-gambit | Queen's Gambit         | D06–D69             |
| slav          | Slav Defense           | D10–D19             |
| kings-indian  | King's Indian Defense  | E60–E99             |
| nimzo-indian  | Nimzo-Indian Defense   | E20–E59             |
| queens-indian | Queen's Indian Defense | E12–E19             |
| grunfeld      | Grünfeld Defense       | D70–D99             |
| catalan       | Catalan Opening        | E00–E09             |
| english       | English Opening        | A10–A39             |
| reti          | Réti Opening           | A04–A09             |
| london        | London System          | (transposition)     |
| kia           | King's Indian Attack   | (transposition)     |
| dutch         | Dutch Defense          | A80–A99             |
| benoni-benko  | Benoni & Benko         | A56–A79             |
| trompowsky    | Trompowsky Attack      | A45                 |
| irregular     | Irregular Openings     | A00–A03 (catch-all) |

ECO ranges are _anchors_, not authoritative — they're informational on the
family record so a user landing on the family page sees the "B20–B99" badge.
Mapping uses the resolver below, not ECO ranges.

`pirc-modern` deliberately merges Pirc + Modern: at the sub-1800 audience
they're played similarly and the distinction is a Wikipedia-edit-war. This is a
judgement call we're explicit about.

### 3.3 Resolver algorithm

For each opening (run once at build time):

1. If `(eco, name)` appears in `family-overrides.json` → use that.
2. If the opening name has no `:` and matches a `families.json` display name
   (case-insensitive, normalised) → family id = that family.
3. If the opening name has `:`, take the prefix; if the prefix matches a
   `families.json` display name → that family id.
4. Otherwise → `family_id: "uncategorised"` and log to the build report.

The build script fails (non-zero exit) if `uncategorised` exceeds 2% of the
dataset. This forces overrides to be added before merge rather than silently
shipping a sloppy taxonomy.

### 3.4 Coverage expectations

Rough estimate from the colon-prefix analysis:

- Clean colon-prefix matches: ~80% (~9,900 openings)
- Self-named family roots: ~5% (~620)
- Override-required (transpositions, edge cases): ~10% (~1,250)
- Long tail / `uncategorised`: ~5% target after override pass, ~2% acceptance
  threshold

Numbers are a hypothesis to validate during Phase 1 implementation. If real
coverage is materially worse, scope decision is to widen overrides, not to
re-architect.

## 4. Data model

### 4.1 Family record (`data/families.json`)

```json
{
  "sicilian": {
    "id": "sicilian",
    "display_name": "Sicilian Defense",
    "slug": "sicilian-defense",
    "eco_anchor": "B20–B99",
    "colour_for": "black",
    "short_description": "Black's most-analysed answer to 1.e4...",
    "popular_variation_ecos": ["B90", "B30", "B22"]
  }
}
```

`colour_for` is `"white"` | `"black"` | `"both"`. Used for stats colour
inference on Analyse and for tagging the family card.

`short_description` is one or two sentences hand-written or LLM-drafted then
human-reviewed. Not enrichment-pipeline output — it's curated copy.

### 4.2 Override file (`data/family-overrides.json`)

```json
{
  "overrides": [
    { "match": { "name": "London System" }, "family_id": "london" },
    {
      "match": { "eco": "A45", "name_prefix": "Trompowsky" },
      "family_id": "trompowsky"
    }
  ]
}
```

Match rules: exact `name`, `eco`, or `name_prefix`. Build script supports all
three, evaluated in order.

### 4.3 Per-opening enrichment

The build script writes a derived field into each opening record's output (e.g.
into the `analysis_json` object or a sibling field):

```json
"family_id": "sicilian"
```

We do **not** rewrite the source ECO JSON files. The enrichment runs as part of
`npm run build:vercel` and writes to the prepared data bundle.

### 4.4 Search index

`/api/openings/search-index` (1.6 MB, currently per TASK011) gains family
entries as a separate index section so search can return
`{ type: "family", id, display_name, opening_count }` results alongside the
existing opening hits.

## 5. API surface

All routes follow existing conventions (`packages/api/src/routes/`, plain JSON,
`Cache-Control` set in `vercel.json`).

### 5.1 New routes

- `GET /api/families` — list all families with opening counts. Static, long
  cache (1 day).
- `GET /api/families/:id` — single family with description, top variations, ECO
  anchor, opening count. Long cache.
- `GET /api/families/:id/openings` — paginated list of all openings in this
  family, sorted by Lichess play count descending.

### 5.2 Modified routes

- Existing opening detail responses gain `family_id` and `family_display_name`.
- `/api/openings/search-index` gains a `families` section (see §4.4).
- Personal stats endpoints (the ones Analyse uses) gain optional
  `?group_by=family` parameter that performs aggregation server-side.

## 6. UI design

Phased to keep PRs reviewable. Each phase is independently shippable.

### 6.1 Phase 1 — Foundation + Analyse rollup

1. Build the taxonomy: `families.json`, `family-overrides.json`, resolver
   script, build-pipeline integration.
2. Wire `family_id` into opening payloads.
3. New API: `/api/families` and `/api/families/:id` (description + counts; the
   dedicated family page lives in Phase 2).
4. Personal stats endpoint gets `group_by=family` aggregation.
5. **Analyse page UI:** add segmented toggle "Group by: variation / family"
   above the personal opening stats list. Default: variation (current behaviour)
   for v1, switch to family in v1.1 once we trust the taxonomy.
6. When grouped by family, each row shows family display name, total games,
   weighted W/L/D bar, and an expand chevron that reveals the underlying
   variations as a nested list.
7. Add a "diversity" indicator alongside the count: e.g.
   `Sicilian — 7 games · 5 variations`. Prevents the false-confidence trap where
   a 7-game rollup hides that the user is playing each variation once.
8. Surface `uncategorised` as a final row labelled "Other" with the same expand
   behaviour. Don't hide it — visibility helps us spot taxonomy gaps.

### 6.2 Phase 2 — Family overview page + search + detail link

1. New route: `/family/<slug>` (e.g. `/family/sicilian-defense`).
2. Page contents: family name, short description, ECO anchor, opening count, top
   10 variations sorted by Lichess play count, "explore all" link to the full
   list.
3. Wire the existing orange family header on `OpeningDetailPage` so the family
   text becomes a link to `/family/<slug>`. Currently it's a `<span>`
   (`OpeningDetailPage.tsx:760`).
4. Update search results: when the query matches a family display name exactly
   or as a prefix, prepend a family card to results ("Sicilian Defense — 1,247
   variations") above the per-opening hits.
5. SSR/SEO: family pages are pre-rendered with metadata + JSON-LD per the
   existing TASK009 pattern.

### 6.3 Phase 3 — Repertoire grouping (display-only)

1. In `RepertoireSection`, group starred openings by family. Family header
   collapses to show count and W/L if available; expanding reveals the existing
   star cards.
2. **No new persistence.** Stars remain per-opening; family is a display-time
   grouping read from `family_id`.
3. If a family has only one starred opening, render it ungrouped (avoid one-row
   groups taking double the vertical space).

### 6.4 Component changes (concrete)

| Component                                           | Change                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `PersonalOpeningStats.tsx`                          | Replace inline colon-split with `family_display_name` field; add toggle + grouped render path. |
| `OpeningDetailPage.tsx:760`                         | Replace `<span>` family text with `<Link to={"/family/" + slug}>`.                             |
| `RepertoireSection`                                 | Add family-grouping render mode.                                                               |
| `SearchResults`                                     | Add family-card variant.                                                                       |
| New: `pages/FamilyPage.tsx`                         | Family overview route.                                                                         |
| New: `components/family/FamilyCard.module.css` etc. | Shared styling for family chips and headers.                                                   |

## 7. Stats aggregation rules

For the Analyse rollup, family-level stats are sums of underlying variation game
outcomes — **not** averages of percentages.

```
family.games  = Σ variation.games
family.wins   = Σ variation.wins   (from user's perspective for the colour played)
family.losses = Σ variation.losses
family.draws  = Σ variation.draws
family.score  = (wins + 0.5 * draws) / games
```

The aggregation runs server-side on the personal stats endpoint to avoid
shipping a per-variation breakdown to the client just to re-aggregate. Client
receives both the family rollup and the underlying variation list (for the
expand row), so the client renders without re-fetching.

By-colour separation is preserved: a Sicilian-as-Black row and a
Sicilian-as-White row are distinct family rollups, just like today's
per-variation rows are colour-scoped.

## 8. Edge cases & risks

- **Indian Game.** ECO uses "Indian Game: ..." as a parent for KID, Nimzo,
  Queen's Indian, Grünfeld. The colon-split would create an "Indian Game"
  mega-family. The override file must split these to their actual families.
  Concrete override rule: if `name_prefix` is `Indian Game` then look at the
  rest of the name — if it contains "King's Indian", route to `kings-indian`;
  "Nimzo", to `nimzo-indian`; etc. This is the most complex override and
  warrants a dedicated test fixture.
- **Transposition systems (London, KIA, Colle).** ECO scatters them. Override by
  exact-name match is sufficient because the database stores the canonical name
  even when the moves transpose.
- **Naming variants.** Standardise on American "Defense" (matches ECO data). The
  override matcher is case-insensitive and trims whitespace but does not do
  fuzzy matching — explicit overrides are preferred over silent normalisation.
- **Stat false-confidence.** A 7-game rollup hides whether the user has a
  Sicilian repertoire or just keeps showing up. Mitigation: surface variation
  count alongside game count (§6.1.7).
- **New openings added to ECO.** Build script logs uncategorised. Coverage
  threshold (2%) enforces that a contributor adds the override.
- **Sub-1800 audience and family vs variation.** Players at this level often
  don't know the variation name. The family rollup is an affordance for them;
  the variation drill-down stays for those who do.
- **Search ambiguity.** "Sicilian" matches the family AND every Sicilian
  variation. Family card goes first in the result list; variations follow.
  Ranking rule: a family-name exact-or-prefix match outranks a per-variation hit
  on the same query.

## 9. Testing

- **Resolver unit tests** (`tools/family-taxonomy/__tests__/`): fixture of ~30
  tricky inputs (Indian Game splits, London System, aliases, uncategorised tail)
  with expected family ids.
- **Coverage assertion**: build script's coverage check is itself exercised in
  CI (run on a full ECO snapshot, expect <2% uncategorised).
- **API integration tests**: family endpoints, `group_by=family` on personal
  stats, search-index family section.
- **Component tests**: PersonalOpeningStats grouped vs ungrouped render,
  Repertoire family grouping with mixed counts, family-card search result.
- **E2E (Playwright)**: regression on the existing detail page header (family
  link works, navigates to family page, doesn't break the sticky board layout).

## 10. Phasing summary

| Phase | Scope                                                   | Reviewable as |
| ----- | ------------------------------------------------------- | ------------- |
| 1     | Taxonomy + build pipeline + Analyse rollup              | One PR        |
| 2     | Family overview page + search card + detail header link | One PR        |
| 3     | Repertoire grouping                                     | One small PR  |

Each phase ships independently. After Phase 1 the app is already more useful
(Analyse stops being noise for any Sicilian player). Phase 2 and 3 are additive
polish.

## 11. Open questions for review

- **Default Analyse grouping.** Phase 1 ships with variation as default and
  family as opt-in. Should Phase 1.1 flip the default once taxonomy is trusted,
  or keep variation default forever and let the user opt in? Recommendation:
  flip after one release of stability.
- **`pirc-modern` merge.** Confirm this is acceptable (it's a judgement call).
  Alternative is two separate families with near-identical treatment.
- **Family description copy.** Hand-written vs LLM-generated then reviewed.
  Twenty-five descriptions is a half-day of writing if hand-done; happy either
  way.
- **Phase 3 fate.** Repertoire grouping is the smallest of the three phases; if
  the repertoire UI is going to be reworked under another task, fold this into
  that work rather than landing it twice.

## 12. Out of scope (revisit later)

- Sub-families (e.g. `Sicilian: Najdorf` as its own grouping under Sicilian).
  Worth adding if v1 family rollups land well and users ask for finer
  aggregation.
- LLM-generated family descriptions integrated into the enrichment pipeline.
  Curated copy is fine for 25 entries.
- Family-level video/study curation pages (a "best Sicilian content" hub).
  Different feature, possibly part of Community Signal (TASK008 §3).
- Cross-family relationships (e.g. "transposes into"). Useful for London/KIA but
  a graph problem, not a taxonomy problem.

## 13. Related work

- **TASK008 §2** — origin of this spec.
- **TASK015** — Hierarchical Family Tree Navigation. Overlaps in intent
  (hierarchical opening relationships) but different surface (in-line tree on
  the detail page vs. a top-level family entity). Should be reviewed and either
  merged with this spec or explicitly scoped against it before TASK015 starts.
- **TASK011** — `/api/openings/search-index` is the integration point for the
  family search-card.
- **TASK009** — SEO middleware pattern that family pages need to follow.
