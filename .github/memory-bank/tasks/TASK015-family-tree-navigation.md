# [TASK015] - Hierarchical Family Tree Navigation

**Status:** Pending **Added:** 2026-03-17 **Updated:** 2026-03-17

## 1. Problem Statement

Chess openings have a natural hierarchy (Sicilian › Najdorf › 6.Bg5) but the UI
currently presents related openings as a flat sibling list. Users have no way to
understand where a specific variation sits in the broader theory tree, or
navigate "up" to see the family landscape.

## 2. User Journey

> User is learning the Sicilian and lands on **Najdorf Variation, 6.Bg5 (B99)**

1. **Breadcrumb reads:** `Sicilian Defense › Najdorf Variation › 6.Bg5` — they
   immediately understand the lineage
2. **Click "Najdorf Variation"** → land on B90 detail page, see nested tree of
   6.Bg5 / 6.Be3 / 6.f4 / English Attack
3. **Click "Sicilian Defense"** → land on new Family Overview page with card
   grid of all major Sicilian variations
4. **From the Family page**, compare Najdorf vs Dragon vs Scheveningen at a
   glance and choose what to study next

## 3. Design Decisions

| Decision                    | Choice                                       | Rationale                                                      |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Breadcrumb depth            | 3 levels max                                 | Covers 90% of cases; deeper positions show deepest 3 ancestors |
| Top-level click destination | New Family Overview page (`/family/:slug`)   | Hub experience, not just another detail page                   |
| Variations section          | Replace flat list with nested tree           | Makes hierarchy visible on the page itself                     |
| Hierarchy source            | Config-file-driven (`opening_families.json`) | Semantic names, curated groupings, ~20 families to define      |

## 4. Three UI Surfaces

### Surface 1: Breadcrumbs (every detail page)

- Location: above the opening title in the header
- Format: `Family › Variation › Line` (3 levels max)
- All but the rightmost level are clickable links
- Mobile: truncate middle level with `…` if needed

```
Sicilian Defense  ›  Najdorf Variation  ›  6.Bg5
King's Pawn  ›  Ruy Lopez  ›  Berlin Defense
```

### Surface 2: Variations section — nested tree (detail page)

Replaces the current flat `RelatedOpeningsTeaser` / `RelatedOpeningsTab`
siblings list.

- Shows: parent opening (one level up) + all siblings at current level, indented
- Current page highlighted; siblings are clickable
- "See all [Family] variations →" link at bottom
- Collapsed by default to top 5 siblings; expandable

```
Open Sicilian  (parent — clickable)
  ├── Najdorf Variation  ← current page
  ├── Dragon Variation
  ├── Scheveningen
  └── Classical Variation
  [See all Sicilian variations →]
```

### Surface 3: Family Overview Page (new route `/family/:slug`)

- Header: family name + ECO range + one-line description
- Body: card grid of top 6–8 variations by games_analyzed within the family
- Each card: name, ECO code, complexity tag, brief description, sub-variation
  count
- Below cards: collapsible full variation tree (all ECO codes in range, grouped)

## 5. Data Model

### `config/opening_families.json`

Maps ~20 major opening families. All families can be derived from existing ECO
data — no new external data needed.

```json
{
  "sicilian": {
    "name": "Sicilian Defense",
    "eco_range": ["B20", "B99"],
    "mainline_eco": "B20",
    "slug": "sicilian",
    "description": "The most popular response to 1.e4"
  },
  "ruy-lopez": {
    "name": "Ruy Lopez",
    "eco_range": ["C60", "C99"],
    "mainline_eco": "C60",
    "slug": "ruy-lopez",
    "description": "The oldest and most classical of openings"
  }
}
```

### `useOpeningHierarchy` hook

Given a FEN/ECO code, returns:

- `family` — matched family from config
- `breadcrumbs` — array of up to 3 `{ name, href }` items
- `siblings` — openings at the same depth within the family
- `parent` — immediate parent opening (one level up by move depth)

## 6. Key Files

| File                                                            | Status | Purpose                                              |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `config/opening_families.json`                                  | Create | Family definitions (ECO ranges, slugs, descriptions) |
| `packages/web/src/hooks/useOpeningHierarchy.ts`                 | Create | Derive breadcrumbs + tree from ECO data + config     |
| `packages/web/src/components/navigation/OpeningBreadcrumbs.tsx` | Create | Breadcrumb component for detail page header          |
| `packages/web/src/pages/FamilyOverviewPage.tsx`                 | Create | New family hub page                                  |
| `packages/web/src/components/detail/RelatedOpeningsTeaser.tsx`  | Modify | Replace flat list with nested tree                   |
| `packages/web/src/components/detail/RelatedOpeningsTab.tsx`     | Modify | Replace flat list with nested tree                   |
| `packages/api/src/routes/openings.routes.js`                    | Modify | Add `/api/openings/family/:slug` endpoint            |

## 7. Deferred / Out of Scope

- **Transposition awareness**: Same position via different move orders — which
  breadcrumb to show? Phase 2.
- **Visual tree diagram**: Graph/tree visualisation on the Family page. Phase 2
  polish.
- **Cross-family relationships**: Openings that belong to multiple families. Out
  of scope.

## 8. Verification

1. Navigate to any opening detail page → breadcrumb shows correct 3-level path
2. Click middle breadcrumb → lands on correct parent page with nested tree
3. Click top-level breadcrumb → lands on `/family/:slug` with card grid
4. Family page cards link through to correct detail pages
5. Variations section shows nested tree with parent + siblings, current page
   highlighted
6. `npm run test:frontend` — existing related openings tests still pass
7. `npm run build` — no TypeScript errors
