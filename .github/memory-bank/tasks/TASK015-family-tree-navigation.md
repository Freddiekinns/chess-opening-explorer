# [TASK015] - Opening Tree Navigation

**Status:** Pending **Added:** 2026-03-17 **Updated:** 2026-03-18

## 1. Problem

Related openings are shown as a **flat list** grouped by ECO code. You're on the
Najdorf page and see 30 siblings — but you can't see the _tree_. You can't
answer: "What are the branching options from this position?" or "What could I
have played instead two moves ago?"

Chess openings are a tree of move sequences. The UI should let you navigate that
tree — drill down into sub-variations, zoom out to see alternatives at an
earlier branch point.

## 2. How the data works today

- **12,377 openings** total, each with a `moves` string (e.g., `"1. e4 c5 2.
  Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6"`)
- **No explicit parent-child links** — hierarchy is implicit via move prefixes
- Related openings API groups by ECO code only (e.g., all B90 = 31 openings)
- "1. e4 c5" prefix → 1,722 openings (too many to list as "Sicilian")
- Najdorf prefix → 251 openings (still too many)
- B90 ECO code → 31 openings (manageable, but flat)

The tree structure exists in the data — it just needs to be surfaced as **branch
points**, not flat lists.

### Branching analysis (validated from data)

The branching factor is very manageable — never overwhelming at any single node:

| Position | Distinct next moves | Meaningful branches |
|---|---|---|
| After 1. e4 | 20 | ~6 (e5, c5, e6, c6, d5, Nf6) |
| After 1. e4 c5 (Sicilian) | 22 (**max in entire dataset**) | ~4 (Nf3, Nc3, c3, f4) |
| After 1. e4 e5 | 20 | ~4 (Nf3, f4, Nc3, Bc4) |
| After Najdorf (5...a6) | 11 | ~5 (Bg5, Be3, Be2, f4, g3) |
| After 1. d4 | 14 | ~4 (Nf6, d5, f5, c5) |

- **Max branching factor: 22** (at 1. e4 c5 — the Sicilian)
- **Leaf nodes: 5,875 / 12,377 (47.5%)** — nearly half of all openings have no
  children

This means the tree is always navigable — you never see more than ~22 branches
at once, and typically only 4–6 matter.

_Source: `tools/analysis/branching-analysis.js`_

## 3. Core concept: branch points

At any opening, there are two useful questions:

1. **"What branches forward from here?"** — The next named choice points
   - On Najdorf (5...a6): White can play 6.Bg5, 6.Be3, 6.Be2, 6.f3, 6.Bc4
   - Each of these is a named opening with its own detail page
2. **"What could I have played instead?"** — Alternatives at the previous branch
   - Instead of 5...a6 (Najdorf): 5...e6 (Scheveningen), 5...g6 (Dragon),
     5...Nc6 (Classical)
   - These are the _siblings_ — same parent position, different choice

This replaces the flat related-openings list with something that shows the
**tree structure** naturally.

## 4. User journeys

### Journey A: "What are my options from here?" (drill down)

> On the **Sicilian Defense** page (`1. e4 c5`)

1. At the bottom of the page, a full-width mind-map tree is centered on the
   current opening
2. To the right, forward branches are visible: `2. Nf3` → Open Sicilian /
   `2. c3` → Alapin / `2. Nc3` → Closed / `2. f4` → Grand Prix
3. User clicks the expand chevron on **Open Sicilian** → its children appear
   inline: `2...d6`, `2...Nc6`, `2...e6`
4. User can keep expanding nodes to explore the tree without leaving the page
5. When they find the opening they want, clicking the **name** navigates to that
   detail page
6. The new page re-centers the tree on the newly selected opening

### Journey B: "What could I have played instead?" (zoom out)

> On the **Najdorf Variation** page (`1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4
> Nf6 5. Nc3 a6`)

1. In the tree, the current opening is the center node
2. To the left, ancestor nodes are visible: `...4. Nxd4` → `...2. Nf3` →
   `Sicilian` → `1. e4`
3. Siblings of the current node are visible: 5...e6 (Scheveningen), 5...g6
   (Dragon), 5...Nc6 (Classical)
4. User can expand any ancestor to see its siblings — what alternatives existed
   at earlier branch points
5. Clicking **Dragon** navigates to that page, re-centering the tree

### Journey C: Free exploration (mind-map)

> User wants to understand the whole Sicilian landscape

1. Starting on any Sicilian opening, the tree shows ancestors and descendants
2. User expands nodes in both directions — ancestors to the left, descendants
   to the right — scrolling horizontally as the tree grows
3. The tree becomes a navigable map of the entire opening family
4. Each node is clickable → navigates to that detail page and re-centers

## 5. UX design: full-width mind-map tree

### Settled decisions

**Location:** Full-width section at the bottom of the detail page, below the
two-column layout. Replaces the current `RelatedOpeningsTeaser` component.

**Layout — mind-map style:**
- The **current opening is the center node**, visually highlighted
- **Ancestors extend to the left** (parent → grandparent → great-grandparent)
- **Descendants extend to the right** (children → grandchildren)
- **Siblings** are shown as vertical branches off the same parent node
- Connecting lines between nodes show the tree structure
- The tree is **horizontally scrollable** when it extends beyond the viewport

**Interaction model:**
- **Expand/collapse (chevron):** Toggle a node's children inline without
  navigating. Lets you peek deeper into the tree.
- **Click opening name:** Navigate to that opening's detail page. The tree
  re-centers on the new opening.
- **Horizontal scroll:** Drag or scroll to pan across the tree as it grows.
- **Initial state:** Show 1 level of ancestors (with siblings) + 1 level of
  descendants. User expands from there.

**Width:** Breaks out of the 1400px content max-width to use the full viewport.
This gives the tree room to breathe horizontally.

**Responsive behavior:**
- **Desktop (1024px+):** Full horizontal mind-map layout with scroll
- **Tablet (768px–1023px):** Same layout, may need more scrolling
- **Mobile (<768px):** Collapses to a vertical tree (indented list style, like
  a file explorer) since horizontal space is too constrained for a mind-map

### Node design (each node in the tree)

Each node shows:
- **Move** that reaches this position (e.g., "5...a6")
- **Opening name** (e.g., "Najdorf Variation") — clickable link
- **Descendant count** badge (e.g., "251 lines") — gives sense of depth
- **Expand/collapse chevron** if the node has children
- Current node gets a highlighted/active treatment (border, background)

### What about leaf nodes?

47.5% of openings are leaves (no children). For these:
- The "descendants" side of the tree is empty — no forward branches
- The tree still shows ancestors + siblings, so there's always something useful
- A subtle label like "End of line" on the right side

## 6. Technical approach

### API endpoint

`GET /api/openings/:slug/tree` → returns the tree context for the current
opening:

```json
{
  "current": { "slug": "najdorf-variation", "name": "Najdorf Variation", "move": "5...a6" },
  "ancestors": [
    {
      "slug": "sicilian-defense",
      "name": "Sicilian Defense",
      "move": "1...c5",
      "siblings": [
        { "slug": "french-defense", "name": "French Defense", "move": "1...e6", "descendantCount": 544 },
        { "slug": "caro-kann-defense", "name": "Caro-Kann Defense", "move": "1...c6", "descendantCount": 362 }
      ]
    }
  ],
  "children": [
    { "slug": "najdorf-bg5", "name": "Najdorf, 6.Bg5", "move": "6.Bg5", "descendantCount": 156, "hasChildren": true },
    { "slug": "najdorf-be3", "name": "Najdorf, 6.Be3", "move": "6.Be3", "descendantCount": 24, "hasChildren": true }
  ],
  "siblings": [
    { "slug": "scheveningen-variation", "name": "Scheveningen", "move": "5...e6", "descendantCount": 89 },
    { "slug": "dragon-variation", "name": "Dragon", "move": "5...g6", "descendantCount": 72 }
  ]
}
```

**Lazy loading for expansion:** When user expands a node, fetch its children via
`GET /api/openings/:slug/tree/children` — lightweight endpoint returning just
the immediate children of that node.

### Deriving the tree from move data

```
Given opening O with moves "1. e4 c5 2. Nf3 d6":

Forward branches (children):
  1. Find all openings whose moves START WITH O's moves
  2. Group by the next move token after O's moves
  3. For each group, pick the "root" opening (shortest moves, or isEcoRoot)
  → Returns: [{ move: "3. d4", opening: "Open Sicilian", childCount: 826 }, ...]

Parent + siblings:
  1. Strip the last move from O's moves → parent moves = "1. e4 c5 2. Nf3"
  2. Find the opening matching parent moves exactly (or closest)
  3. Find all openings sharing parent moves that diverge at the same point
  → Returns: { parent: {...}, siblings: [{ move: "2...Nc6", opening: "..." }, ...] }

Ancestors (recursive):
  Repeat parent lookup, walking up the tree until reaching a root (1. e4 / 1. d4 / etc.)
```

This is pure move-string manipulation — no new data sources needed.

### Key files

| File | Action | Purpose |
|---|---|---|
| `packages/api/src/routes/openings.routes.js` | Modify | Add `/tree` and `/tree/children` endpoints |
| `packages/api/src/services/tree-service.js` | Create | Tree derivation logic |
| `packages/web/src/components/detail/OpeningTreeMap.tsx` | Create | Mind-map tree component |
| `packages/web/src/components/detail/OpeningTreeMap.module.css` | Create | Tree styles (CSS Modules) |
| `packages/web/src/components/detail/OpeningTreeMobile.tsx` | Create | Vertical tree for mobile |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Modify | Add tree section, remove RelatedOpeningsTeaser |

## 7. Open questions

### Family overview pages — curated or dynamic?

The tree on the detail page is always dynamic (generated from the current
opening's position). But for a "Browse Sicilian family" entry point:

- **(a) Curated config** (`opening_families.json` with ~20 families) — clean
  entry points, guaranteed good UX, but needs manual maintenance
- **(b) Fully dynamic** — any opening can be a "family root"
- **(c) Hybrid** — curated families for entry points + dynamic tree within each

**Deferred.** Build the detail-page tree first. Family landing pages are a
follow-up.

### Landing page — should families be browsable from home?

**Deferred.** Build the detail-page tree first. A "Browse by Family" section on
the landing page is a natural follow-up once families are defined.

### Breadcrumbs

The tree already shows the full ancestor chain visually. A separate breadcrumb
above the title may be redundant. **Revisit after building the tree** — if users
still need extra orientation, add minimal breadcrumbs then.

## 8. Out of scope (for now)

- **Transposition awareness** — same position via different move orders
- **Family overview pages** — `/family/:slug` with curated entry points
- **Landing page family browsing** — "Browse by Family" section
- **Keyboard navigation** — arrow keys to traverse the tree
- **Minimap** — overview indicator for very deep trees
