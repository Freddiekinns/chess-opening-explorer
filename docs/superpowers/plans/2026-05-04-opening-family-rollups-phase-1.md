# Opening Family Rollups — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "opening family" first-class data: hand-curated taxonomy resolved
at build time, surfaced in the search-index, and rendered as a group-by toggle
on Analyse with weighted rollup rows.

**Architecture:** Hand-authored `data/families.json` +
`data/family-overrides.json`. Build-time resolver (`tools/family-taxonomy/`)
writes `family_id` and `family_display_name` into each opening record during
`npm run build:vercel`. Search-index payload carries those fields so client-side
aggregation in `PersonalOpeningStats.tsx` can group games by family without a
new server endpoint. New `/api/families` endpoint serves the family list.
Coverage gate (<2% uncategorised) fails the build.

**Tech Stack:** Node.js build scripts, Express/Vercel serverless API, React 19 +
TypeScript + CSS Modules, Vitest (frontend), Jest (backend).

**Spec:** `.github/memory-bank/specs/2026-05-04-opening-family-rollups.md`
**Branch:** `feature/opening-family-rollups`

---

## Spec deviation (read first)

Spec §5.2 proposes adding `?group_by=family` to a personal stats endpoint.
Reality: personal stats are computed **client-side** in
`PersonalOpeningStats.tsx` from raw PGNs returned by `/api/personal/games`;
there is no server-side stats endpoint to extend. This plan keeps aggregation
client-side and feeds it `family_id` via the existing
`/api/openings/search-index` payload (already the data spine for that page). No
new server-side aggregation logic; less surface area, same UX. Phases 2/3 are
unaffected.

## Naming-collision warning

`/api/openings/family/:familyCode` already exists (ECO letter A/B/C/D/E lookup,
see `packages/api/src/routes/openings.routes.js:594`). The new endpoint
introduced here is `/api/families` (plural, top-level). Don't merge them.

## File Structure

**New files:**

- `data/families.json` — canonical family list (~25 entries)
- `data/family-overrides.json` — manual override rules
- `tools/family-taxonomy/resolve-family.js` — pure resolver function
- `tools/family-taxonomy/build-family-index.js` — build-pipeline integration:
  enriches ECO files with `family_id`, writes coverage report
- `tools/family-taxonomy/__tests__/resolve-family.test.js` — Jest unit tests for
  the resolver
- `tools/family-taxonomy/__tests__/build-family-index.test.js` — coverage-gate
  test
- `packages/api/src/routes/families.routes.js` — `GET /api/families`
- `packages/web/src/components/personal/familyAggregation.ts` — pure client-side
  rollup helper
- `packages/web/src/components/personal/__tests__/familyAggregation.test.ts` —
  Vitest unit tests

**Modified files:**

- `packages/shared/src/utils/pgn-utils.ts` — add `family_id?` and
  `family_display_name?` to `OpeningForLookup`
- `packages/api/src/services/eco-service.js` — pass through
  `family_id`/`family_display_name` if present in source data
- `packages/api/src/routes/openings.routes.js` — include both fields in
  `/api/openings/search-index` map output
- `packages/api/src/index.js` (or wherever routes mount) — register
  `families.routes.js`
- `scripts/prepare-vercel-data.js` — invoke `build-family-index.js`, copy
  `families.json` into `api/data/`
- `vercel.json` — add `Cache-Control` for `/api/families`
- `packages/web/src/components/personal/PersonalOpeningStats.tsx` — toggle,
  grouped render, expand chevron, diversity counter, "Other" bucket
- `packages/web/src/components/personal/PersonalOpeningStats.module.css` —
  styles for grouped row, chevron, diversity badge
- `.github/memory-bank/activeContext.md` + `progress.md` — record phase
  completion

---

## Module 1 — Taxonomy data + resolver

### Task 1: Seed `data/families.json`

**Files:**

- Create: `data/families.json`

- [ ] **Step 1: Write the seed family list**

Hand-author the canonical list per spec §3.2. Use this exact content
(descriptions are deliberately concise; refine with copywriting later):

```json
{
  "sicilian": {
    "id": "sicilian",
    "display_name": "Sicilian Defense",
    "slug": "sicilian-defense",
    "eco_anchor": "B20–B99",
    "colour_for": "black",
    "short_description": "Black's most-analysed answer to 1.e4, fighting for an asymmetric game from move one.",
    "popular_variation_ecos": ["B90", "B30", "B22"]
  },
  "french": {
    "id": "french",
    "display_name": "French Defense",
    "slug": "french-defense",
    "eco_anchor": "C00–C19",
    "colour_for": "black",
    "short_description": "Solid and structural — Black accepts a cramped position for a fixed pawn chain and counterplay on the queenside.",
    "popular_variation_ecos": ["C11", "C02", "C10"]
  },
  "caro-kann": {
    "id": "caro-kann",
    "display_name": "Caro-Kann Defense",
    "slug": "caro-kann-defense",
    "eco_anchor": "B10–B19",
    "colour_for": "black",
    "short_description": "A reputation for solidity at any level — Black supports …d5 with …c6 and aims for a clean structure.",
    "popular_variation_ecos": ["B12", "B18", "B10"]
  },
  "pirc-modern": {
    "id": "pirc-modern",
    "display_name": "Pirc & Modern Defense",
    "slug": "pirc-modern-defense",
    "eco_anchor": "B06–B09",
    "colour_for": "black",
    "short_description": "Hypermodern systems where Black fianchettos and concedes the centre, then strikes back.",
    "popular_variation_ecos": ["B07", "B06", "B08"]
  },
  "scandinavian": {
    "id": "scandinavian",
    "display_name": "Scandinavian Defense",
    "slug": "scandinavian-defense",
    "eco_anchor": "B01",
    "colour_for": "black",
    "short_description": "1…d5 immediately challenges the centre — direct and easy to learn at club level.",
    "popular_variation_ecos": ["B01"]
  },
  "alekhine": {
    "id": "alekhine",
    "display_name": "Alekhine's Defense",
    "slug": "alekhines-defense",
    "eco_anchor": "B02–B05",
    "colour_for": "black",
    "short_description": "Provocative — Black invites White to chase the knight and overextend.",
    "popular_variation_ecos": ["B03", "B04", "B05"]
  },
  "ruy-lopez": {
    "id": "ruy-lopez",
    "display_name": "Ruy Lopez",
    "slug": "ruy-lopez",
    "eco_anchor": "C60–C99",
    "colour_for": "white",
    "short_description": "The classical 1.e4 main line — deep theory, slow strategic battles.",
    "popular_variation_ecos": ["C65", "C78", "C84"]
  },
  "italian": {
    "id": "italian",
    "display_name": "Italian Game",
    "slug": "italian-game",
    "eco_anchor": "C50–C59",
    "colour_for": "white",
    "short_description": "The oldest open game — quiet Giuoco Pianissimo or sharp Evans Gambit.",
    "popular_variation_ecos": ["C50", "C53", "C55"]
  },
  "scotch": {
    "id": "scotch",
    "display_name": "Scotch Game",
    "slug": "scotch-game",
    "eco_anchor": "C44–C45",
    "colour_for": "white",
    "short_description": "White trades central tension for an open game and quick development.",
    "popular_variation_ecos": ["C45", "C44"]
  },
  "kings-gambit": {
    "id": "kings-gambit",
    "display_name": "King's Gambit",
    "slug": "kings-gambit",
    "eco_anchor": "C30–C39",
    "colour_for": "white",
    "short_description": "Romantic and aggressive — White sacrifices a pawn for the centre and the f-file.",
    "popular_variation_ecos": ["C33", "C37", "C30"]
  },
  "vienna": {
    "id": "vienna",
    "display_name": "Vienna Game",
    "slug": "vienna-game",
    "eco_anchor": "C25–C29",
    "colour_for": "white",
    "short_description": "A flexible 1.e4 e5 system that often transposes into King's Gambit positions.",
    "popular_variation_ecos": ["C26", "C25", "C29"]
  },
  "petroff": {
    "id": "petroff",
    "display_name": "Petroff Defense",
    "slug": "petroff-defense",
    "eco_anchor": "C42–C43",
    "colour_for": "black",
    "short_description": "Symmetrical and rock-solid — Black mirrors White and aims for equality.",
    "popular_variation_ecos": ["C42", "C43"]
  },
  "philidor": {
    "id": "philidor",
    "display_name": "Philidor Defense",
    "slug": "philidor-defense",
    "eco_anchor": "C41",
    "colour_for": "black",
    "short_description": "An old, passive-but-solid setup with …d6 and …Nf6.",
    "popular_variation_ecos": ["C41"]
  },
  "queens-gambit": {
    "id": "queens-gambit",
    "display_name": "Queen's Gambit",
    "slug": "queens-gambit",
    "eco_anchor": "D06–D69",
    "colour_for": "white",
    "short_description": "1.d4 d5 2.c4 — strategic battles around the central pawn structure.",
    "popular_variation_ecos": ["D37", "D30", "D45"]
  },
  "slav": {
    "id": "slav",
    "display_name": "Slav Defense",
    "slug": "slav-defense",
    "eco_anchor": "D10–D19",
    "colour_for": "black",
    "short_description": "Black supports …d5 with …c6 and avoids the typical Queen's Gambit problems with the c8 bishop.",
    "popular_variation_ecos": ["D15", "D10", "D17"]
  },
  "kings-indian": {
    "id": "kings-indian",
    "display_name": "King's Indian Defense",
    "slug": "kings-indian-defense",
    "eco_anchor": "E60–E99",
    "colour_for": "black",
    "short_description": "Black fianchettos the king's bishop, lets White claim the centre, then breaks with …e5 or …c5.",
    "popular_variation_ecos": ["E97", "E60", "E90"]
  },
  "nimzo-indian": {
    "id": "nimzo-indian",
    "display_name": "Nimzo-Indian Defense",
    "slug": "nimzo-indian-defense",
    "eco_anchor": "E20–E59",
    "colour_for": "black",
    "short_description": "3…Bb4 pins the c3-knight — flexible and structurally rich.",
    "popular_variation_ecos": ["E32", "E20", "E40"]
  },
  "queens-indian": {
    "id": "queens-indian",
    "display_name": "Queen's Indian Defense",
    "slug": "queens-indian-defense",
    "eco_anchor": "E12–E19",
    "colour_for": "black",
    "short_description": "Black fianchettos to b7 and contests the long diagonal.",
    "popular_variation_ecos": ["E15", "E12", "E17"]
  },
  "grunfeld": {
    "id": "grunfeld",
    "display_name": "Grünfeld Defense",
    "slug": "grunfeld-defense",
    "eco_anchor": "D70–D99",
    "colour_for": "black",
    "short_description": "Black gives up the centre temporarily, then dismantles it with active piece play.",
    "popular_variation_ecos": ["D85", "D70", "D90"]
  },
  "catalan": {
    "id": "catalan",
    "display_name": "Catalan Opening",
    "slug": "catalan-opening",
    "eco_anchor": "E00–E09",
    "colour_for": "white",
    "short_description": "Queen's Gambit with a kingside fianchetto — long-term pressure on the long diagonal.",
    "popular_variation_ecos": ["E05", "E01", "E08"]
  },
  "english": {
    "id": "english",
    "display_name": "English Opening",
    "slug": "english-opening",
    "eco_anchor": "A10–A39",
    "colour_for": "white",
    "short_description": "1.c4 — flexible, transpositional, often reaches reversed Sicilian structures.",
    "popular_variation_ecos": ["A15", "A20", "A30"]
  },
  "reti": {
    "id": "reti",
    "display_name": "Réti Opening",
    "slug": "reti-opening",
    "eco_anchor": "A04–A09",
    "colour_for": "white",
    "short_description": "A hypermodern start — White develops without committing the central pawns.",
    "popular_variation_ecos": ["A07", "A05", "A09"]
  },
  "london": {
    "id": "london",
    "display_name": "London System",
    "slug": "london-system",
    "eco_anchor": "transposition",
    "colour_for": "white",
    "short_description": "A solid, low-theory setup — White plays d4, Nf3, Bf4 in almost any move order.",
    "popular_variation_ecos": ["A48", "D02"]
  },
  "kia": {
    "id": "kia",
    "display_name": "King's Indian Attack",
    "slug": "kings-indian-attack",
    "eco_anchor": "transposition",
    "colour_for": "white",
    "short_description": "King's Indian setup with colours reversed — system-style with kingside attacking ideas.",
    "popular_variation_ecos": ["A07", "A08"]
  },
  "dutch": {
    "id": "dutch",
    "display_name": "Dutch Defense",
    "slug": "dutch-defense",
    "eco_anchor": "A80–A99",
    "colour_for": "black",
    "short_description": "1…f5 — Black takes space on the kingside and plays for an attack.",
    "popular_variation_ecos": ["A87", "A80", "A90"]
  },
  "benoni-benko": {
    "id": "benoni-benko",
    "display_name": "Benoni & Benko",
    "slug": "benoni-benko",
    "eco_anchor": "A56–A79",
    "colour_for": "black",
    "short_description": "Asymmetric pawn structures — Benoni's central pawn chain or Benko's pawn sacrifice for queenside pressure.",
    "popular_variation_ecos": ["A57", "A70", "A65"]
  },
  "trompowsky": {
    "id": "trompowsky",
    "display_name": "Trompowsky Attack",
    "slug": "trompowsky-attack",
    "eco_anchor": "A45",
    "colour_for": "white",
    "short_description": "An early Bg5 sidesteps the Indian defenses and provokes structural concessions.",
    "popular_variation_ecos": ["A45"]
  },
  "irregular": {
    "id": "irregular",
    "display_name": "Irregular Openings",
    "slug": "irregular-openings",
    "eco_anchor": "A00–A03",
    "colour_for": "both",
    "short_description": "Off-beat first moves — gambits and surprises rarely seen at master level.",
    "popular_variation_ecos": ["A00", "A01", "A02"]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add data/families.json
git commit -m "feat(taxonomy): seed canonical family list"
```

---

### Task 2: Seed `data/family-overrides.json`

**Files:**

- Create: `data/family-overrides.json`

- [ ] **Step 1: Author the override skeleton**

Spec §3.1, §8 list the cases. Indian Game → KID/Nimzo/Queen's Indian/Grünfeld;
transposition systems by exact name. Resolver evaluates rules in order and uses
the first match.

```json
{
  "overrides": [
    { "match": { "name_prefix": "London System" }, "family_id": "london" },
    { "match": { "name_prefix": "King's Indian Attack" }, "family_id": "kia" },
    { "match": { "name_prefix": "Trompowsky" }, "family_id": "trompowsky" },
    {
      "match": { "name_prefix": "Indian Game: King's Indian" },
      "family_id": "kings-indian"
    },
    {
      "match": { "name_prefix": "Indian Game: Nimzo" },
      "family_id": "nimzo-indian"
    },
    {
      "match": { "name_prefix": "Indian Game: Queen's Indian" },
      "family_id": "queens-indian"
    },
    {
      "match": { "name_prefix": "Indian Game: Grünfeld" },
      "family_id": "grunfeld"
    },
    {
      "match": { "name_prefix": "Indian Game: Anti-Grünfeld" },
      "family_id": "grunfeld"
    },
    {
      "match": { "name_prefix": "Modern Defense" },
      "family_id": "pirc-modern"
    },
    { "match": { "name_prefix": "Pirc Defense" }, "family_id": "pirc-modern" },
    { "match": { "name_prefix": "Réti Opening" }, "family_id": "reti" },
    { "match": { "name_prefix": "Reti Opening" }, "family_id": "reti" },
    { "match": { "name_prefix": "Benko Gambit" }, "family_id": "benoni-benko" },
    { "match": { "name_prefix": "Benoni" }, "family_id": "benoni-benko" }
  ]
}
```

This is a starting set. More rules will land via Task 5 once coverage runs
against real ECO data.

- [ ] **Step 2: Commit**

```bash
git add data/family-overrides.json
git commit -m "feat(taxonomy): seed family override rules"
```

---

### Task 3: Resolver function (TDD)

**Files:**

- Create: `tools/family-taxonomy/resolve-family.js`
- Create: `tools/family-taxonomy/__tests__/resolve-family.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/family-taxonomy/__tests__/resolve-family.test.js
const { createResolver } = require('../resolve-family');

const families = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
  'caro-kann': { id: 'caro-kann', display_name: 'Caro-Kann Defense' },
  'kings-indian': { id: 'kings-indian', display_name: "King's Indian Defense" },
  london: { id: 'london', display_name: 'London System' },
  'pirc-modern': { id: 'pirc-modern', display_name: 'Pirc & Modern Defense' },
};
const overrides = {
  overrides: [
    { match: { name_prefix: 'London System' }, family_id: 'london' },
    {
      match: { name_prefix: "Indian Game: King's Indian" },
      family_id: 'kings-indian',
    },
    { match: { name_prefix: 'Pirc Defense' }, family_id: 'pirc-modern' },
    { match: { name_prefix: 'Modern Defense' }, family_id: 'pirc-modern' },
  ],
};

describe('resolveFamily', () => {
  const resolve = createResolver(families, overrides);

  test('colon-prefix match: "Sicilian Defense: Najdorf" → sicilian', () => {
    expect(
      resolve({ eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' })
    ).toBe('sicilian');
  });

  test('self-named root: "Caro-Kann Defense" → caro-kann', () => {
    expect(resolve({ eco: 'B10', name: 'Caro-Kann Defense' })).toBe(
      'caro-kann'
    );
  });

  test('override beats colon-split: "London System: Reversed" → london', () => {
    expect(resolve({ eco: 'D02', name: 'London System: Reversed' })).toBe(
      'london'
    );
  });

  test('Indian Game split: "Indian Game: King\'s Indian Variation" → kings-indian', () => {
    expect(
      resolve({ eco: 'A48', name: "Indian Game: King's Indian Variation" })
    ).toBe('kings-indian');
  });

  test('Pirc collapses to pirc-modern via override', () => {
    expect(resolve({ eco: 'B07', name: 'Pirc Defense: Classical' })).toBe(
      'pirc-modern'
    );
  });

  test('Modern collapses to pirc-modern via override', () => {
    expect(resolve({ eco: 'B06', name: 'Modern Defense: Standard' })).toBe(
      'pirc-modern'
    );
  });

  test('case-insensitive display-name match', () => {
    expect(resolve({ eco: 'B20', name: 'sicilian defense: kalashnikov' })).toBe(
      'sicilian'
    );
  });

  test('whitespace tolerance', () => {
    expect(
      resolve({ eco: 'B20', name: '  Sicilian Defense:Kalashnikov  ' })
    ).toBe('sicilian');
  });

  test('unmatched falls back to uncategorised', () => {
    expect(resolve({ eco: 'A00', name: 'Some Obscure Gambit' })).toBe(
      'uncategorised'
    );
  });

  test('override order: first match wins', () => {
    const ordered = createResolver(families, {
      overrides: [
        { match: { name_prefix: 'Pirc Defense' }, family_id: 'pirc-modern' },
        { match: { name_prefix: 'Pirc' }, family_id: 'sicilian' }, // contradictory; first should win
      ],
    });
    expect(ordered({ eco: 'B07', name: 'Pirc Defense: Classical' })).toBe(
      'pirc-modern'
    );
  });

  test('exact-name override match', () => {
    const r = createResolver(families, {
      overrides: [{ match: { name: 'London System' }, family_id: 'london' }],
    });
    expect(r({ eco: 'D02', name: 'London System' })).toBe('london');
    expect(r({ eco: 'D02', name: 'London System: Reversed' })).toBe(
      'uncategorised'
    );
  });

  test('eco-only override match', () => {
    const r = createResolver(families, {
      overrides: [{ match: { eco: 'A45' }, family_id: 'london' }],
    });
    expect(r({ eco: 'A45', name: 'Anything' })).toBe('london');
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npx jest tools/family-taxonomy/__tests__/resolve-family.test.js` Expected:
FAIL — module not found.

- [ ] **Step 3: Implement the resolver**

```js
// tools/family-taxonomy/resolve-family.js
'use strict';

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function matchOverride(rule, opening) {
  const m = rule.match || {};
  if (m.name && normalise(m.name) !== normalise(opening.name)) return false;
  if (m.eco && m.eco.toUpperCase() !== String(opening.eco || '').toUpperCase())
    return false;
  if (m.name_prefix) {
    if (!normalise(opening.name).startsWith(normalise(m.name_prefix)))
      return false;
  }
  return Boolean(m.name || m.eco || m.name_prefix);
}

function createResolver(families, overrideFile) {
  const overrides = (overrideFile && overrideFile.overrides) || [];
  const familyIds = new Set(Object.keys(families));
  const displayNameToId = new Map();
  for (const id of familyIds) {
    displayNameToId.set(normalise(families[id].display_name), id);
  }

  return function resolve(opening) {
    for (const rule of overrides) {
      if (matchOverride(rule, opening)) {
        if (familyIds.has(rule.family_id)) return rule.family_id;
      }
    }
    const name = String(opening.name || '').trim();
    const colon = name.indexOf(':');
    if (colon === -1) {
      const hit = displayNameToId.get(normalise(name));
      if (hit) return hit;
    } else {
      const prefix = name.slice(0, colon);
      const hit = displayNameToId.get(normalise(prefix));
      if (hit) return hit;
    }
    return 'uncategorised';
  };
}

module.exports = { createResolver };
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npx jest tools/family-taxonomy/__tests__/resolve-family.test.js` Expected:
11 passed.

- [ ] **Step 5: Commit**

```bash
git add tools/family-taxonomy/resolve-family.js tools/family-taxonomy/__tests__/resolve-family.test.js
git commit -m "feat(taxonomy): pure resolver function with TDD coverage"
```

---

### Task 4: Build-pipeline integration

**Files:**

- Create: `tools/family-taxonomy/build-family-index.js`
- Modify: `scripts/prepare-vercel-data.js`

- [ ] **Step 1: Implement the build-time enrichment script**

```js
// tools/family-taxonomy/build-family-index.js
'use strict';

const fs = require('fs');
const path = require('path');
const { createResolver } = require('./resolve-family');

const ROOT = path.resolve(__dirname, '..', '..');
const ECO_DIR = path.join(ROOT, 'api', 'data', 'eco');
const FAMILIES_PATH = path.join(ROOT, 'data', 'families.json');
const OVERRIDES_PATH = path.join(ROOT, 'data', 'family-overrides.json');
const REPORT_PATH = path.join(
  ROOT,
  'api',
  'data',
  'family-coverage-report.json'
);
const COVERAGE_THRESHOLD = 0.02;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function run({ failOnLowCoverage = true } = {}) {
  const families = loadJson(FAMILIES_PATH);
  const overrides = fs.existsSync(OVERRIDES_PATH)
    ? loadJson(OVERRIDES_PATH)
    : { overrides: [] };
  const resolve = createResolver(families, overrides);

  const ecoFiles = [
    'ecoA.json',
    'ecoB.json',
    'ecoC.json',
    'ecoD.json',
    'ecoE.json',
  ];
  let total = 0;
  let uncategorised = 0;
  const uncategorisedSamples = [];
  const familyCounts = {};

  for (const file of ecoFiles) {
    const filePath = path.join(ECO_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[family-index] skip missing ${file}`);
      continue;
    }
    const data = loadJson(filePath);
    let touched = 0;
    for (const fen of Object.keys(data)) {
      const opening = data[fen];
      const familyId = resolve({ eco: opening.eco, name: opening.name });
      opening.family_id = familyId;
      opening.family_display_name =
        familyId === 'uncategorised' ? null : families[familyId].display_name;
      total += 1;
      familyCounts[familyId] = (familyCounts[familyId] || 0) + 1;
      if (familyId === 'uncategorised') {
        uncategorised += 1;
        if (uncategorisedSamples.length < 50) {
          uncategorisedSamples.push({ eco: opening.eco, name: opening.name });
        }
      }
      touched += 1;
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[family-index] ${file}: enriched ${touched} entries`);
  }

  const coverage = total === 0 ? 1 : 1 - uncategorised / total;
  const report = {
    generated_at: new Date().toISOString(),
    total,
    uncategorised,
    coverage,
    threshold: 1 - COVERAGE_THRESHOLD,
    family_counts: familyCounts,
    uncategorised_samples: uncategorisedSamples,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(
    `[family-index] coverage ${(coverage * 100).toFixed(2)}% (uncategorised ${uncategorised}/${total})`
  );

  if (failOnLowCoverage && uncategorised / total > COVERAGE_THRESHOLD) {
    console.error(
      `[family-index] FAIL: uncategorised ${((100 * uncategorised) / total).toFixed(2)}% exceeds ${COVERAGE_THRESHOLD * 100}% threshold. Add overrides in data/family-overrides.json.`
    );
    process.exit(1);
  }

  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run };
```

- [ ] **Step 2: Wire into `scripts/prepare-vercel-data.js`**

Read the file first to find the right insertion point. Add after the ECO
directory copy completes (so enrichment runs against the freshly-copied
`api/data/eco/`):

```js
// Near the end, after copyDirectory('eco', ...)
console.log('🧬 Resolving opening families...');
const {
  run: runFamilyIndex,
} = require('../tools/family-taxonomy/build-family-index');
runFamilyIndex();

// Copy families.json into api/data so the API can serve it
const familiesSrc = path.join(ROOT_DIR, 'data', 'families.json');
const familiesDst = path.join(TARGET_DATA_DIR, 'families.json');
if (fs.existsSync(familiesSrc)) {
  fs.copyFileSync(familiesSrc, familiesDst);
  console.log('✅ Copied families.json');
}
```

- [ ] **Step 3: Run the full prep + verify enrichment**

Run: `npm run build:vercel` (this runs `prepare-vercel-data.js` then the build).
Expected: succeeds; `api/data/family-coverage-report.json` exists with
`coverage >= 0.98`. If the run fails the coverage gate, that's expected —
proceed to Task 5.

- [ ] **Step 4: Commit (whether coverage passes or fails)**

```bash
git add tools/family-taxonomy/build-family-index.js scripts/prepare-vercel-data.js
git commit -m "feat(taxonomy): build-time family enrichment + coverage gate"
```

---

### Task 5: Backfill overrides until coverage gate passes

**Files:**

- Modify: `data/family-overrides.json` (iteratively)

- [ ] **Step 1: Read the coverage report**

```bash
node -e "const r=require('./api/data/family-coverage-report.json'); console.log('coverage:', r.coverage); console.log('uncategorised:', r.uncategorised, '/', r.total); console.log('top 30 unmapped:'); r.uncategorised_samples.slice(0,30).forEach(s=>console.log(' ', s.eco, '|', s.name));"
```

- [ ] **Step 2: Group the unmapped names by their colon-prefix or root noun**

Manually scan the sample list. For each cluster (e.g. "Bird Opening: ...",
"Polish Opening: ...", "Old Indian: ..."):

- If it deserves its own family, add a record to `data/families.json`.
- If it should fold into an existing family, add an override rule with
  `name_prefix`.
- If it's truly irregular, add an override rule pointing at `irregular`.

Common candidates expected to need rules: Bird's Opening, Polish (Sokolsky),
Larsen, Nimzowitsch-Larsen Attack, Bishop's Opening, Ponziani, Old Indian
Defense, Budapest Gambit, Englund Gambit, Owen's Defense, Latvian Gambit,
Elephant Gambit. Decide one-by-one.

- [ ] **Step 3: Re-run the build until coverage passes**

```bash
npm run build:vercel
```

Repeat Steps 1–2 until coverage ≥ 98%.

- [ ] **Step 4: Add a coverage-gate test that runs against a fixture**

Create `tools/family-taxonomy/__tests__/build-family-index.test.js`:

```js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createResolver } = require('../resolve-family');

describe('coverage gate logic', () => {
  test('createResolver assigns uncategorised on miss and a real id on hit', () => {
    const families = {
      sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
    };
    const resolve = createResolver(families, { overrides: [] });
    expect(resolve({ eco: 'B20', name: 'Sicilian Defense: Najdorf' })).toBe(
      'sicilian'
    );
    expect(resolve({ eco: 'A00', name: 'Mystery Opening' })).toBe(
      'uncategorised'
    );
  });

  test('snapshot of uncategorised proportion stays under 2% on real ECO data', () => {
    const reportPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'api',
      'data',
      'family-coverage-report.json'
    );
    if (!fs.existsSync(reportPath)) {
      console.warn(
        'coverage report not generated yet; run npm run build:vercel'
      );
      return;
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.uncategorised / report.total).toBeLessThanOrEqual(0.02);
  });
});
```

- [ ] **Step 5: Run all taxonomy tests + commit**

```bash
npx jest tools/family-taxonomy --testPathIgnorePatterns='\.worktrees'
git add data/family-overrides.json data/families.json tools/family-taxonomy/__tests__/build-family-index.test.js api/data/family-coverage-report.json
git commit -m "feat(taxonomy): backfill overrides to <2% uncategorised"
```

---

## Module 2 — API surface

### Task 6: Pass `family_id`/`family_display_name` through the search-index

**Files:**

- Modify: `packages/shared/src/utils/pgn-utils.ts`
- Modify: `packages/api/src/routes/openings.routes.js` (search-index handler)
- Modify: `packages/api/src/services/eco-service.js` (`getAllOpenings` map)

- [ ] **Step 1: Extend the `OpeningForLookup` shared type**

Edit `packages/shared/src/utils/pgn-utils.ts:37-42`:

```ts
export interface OpeningForLookup {
  fen: string;
  name: string;
  eco: string;
  moves?: string;
  family_id?: string;
  family_display_name?: string | null;
}
```

- [ ] **Step 2: Rebuild the shared package**

Run: `npm run build --workspace=packages/shared` (or whatever the project uses —
check `package.json` scripts). Expected:
`packages/shared/dist/utils/pgn-utils.d.ts` now has the new fields.

- [ ] **Step 3: Update `eco-service.js` to expose the fields**

Find `getAllOpenings` (and any helper that maps a raw ECO entry to the public
shape). Add `family_id` and `family_display_name` to the returned object. Single
grep to find all sites:

Run:
`grep -nE "name:\s*opening\.name|eco:\s*opening\.eco" packages/api/src/services/eco-service.js`

For each mapping, add the two new fields, e.g.:

```js
{
  fen: opening.fen,
  name: opening.name,
  eco: opening.eco,
  moves: opening.moves || '',
  family_id: opening.family_id,
  family_display_name: opening.family_display_name || null,
  // ... existing fields
}
```

- [ ] **Step 4: Update the search-index route**

In `packages/api/src/routes/openings.routes.js` find the
`searchIndex = allOpenings.map(...)` block (~line 519) and add the two fields.
Keep the lookup-only branch unchanged (they're not needed when `fields=lookup`):

```js
let searchIndex = allOpenings.map((opening) => ({
  fen: opening.fen,
  name: opening.name,
  eco: opening.eco,
  ...(isLookupOnly ? {} : { moves: opening.moves || '' }),
  ...(isLookupOnly
    ? {}
    : opening.games_analyzed && { games_analyzed: opening.games_analyzed }),
  family_id: opening.family_id,
  family_display_name: opening.family_display_name || null,
}));
```

- [ ] **Step 5: Smoke-test locally**

Run: `npm run dev:api` (background) Then in another terminal:
`curl -s http://localhost:3010/api/openings/search-index?limit=3 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.data[0],null,2))})"`
Expected: first item has `family_id` and `family_display_name`.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/pgn-utils.ts packages/api/src/services/eco-service.js packages/api/src/routes/openings.routes.js
git commit -m "feat(api): expose family_id and family_display_name on search-index"
```

---

### Task 7: New `GET /api/families` endpoint

**Files:**

- Create: `packages/api/src/routes/families.routes.js`
- Create: `tests/unit/families-routes.test.js`
- Modify: `packages/api/src/index.js` (or wherever routers mount — find with
  grep)
- Modify: `vercel.json` (Cache-Control)

- [ ] **Step 1: Locate the router-mount file**

Run:
`grep -rn "openings.routes\|courses.routes" packages/api/src --include="*.js" | head`
Look for the file that does `app.use('/api/openings', ...)`. Note its path;
you'll mount the new router there.

- [ ] **Step 2: Write the failing test**

```js
// tests/unit/families-routes.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');

// We test the route handler in isolation by stubbing the families.json read.
const familiesFixture = {
  sicilian: {
    id: 'sicilian',
    display_name: 'Sicilian Defense',
    slug: 'sicilian-defense',
    eco_anchor: 'B20–B99',
    colour_for: 'black',
    short_description: '…',
    popular_variation_ecos: ['B90'],
  },
  french: {
    id: 'french',
    display_name: 'French Defense',
    slug: 'french-defense',
    eco_anchor: 'C00–C19',
    colour_for: 'black',
    short_description: '…',
    popular_variation_ecos: ['C11'],
  },
};

jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    readFileSync: (p, enc) => {
      if (typeof p === 'string' && p.endsWith('families.json')) {
        return JSON.stringify(familiesFixture);
      }
      return real.readFileSync(p, enc);
    },
    existsSync: (p) => {
      if (typeof p === 'string' && p.endsWith('families.json')) return true;
      return require('fs').existsSync(p);
    },
  };
});

const express = require('express');
const familiesRouter = require('../../packages/api/src/routes/families.routes');

function makeApp() {
  const app = express();
  app.use('/api/families', familiesRouter);
  return app;
}

describe('GET /api/families', () => {
  test('returns all families with opening_count placeholder', async () => {
    const res = await request(makeApp()).get('/api/families');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    const ids = res.body.data.map((f) => f.id).sort();
    expect(ids).toEqual(['french', 'sicilian']);
    for (const f of res.body.data) {
      expect(f).toHaveProperty('display_name');
      expect(f).toHaveProperty('slug');
      expect(f).toHaveProperty('eco_anchor');
      expect(f).toHaveProperty('opening_count');
      expect(typeof f.opening_count).toBe('number');
    }
  });

  test('records are sorted alphabetically by display_name', async () => {
    const res = await request(makeApp()).get('/api/families');
    const names = res.body.data.map((f) => f.display_name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
```

- [ ] **Step 3: Run test, confirm it fails**

Run: `npx jest tests/unit/families-routes.test.js` Expected: FAIL — module not
found.

- [ ] **Step 4: Implement the route**

```js
// packages/api/src/routes/families.routes.js
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const FAMILIES_PATH = path.resolve(__dirname, '..', 'data', 'families.json');
const FAMILIES_PATH_FALLBACK = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'api',
  'data',
  'families.json'
);

let cache = null;
let cacheTime = 0;
const TTL_MS = 60 * 60 * 1000;

function loadFamilies() {
  const candidate = fs.existsSync(FAMILIES_PATH)
    ? FAMILIES_PATH
    : FAMILIES_PATH_FALLBACK;
  if (!fs.existsSync(candidate)) {
    throw new Error('families.json not found — run npm run build:vercel first');
  }
  return JSON.parse(fs.readFileSync(candidate, 'utf8'));
}

function buildResponse() {
  const now = Date.now();
  if (cache && now - cacheTime < TTL_MS) return cache;

  const families = loadFamilies();

  // opening_count is 0 by default; populated lazily if eco-service is available.
  let counts = {};
  try {
    const ecoService = require('../services/eco-service');
    const all =
      typeof ecoService.getAllOpenings === 'function'
        ? ecoService.getAllOpenings()
        : [];
    for (const o of all) {
      if (o.family_id) counts[o.family_id] = (counts[o.family_id] || 0) + 1;
    }
  } catch (_) {
    // eco-service may be unavailable in test contexts
  }

  const data = Object.values(families)
    .map((f) => ({
      id: f.id,
      display_name: f.display_name,
      slug: f.slug,
      eco_anchor: f.eco_anchor,
      colour_for: f.colour_for,
      short_description: f.short_description,
      popular_variation_ecos: f.popular_variation_ecos || [],
      opening_count: counts[f.id] || 0,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  cache = { success: true, data, count: data.length };
  cacheTime = now;
  return cache;
}

router.get('/', (req, res) => {
  try {
    res.json(buildResponse());
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 5: Mount the router**

In the router-mount file (located in Step 1) add alongside the existing
`app.use('/api/openings', openingsRoutes)`:

```js
const familiesRoutes = require('./routes/families.routes');
app.use('/api/families', familiesRoutes);
```

Also register it in the Vercel serverless wrapper. Check `api/` directory:

Run: `ls api/` If there's `api/openings.js` or similar, create `api/families.js`
mirroring the same pattern (most projects do
`module.exports = require('../packages/api/...')`).

- [ ] **Step 6: Add Cache-Control to `vercel.json`**

Add a new headers entry next to the existing `/api/openings/search-index` one:

```json
{
  "source": "/api/families",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "s-maxage=86400, stale-while-revalidate=86400"
    }
  ]
}
```

- [ ] **Step 7: Run tests + smoke test**

Run: `npx jest tests/unit/families-routes.test.js` Expected: PASS.

Run: `npm run dev:api` (background) then
`curl -s http://localhost:3010/api/families | head -c 400` Expected: JSON with
`success: true`, ~25 entries, each with `opening_count > 0`.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/routes/families.routes.js tests/unit/families-routes.test.js vercel.json
git add api/families.js  # if created
# plus the router-mount file
git commit -m "feat(api): add GET /api/families endpoint"
```

---

## Module 3 — Analyse page family rollup

### Task 8: Pure family-aggregation helper (TDD)

**Files:**

- Create: `packages/web/src/components/personal/familyAggregation.ts`
- Create:
  `packages/web/src/components/personal/__tests__/familyAggregation.test.ts`

The existing component aggregates per-opening into `Map<key, OpeningAgg>`. We
add a pure function that takes those maps plus the openings lookup data and
returns a family-grouped view, preserving by-colour separation (per spec §7).

- [ ] **Step 1: Write the failing test**

```ts
// packages/web/src/components/personal/__tests__/familyAggregation.test.ts
import { describe, expect, test } from 'vitest';
import {
  groupByFamily,
  type OpeningAggInput,
  type FamilyMeta,
} from '../familyAggregation';

const families: Record<string, FamilyMeta> = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
  french: { id: 'french', display_name: 'French Defense' },
};

const ag = (overrides: Partial<OpeningAggInput>): OpeningAggInput => ({
  key: 'unset',
  name: 'unset',
  eco: 'X00',
  family_id: 'sicilian',
  family_display_name: 'Sicilian Defense',
  games: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  ...overrides,
});

describe('groupByFamily', () => {
  test('sums games/wins/draws/losses per family', () => {
    const input: OpeningAggInput[] = [
      ag({
        key: 'k1',
        family_id: 'sicilian',
        games: 5,
        wins: 3,
        draws: 1,
        losses: 1,
      }),
      ag({
        key: 'k2',
        family_id: 'sicilian',
        games: 2,
        wins: 0,
        draws: 1,
        losses: 1,
      }),
      ag({
        key: 'k3',
        family_id: 'french',
        games: 4,
        wins: 2,
        draws: 0,
        losses: 2,
      }),
    ];
    const result = groupByFamily(input, families);
    const sicilian = result.find((r) => r.family_id === 'sicilian')!;
    expect(sicilian.games).toBe(7);
    expect(sicilian.wins).toBe(3);
    expect(sicilian.draws).toBe(2);
    expect(sicilian.losses).toBe(2);
    expect(sicilian.variation_count).toBe(2);
    expect(sicilian.score).toBeCloseTo((3 + 0.5 * 2) / 7);
  });

  test('groups missing family_id under uncategorised "Other"', () => {
    const input: OpeningAggInput[] = [
      ag({
        key: 'k1',
        family_id: undefined as any,
        family_display_name: undefined as any,
        games: 3,
        wins: 1,
        draws: 1,
        losses: 1,
      }),
      ag({
        key: 'k2',
        family_id: 'uncategorised',
        family_display_name: null,
        games: 2,
        wins: 0,
        draws: 1,
        losses: 1,
      }),
    ];
    const result = groupByFamily(input, families);
    expect(result).toHaveLength(1);
    expect(result[0].family_id).toBe('uncategorised');
    expect(result[0].display_name).toBe('Other');
    expect(result[0].games).toBe(5);
  });

  test('sorts by games descending', () => {
    const input: OpeningAggInput[] = [
      ag({ key: 'a', family_id: 'french', games: 1, wins: 1 }),
      ag({ key: 'b', family_id: 'sicilian', games: 9, wins: 9 }),
    ];
    const result = groupByFamily(input, families);
    expect(result.map((r) => r.family_id)).toEqual(['sicilian', 'french']);
  });

  test('exposes underlying variations sorted by games desc', () => {
    const input: OpeningAggInput[] = [
      ag({
        key: 'k1',
        name: 'Sicilian: Najdorf',
        family_id: 'sicilian',
        games: 2,
      }),
      ag({
        key: 'k2',
        name: 'Sicilian: Dragon',
        family_id: 'sicilian',
        games: 5,
      }),
      ag({
        key: 'k3',
        name: 'Sicilian: Sveshnikov',
        family_id: 'sicilian',
        games: 1,
      }),
    ];
    const [row] = groupByFamily(input, families);
    expect(row.variations.map((v) => v.name)).toEqual([
      'Sicilian: Dragon',
      'Sicilian: Najdorf',
      'Sicilian: Sveshnikov',
    ]);
  });

  test('preserves family display_name from families dict, falling back to family_display_name field', () => {
    const input: OpeningAggInput[] = [
      ag({
        key: 'k1',
        family_id: 'sicilian',
        family_display_name: 'WRONG',
        games: 1,
      }),
      ag({
        key: 'k2',
        family_id: 'unknown-id',
        family_display_name: 'Mystery Family',
        games: 1,
      }),
    ];
    const result = groupByFamily(input, families);
    const sicilian = result.find((r) => r.family_id === 'sicilian')!;
    expect(sicilian.display_name).toBe('Sicilian Defense'); // dict wins
    const mystery = result.find((r) => r.family_id === 'unknown-id')!;
    expect(mystery.display_name).toBe('Mystery Family'); // fallback
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm run test:frontend -- familyAggregation` Expected: FAIL — module not
found.

- [ ] **Step 3: Implement the helper**

```ts
// packages/web/src/components/personal/familyAggregation.ts
export interface OpeningAggInput {
  key: string;
  name: string;
  eco: string;
  family_id?: string;
  family_display_name?: string | null;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface FamilyMeta {
  id: string;
  display_name: string;
}

export interface FamilyVariationRow {
  key: string;
  name: string;
  eco: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface FamilyRollupRow {
  family_id: string;
  display_name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  variation_count: number;
  variations: FamilyVariationRow[];
}

const UNCATEGORISED = 'uncategorised';

export function groupByFamily(
  input: OpeningAggInput[],
  families: Record<string, FamilyMeta>
): FamilyRollupRow[] {
  const buckets = new Map<string, FamilyRollupRow>();

  for (const row of input) {
    const id =
      row.family_id && row.family_id.length > 0 ? row.family_id : UNCATEGORISED;
    const fromDict = families[id]?.display_name;
    const display =
      id === UNCATEGORISED
        ? 'Other'
        : fromDict || row.family_display_name || id;

    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = {
        family_id: id,
        display_name: display,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        score: 0,
        variation_count: 0,
        variations: [],
      };
      buckets.set(id, bucket);
    }
    bucket.games += row.games;
    bucket.wins += row.wins;
    bucket.draws += row.draws;
    bucket.losses += row.losses;
    bucket.variations.push({
      key: row.key,
      name: row.name,
      eco: row.eco,
      games: row.games,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
    });
  }

  for (const bucket of buckets.values()) {
    bucket.variation_count = bucket.variations.length;
    bucket.score =
      bucket.games === 0
        ? 0
        : (bucket.wins + 0.5 * bucket.draws) / bucket.games;
    bucket.variations.sort(
      (a, b) => b.games - a.games || a.name.localeCompare(b.name)
    );
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.games - a.games || a.display_name.localeCompare(b.display_name)
  );
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm run test:frontend -- familyAggregation` Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/personal/familyAggregation.ts packages/web/src/components/personal/__tests__/familyAggregation.test.ts
git commit -m "feat(personal): pure family-rollup aggregation helper"
```

---

### Task 9: Group-by toggle in `PersonalOpeningStats`

**Files:**

- Modify: `packages/web/src/components/personal/PersonalOpeningStats.tsx`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`

The existing component already builds two `Map<string, OpeningAgg>` (asWhite,
asBlack — see line ~556) which we'll feed into `groupByFamily` when the toggle
is set to `family`.

- [ ] **Step 1: Add the families fetch + toggle state at the top of the
      component**

Find where component-level state is declared (around
`useState<Dashboard | null>(null)` or similar) and add:

```tsx
const [groupBy, setGroupBy] = useState<'variation' | 'family'>('variation');
const [familiesDict, setFamiliesDict] = useState<
  Record<string, { id: string; display_name: string }>
>({});

useEffect(() => {
  let alive = true;
  fetch('/api/families')
    .then((r) => r.json())
    .then((j) => {
      if (!alive || !j?.success) return;
      const dict: Record<string, { id: string; display_name: string }> = {};
      for (const f of j.data)
        dict[f.id] = { id: f.id, display_name: f.display_name };
      setFamiliesDict(dict);
    })
    .catch(() => {});
  return () => {
    alive = false;
  };
}, []);
```

- [ ] **Step 2: Pipe `family_id` and `family_display_name` into the per-opening
      agg**

Find the block that builds `OpeningAgg` (search the file for `OpeningAgg`). When
the lookup succeeds and we record an entry, also store the family fields from
the matched opening:

```tsx
// Where the existing code does something like:
//   const entry = map.get(key) ?? { key, name, eco, games: 0, wins: 0, ... };
// extend the initial object:
const entry = map.get(key) ?? {
  key,
  name: lookup.bestMatch.name,
  eco: lookup.bestMatch.eco,
  family_id: lookup.bestMatch.family_id,
  family_display_name: lookup.bestMatch.family_display_name,
  games: 0,
  wins: 0,
  draws: 0,
  losses: 0,
};
```

Update the corresponding TypeScript `OpeningAgg` type (defined near the top of
the file) to include the optional
`family_id?: string; family_display_name?: string | null;` fields.

- [ ] **Step 3: Render the toggle pill**

Above the existing opening list (find the section header, e.g. "Your openings as
White"), render:

```tsx
<div
  className={styles.groupByToggle}
  role="tablist"
  aria-label="Group openings"
>
  <button
    role="tab"
    type="button"
    aria-selected={groupBy === 'variation'}
    className={
      groupBy === 'variation' ? styles.groupByActive : styles.groupByOption
    }
    onClick={() => setGroupBy('variation')}
  >
    Variation
  </button>
  <button
    role="tab"
    type="button"
    aria-selected={groupBy === 'family'}
    className={
      groupBy === 'family' ? styles.groupByActive : styles.groupByOption
    }
    onClick={() => setGroupBy('family')}
  >
    Family
  </button>
</div>
```

- [ ] **Step 4: Add styles**

In `PersonalOpeningStats.module.css`, append:

```css
.groupByToggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--surface-2, #1f1c1a);
  margin-bottom: 12px;
}
.groupByOption,
.groupByActive {
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  background: transparent;
  color: var(--text-muted, #a8a29e);
  cursor: pointer;
}
.groupByActive {
  background: var(--surface-3, #2b2724);
  color: var(--text, #f5f1ec);
}
.groupByOption:hover {
  color: var(--text, #f5f1ec);
}
```

- [ ] **Step 5: Verify build + commit (still rendering variation list — family
      render lands in next task)**

Run: `npm run test:frontend -- PersonalOpeningStats` (existing tests should
still pass) Run: `npm run build`

```bash
git add packages/web/src/components/personal/PersonalOpeningStats.tsx packages/web/src/components/personal/PersonalOpeningStats.module.css
git commit -m "feat(personal): group-by toggle UI and families fetch"
```

---

### Task 10: Family-grouped render path

**Files:**

- Modify: `packages/web/src/components/personal/PersonalOpeningStats.tsx`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`

- [ ] **Step 1: Build the family rows from the existing per-opening maps**

Where the component currently renders the `asWhite` and `asBlack` lists, derive
the family-grouped views with `useMemo`:

```tsx
import { groupByFamily } from './familyAggregation';

const familyRowsWhite = useMemo(
  () =>
    dashboard
      ? groupByFamily(
          Array.from(dashboard.byOpeningWhite.values()),
          familiesDict
        )
      : [],
  [dashboard, familiesDict]
);
const familyRowsBlack = useMemo(
  () =>
    dashboard
      ? groupByFamily(
          Array.from(dashboard.byOpeningBlack.values()),
          familiesDict
        )
      : [],
  [dashboard, familiesDict]
);
```

(The exact `dashboard` shape names — `byOpeningWhite`/`byOpeningBlack` vs the
current names — must match the file. Read the existing code first; rename if
needed.)

- [ ] **Step 2: Add the expand-row state**

```tsx
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const toggle = (key: string) =>
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
```

The `key` is `<colour>:<family_id>` so White/Black rollups don't collide.

- [ ] **Step 3: Build a `FamilyRow` sub-component**

Inside the file (keeping it co-located with the rest):

```tsx
const FamilyRow: React.FC<{
  colour: 'white' | 'black';
  row: FamilyRollupRow;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ row, isExpanded, onToggle }) => (
  <div className={styles.familyRow}>
    <button
      type="button"
      className={styles.familyHeader}
      onClick={onToggle}
      aria-expanded={isExpanded}
    >
      <span
        className={isExpanded ? styles.chevronOpen : styles.chevron}
        aria-hidden
      >
        ›
      </span>
      <span className={styles.familyName}>{row.display_name}</span>
      <span className={styles.familyMeta}>
        {row.games} {row.games === 1 ? 'game' : 'games'} · {row.variation_count}{' '}
        {row.variation_count === 1 ? 'variation' : 'variations'}
      </span>
    </button>
    <DistributionBar
      win={row.wins}
      draw={row.draws}
      loss={row.losses}
      games={row.games}
    />
    {isExpanded && (
      <ul className={styles.familyVariations}>
        {row.variations.map((v) => (
          <li key={v.key} className={styles.familyVariationItem}>
            <span className={styles.variationName}>{v.name}</span>
            <span className={styles.variationMeta}>
              {v.games} · {v.wins}-{v.draws}-{v.losses}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

(Type the `row` parameter by importing `FamilyRollupRow` from
`./familyAggregation`.)

- [ ] **Step 4: Switch the existing render to use the toggle**

Where the existing variation-list renders, wrap it in a conditional. Sketch:

```tsx
{groupBy === 'variation' ? (
  <ExistingVariationListAsWhite ... />
) : (
  <div>
    {familyRowsWhite.map((row) => (
      <FamilyRow
        key={`white:${row.family_id}`}
        colour="white"
        row={row}
        isExpanded={expanded.has(`white:${row.family_id}`)}
        onToggle={() => toggle(`white:${row.family_id}`)}
      />
    ))}
  </div>
)}
```

Mirror for Black. Keep the existing variation render path 100% unchanged
(regression safety).

- [ ] **Step 5: Add styles for the family row**

```css
.familyRow {
  border-left: 3px solid var(--accent-orange, #d97706);
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--surface-1, #1a1816);
  border-radius: 4px;
}
.familyHeader {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.familyName {
  font-family: var(--font-headline, 'DM Serif Display', serif);
  font-size: 18px;
  color: var(--text, #f5f1ec);
}
.familyMeta {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  color: var(--text-muted, #a8a29e);
  margin-left: auto;
}
.chevron,
.chevronOpen {
  display: inline-block;
  transition: transform 150ms ease;
  color: var(--accent-orange, #d97706);
  font-size: 18px;
  line-height: 1;
}
.chevronOpen {
  transform: rotate(90deg);
}
.familyVariations {
  list-style: none;
  margin: 8px 0 0 24px;
  padding: 0;
}
.familyVariationItem {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--text-secondary, #d6d3cd);
}
.variationMeta {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--text-muted, #a8a29e);
}
```

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev` (background), open `http://localhost:3000/analyse`, run an
analysis, switch the toggle to Family. Verify: Sicilian/French/etc. rows appear,
click expands to show variation list, distribution bar renders, "Other" row
appears for any uncategorised hits.

- [ ] **Step 7: Run frontend tests + commit**

Run: `npm run test:frontend` Expected: existing PersonalOpeningStats tests still
pass; no new failures.

```bash
git add packages/web/src/components/personal/PersonalOpeningStats.tsx packages/web/src/components/personal/PersonalOpeningStats.module.css
git commit -m "feat(personal): family-grouped opening rollup with expand"
```

---

### Task 11: Component-level test for the rendered family rollup

**Files:**

- Modify:
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`

- [ ] **Step 1: Read the existing test file to understand the mocking pattern**

Run:
`cat packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx | head -120`

Identify how `mockOpeningsData` is built and how `/api/personal/games` is
mocked.

- [ ] **Step 2: Add a new `describe` block exercising the family toggle**

Append (don't replace) a new block:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';

describe('family rollup', () => {
  beforeEach(() => {
    // Mock /api/families
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('/api/families')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'sicilian',
                display_name: 'Sicilian Defense',
                slug: 'sicilian-defense',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Delegate other URLs to whatever the existing setup expects
      return new Response('{}', { status: 200 });
    }) as any;
  });

  test('toggles between variation and family views', async () => {
    // Use whatever helper the existing tests use to render with mocked dashboard data
    // … render(<PersonalOpeningStats openingsData={mockOpeningsData} />);
    // (this test depends on the existing fixture; adapt fixture so >=1 row has family_id: 'sicilian')

    await waitFor(() => screen.getByRole('tab', { name: /family/i }));
    fireEvent.click(screen.getByRole('tab', { name: /family/i }));
    expect(await screen.findByText('Sicilian Defense')).toBeInTheDocument();
  });
});
```

(The test is sketched because the existing fixture/mock structure isn't
identical to what's described here — the implementer should adapt to the
patterns already in the file rather than rewriting them.)

- [ ] **Step 3: Run the test**

Run: `npm run test:frontend -- PersonalOpeningStats` Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx
git commit -m "test(personal): cover family-rollup toggle and render"
```

---

## Module 4 — Memory bank update

### Task 12: Record completion in the memory bank

**Files:**

- Modify: `.github/memory-bank/activeContext.md`
- Modify: `.github/memory-bank/progress.md`
- Modify: `.github/memory-bank/tasks/_index.md`

- [ ] **Step 1: Update `activeContext.md`**

Replace the current task block with:

```md
# Active Context

**Date:** <today's date>

## Current Task: Opening Family Rollups Phase 1 — Shipped

Phase 1 complete. Hand-curated `data/families.json` (~25 families) and
`data/family-overrides.json` resolved at build time into `family_id` +
`family_display_name` on every opening record. Coverage gate enforces <2%
uncategorised. New `GET /api/families` endpoint serves the family list with
per-family opening counts. `/api/openings/search-index` payload now carries
family fields. Analyse page has a Variation/Family toggle that groups personal
stats by family with weighted W/D/L bar, expand-to-variations, and an "Other"
row for the long tail.

Phase 2 (family lens route + chip system) and Phase 3 (repertoire grouping)
deferred — re-plan when ready.

## Previous Task: TASK008 Rewrite — Feature Roadmap

…(keep existing previous-task block)…
```

- [ ] **Step 2: Add a one-liner to `progress.md`**

At the top of "What's Done":

```md
- **Opening Family Rollups Phase 1** (<today's date>): Hand-curated taxonomy
  (`data/families.json` + overrides) resolved at build time, surfaced via
  `/api/families` and the search-index. Analyse page Variation/Family toggle
  with weighted rollup rows. Coverage gate <2% uncategorised.
```

- [ ] **Step 3: Update `_index.md`**

Add to the "In Progress" or "Pending" section a new entry tracking Phase 2/3
deferral, then move Phase 1 record to "Reference / Strategy" if appropriate. Use
whatever convention the file already uses.

- [ ] **Step 4: Commit**

```bash
git add .github/memory-bank/activeContext.md .github/memory-bank/progress.md .github/memory-bank/tasks/_index.md
git commit -m "docs(memory): record family rollups phase 1 completion"
```

---

## Pre-merge checklist

- [ ] `npm run build:vercel` exits 0 and produces
      `api/data/family-coverage-report.json` with coverage ≥ 0.98
- [ ] `npm test -- --testPathIgnorePatterns='\.worktrees'` — green (Jest
      backend)
- [ ] `npm run test:frontend` — green (Vitest)
- [ ] `npm run format` clean
- [ ] Manual smoke on `/analyse`: toggle works, expand works, "Other" row
      visible if any uncategorised hits, distribution bar renders
- [ ] Spec deviation noted in PR description (client-side aggregation instead of
      server `?group_by=family`)
- [ ] Naming-collision warning noted (kept existing
      `/api/openings/family/:familyCode`, added new `/api/families`)

## Out of scope for Phase 1 (re-plan later)

- `/family/<slug>` route (Phase 2)
- `FamilyChip` component, search-dropdown family-row variant, detail-page chip
  wiring (Phase 2)
- SSR/SEO + JSON-LD for family pages (Phase 2)
- Repertoire grouping (Phase 3)
