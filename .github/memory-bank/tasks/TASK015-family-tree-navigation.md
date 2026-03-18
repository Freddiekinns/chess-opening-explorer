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

1. Below the opening info, a "Variations" section shows the major branches:
   - `2. Nf3` → Open Sicilian (826 sub-variations)
   - `2. c3` → Alapin Variation (45 sub-variations)
   - `2. Nc3` → Closed Sicilian (38 sub-variations)
   - `2. f4` → Grand Prix Attack (12 sub-variations)
2. User clicks **Open Sicilian** → lands on that page
3. Now sees the next branch point: `2...d6`, `2...Nc6`, `2...e6`, etc.
4. Keeps drilling down until they reach a specific line

**How it works:** Find all openings whose moves start with the current opening's
moves, group by the _next move_ that differs, show the named opening for each
branch.

### Journey B: "What could I have played instead?" (zoom out)

> On the **Najdorf Variation** page (`1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4
> Nf6 5. Nc3 a6`)

1. A "Parent / alternatives" section shows:
   - **Parent:** `Open Sicilian, 4...Nf6` (link up)
   - **Instead of 5...a6:**
     - 5...e6 → Scheveningen Variation
     - 5...g6 → Dragon Variation
     - 5...Nc6 → Classical Variation
     - 5...e5 → Sveshnikov / Löwenthal
2. User clicks **Dragon** → explores that branch instead
3. Can keep clicking "parent" to zoom out further

**How it works:** Strip the last move from the current opening's move sequence,
find the parent opening at that position, then find all openings that share the
parent's moves but diverge at the same point as the current opening.

### Journey C: "Show me the full picture" (family overview)

> User wants to understand the whole Sicilian landscape

1. On any Sicilian opening, a breadcrumb or link says "Sicilian Defense family"
2. The family page shows a compact tree view:
   ```
   Sicilian Defense (1. e4 c5)
   ├── Open Sicilian (2. Nf3)
   │   ├── Najdorf (5...a6)
   │   ├── Dragon (5...g6)
   │   ├── Scheveningen (5...e6)
   │   └── Classical (5...Nc6)
   ├── Alapin (2. c3)
   ├── Closed Sicilian (2. Nc3)
   └── Grand Prix Attack (2. f4)
   ```
3. Each node is clickable → goes to the detail page
4. Tree is collapsed to 2–3 levels by default, expandable

**Open question:** Does this need a dedicated `/family/:slug` page with curated
family definitions, or can it be generated dynamically from any opening? A
dynamic approach ("show me the tree from this opening") avoids maintaining a
config file but may produce weird results at very high levels (1. e4 has
thousands of descendants).

**Pragmatic answer:** Pre-defined families (~20) for the top-level entry points
(Sicilian, Ruy Lopez, KID, etc.) with the tree generated dynamically from the
move data within that family's scope.

## 5. Decisions needed

### Decision 1: Where does the tree live on the detail page?

The current "Related Openings" section is a flat list. Options:

- **(a) Replace it** with the branching view (forward branches + parent/siblings)
- **(b) Add a new section** alongside it ("Variation Tree" + keep flat related)
- **(c) Tabbed** — "Tree" and "Related" as tabs within the same section

**(a)** is cleanest if the tree view is strictly better. But the flat ECO-grouped
list does surface some things the tree won't (e.g., openings with same ECO code
but very different move counts).

### Decision 2: How deep to show forward branches?

On the Sicilian page, should we show:

- **(a) One level** — just the immediate next moves (2. Nf3, 2. c3, 2. Nc3...)
- **(b) Two levels** — next moves + their children (2. Nf3 → 2...d6/2...Nc6/2...e6)
- **(c) Expandable** — one level by default, click to expand any node

**(c)** is most flexible but adds UI complexity.

### Decision 3: Family overview — curated or dynamic?

- **(a) Curated config** (`opening_families.json` with ~20 families) — clean
  entry points, guaranteed good UX, but needs manual maintenance
- **(b) Fully dynamic** — any opening can be a "family root," tree generated
  from move data. No config needed but top-level might be overwhelming.
- **(c) Hybrid** — curated families for entry points + dynamic tree within each

### Decision 4: Breadcrumbs — do we need them?

If the detail page already shows "parent" and "forward branches," do we also
need a breadcrumb trail? It adds orientation but might be redundant.

- **(a) Yes** — breadcrumb above the title for quick orientation
- **(b) No** — the parent link in the tree section is enough
- **(c) Minimal** — just show the family name as a link, not full breadcrumb

### Decision 5: Landing page — should families be browsable from home?

- **(a) Yes** — add a "Browse by Family" section with ~20 cards
- **(b) No** — families are discovered by drilling into openings
- **(c) Later** — build the detail-page tree first, family index is a follow-up

## 6. Technical approach (sketch)

### Deriving the tree from move data

```
Given opening O with moves "1. e4 c5 2. Nf3 d6":

Forward branches:
  1. Find all openings whose moves START WITH O's moves
  2. Group by the next move token after O's moves
  3. For each group, pick the "root" opening (shortest moves, or isEcoRoot)
  → Returns: [{ move: "3. d4", opening: "Open Sicilian", childCount: 826 }, ...]

Parent + siblings:
  1. Strip the last move from O's moves → parent moves = "1. e4 c5 2. Nf3"
  2. Find the opening matching parent moves exactly (or closest)
  3. Find all openings sharing parent moves that diverge at the same point
  → Returns: { parent: {...}, siblings: [{ move: "2...Nc6", opening: "..." }, ...] }
```

This is pure move-string manipulation — no new data sources needed.

### API endpoint

`GET /api/openings/fen/:fen/tree` → returns `{ forwardBranches, parent,
siblings }`.

### Key files

| File                                       | Action | Purpose                         |
| ------------------------------------------ | ------ | ------------------------------- |
| `packages/api/src/routes/openings.routes.js` | Modify | Add `/tree` endpoint            |
| `packages/api/src/services/tree-service.js`  | Create | Tree derivation logic           |
| `packages/web/src/components/detail/VariationTree.tsx` | Create | Tree UI component     |
| `packages/web/src/components/detail/RelatedOpeningsTeaser.tsx` | Modify or replace | Integrate tree view |

## 7. Out of scope (for now)

- **Transposition awareness** — same position via different move orders
- **Visual graph/diagram** — interactive tree visualization (d3, etc.)
- **Family overview pages** — build the detail-page tree first, family hubs
  later
- **Landing page family browsing** — follow-up after core tree works
