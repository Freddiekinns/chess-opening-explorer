# [TASK015] - Hierarchical Family Tree Navigation

**Status:** Pending **Added:** 2026-03-17 **Updated:** 2026-03-18

## 1. Problem Statement

Chess openings have a natural hierarchy (Sicilian › Najdorf › 6.Bg5) but the UI
currently presents related openings as a flat sibling list. Users have no way to
understand where a specific variation sits in the broader theory tree, or
navigate "up" to see the family landscape.

## 2. User Journeys

### Journey 1: "Where am I?" — Understanding lineage from a detail page

> **Persona:** Intermediate player who searched for "Najdorf" and landed on
> **Najdorf Variation, 6.Bg5 (B99)**

1. Breadcrumb reads: `Sicilian Defense › Najdorf Variation › 6.Bg5` — instant
   orientation
2. The variations section shows a nested tree: parent "Open Sicilian" at top,
   current position highlighted among siblings (6.Be3, 6.f4, English Attack)
3. They now understand this is _one specific line_ within the Najdorf, which is
   itself part of the Sicilian family

**UX goal:** Zero-click orientation. The breadcrumb and tree answer "where does
this fit?" without any interaction.

### Journey 2: "What else is in this family?" — Exploring siblings

> **Persona:** Player studying the Najdorf who wants to compare alternative 6th
> moves

1. On the **Najdorf 6.Bg5** detail page, the variations tree shows siblings:
   6.Be3, 6.Be2, 6.f3, English Attack
2. They click **6.Be3** → navigate to that detail page, breadcrumb updates
3. They compare plans/stats between the two lines
4. They click **"Najdorf Variation"** in the breadcrumb → go up one level to see
   all Najdorf sub-lines together

**UX goal:** Fluid lateral navigation between siblings at the same depth, and
easy "zoom out" to the parent level.

### Journey 3: "Show me the big picture" — Family overview browsing

> **Persona:** Improving player who plays 1.e4 and wants to understand the
> Sicilian landscape before choosing what to study

1. They arrive at the **Family Overview page** for the Sicilian (via breadcrumb
   click, search, or landing page link)
2. Page shows: family name, ECO range B20–B99, description, and a card grid of
   the top variations (Najdorf, Dragon, Scheveningen, Classical, etc.)
3. Each card shows: name, ECO code, complexity, game count, brief description
4. They compare at a glance — Najdorf is "Advanced" with 50k games, Dragon is
   "Intermediate" with 30k games
5. They click the Dragon card → land on the Dragon detail page with full info

**UX goal:** A hub page that lets users compare variations within a family and
make an informed choice about what to study.

### Journey 4: "I want to browse all families" — Discovery from landing page

> **Persona:** Beginner who wants to explore what opening families exist

1. On the landing page, they see an "Opening Families" section (or nav link)
   that lists all ~20 families as compact cards
2. Each card shows: family name, ECO range, brief tagline, number of variations
3. They click **"King's Indian Defense"** → land on the KID Family Overview page
4. From there they drill into specific variations

**UX goal:** Discoverability. Users who don't know what they're looking for can
browse the full family catalogue.

**Open question:** How prominent should families be on the landing page? Options:

- **(a)** New section below popular openings grid ("Browse by Family")
- **(b)** Replace the ECO category buttons (A/B/C/D/E) with family cards
- **(c)** Add a top-nav link to a separate `/families` index page
- **(d)** All of the above — section on landing + nav link

### Journey 5: "I found an opening — which family is it?" — Reverse lookup

> **Persona:** Player who searched for "Berlin Defense" and wants to understand
> the broader context

1. They land on the Berlin Defense detail page
2. Breadcrumb reads: `Ruy Lopez › Berlin Defense` (only 2 levels — Berlin has no
   sub-lines in our data)
3. They click **"Ruy Lopez"** → Family Overview for the Ruy Lopez
4. They see the Berlin alongside the Marshall, Morphy, Exchange, and Closed
   variations

**UX goal:** Every opening page is a doorway into its family. The breadcrumb
always provides an "up" path.

### Journey 6: "What should I play as Black against 1.d4?" — Cross-family comparison

> **Persona:** Player building a repertoire who needs to choose between the
> King's Indian, Nimzo-Indian, and Queen's Gambit Declined

1. They browse the `/families` index or landing page family section
2. They see cards for KID, Nimzo, QGD side by side
3. They click into each family overview to compare complexity, game counts, and
   style descriptions
4. They choose the Nimzo, click into a specific variation, and star it for their
   repertoire

**UX goal:** Families as a decision-making tool. Users can compare families at
the same level before committing to study.

**Note:** This journey works well with the existing repertoire (star) feature —
once they find a variation through family browsing, they star it.

---

## 3. UX Decisions Needed

Before building, the following need to be resolved:

### Decision 1: Landing page integration

How do families appear on the landing page?

| Option                          | Pros                               | Cons                                |
| ------------------------------- | ---------------------------------- | ----------------------------------- |
| New "Browse by Family" section  | Additive, no disruption            | Page gets longer                    |
| Replace ECO buttons with family | More meaningful grouping           | Loses ECO-based filtering           |
| Nav link to `/families` index   | Clean separation                   | Low discoverability                 |
| Section + nav link              | Maximum discoverability            | More surface area to build/maintain |

### Decision 2: Family overview page — what's the primary content?

The current spec says "card grid of top 6–8 variations + collapsible full tree
below." But should the family page also include:

- A chessboard showing the family's starting position?
- Aggregate stats (total games, average complexity)?
- A "recommended for beginners" callout?
- Videos/studies that cover the family broadly?

Keeping it simple (cards + tree) is faster to build and avoids scope creep.

### Decision 3: How to handle "shallow" families

Some families have very few variations in our data (e.g., Grünfeld might only
have 5 openings total). Should these still get a full family page, or be handled
differently?

### Decision 4: Breadcrumb for openings outside any defined family

Not every ECO code will be covered by the ~20 families in the config. What
happens for an orphan opening like "Polish Opening" (A00)?

- **(a)** Show no breadcrumb (just the opening name)
- **(b)** Show a generic breadcrumb using ECO letter: `Flank Openings (A) › Polish Opening`
- **(c)** Ensure every opening has a family by defining catch-all families

### Decision 5: Middle breadcrumb — what does it link to?

The spec says 3 levels: `Family › Variation › Line`. The middle level click
should go to:

- **(a)** The detail page for the parent opening (e.g., `/opening/<najdorf-fen>`)
- **(b)** A filtered family page showing only that sub-section

Option (a) is simpler and reuses existing pages. Option (b) adds another
bespoke view.

## 4. Design Decisions (Resolved)

| Decision                    | Choice                                       | Rationale                                                      |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Breadcrumb depth            | 3 levels max                                 | Covers 90% of cases; deeper positions show deepest 3 ancestors |
| Top-level click destination | New Family Overview page (`/family/:slug`)   | Hub experience, not just another detail page                   |
| Variations section          | Replace flat list with nested tree           | Makes hierarchy visible on the page itself                     |
| Hierarchy source            | Config-file-driven (`opening_families.json`) | Semantic names, curated groupings, ~20 families to define      |

## 5. Three UI Surfaces

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

## 6. Data Model

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

## 7. Key Files

| File                                                            | Status | Purpose                                              |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `config/opening_families.json`                                  | Create | Family definitions (ECO ranges, slugs, descriptions) |
| `packages/web/src/hooks/useOpeningHierarchy.ts`                 | Create | Derive breadcrumbs + tree from ECO data + config     |
| `packages/web/src/components/navigation/OpeningBreadcrumbs.tsx` | Create | Breadcrumb component for detail page header          |
| `packages/web/src/pages/FamilyOverviewPage.tsx`                 | Create | New family hub page                                  |
| `packages/web/src/components/detail/RelatedOpeningsTeaser.tsx`  | Modify | Replace flat list with nested tree                   |
| `packages/web/src/components/detail/RelatedOpeningsTab.tsx`     | Modify | Replace flat list with nested tree                   |
| `packages/api/src/routes/openings.routes.js`                    | Modify | Add `/api/openings/family/:slug` endpoint            |

## 8. Deferred / Out of Scope

- **Transposition awareness**: Same position via different move orders — which
  breadcrumb to show? Phase 2.
- **Visual tree diagram**: Graph/tree visualisation on the Family page. Phase 2
  polish.
- **Cross-family relationships**: Openings that belong to multiple families. Out
  of scope.

## 9. Verification

1. Navigate to any opening detail page → breadcrumb shows correct 3-level path
2. Click middle breadcrumb → lands on correct parent page with nested tree
3. Click top-level breadcrumb → lands on `/family/:slug` with card grid
4. Family page cards link through to correct detail pages
5. Variations section shows nested tree with parent + siblings, current page
   highlighted
6. `npm run test:frontend` — existing related openings tests still pass
7. `npm run build` — no TypeScript errors
