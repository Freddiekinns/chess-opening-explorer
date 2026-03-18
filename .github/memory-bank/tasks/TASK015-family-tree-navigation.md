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

1. Below the detail content, a vertical tree shows the current opening
   highlighted, with its children listed below it (indented one level)
2. Children visible: `2. Nf3` Open Sicilian / `2. c3` Alapin / `2. Nc3` Closed
   / `2. f4` Grand Prix — each on its own row
3. User presses **↓** to move focus through the children, or clicks the expand
   chevron on **Open Sicilian** → its children appear indented below: `2...d6`,
   `2...Nc6`, `2...e6`
4. User keeps expanding deeper nodes — the tree grows downward, all within
   natural vertical scroll
5. Clicking an **opening name** (or pressing Enter on a focused node) navigates
   to that detail page; the tree re-renders centered on the new opening

### Journey B: "What could I have played instead?" (zoom out)

> On the **Najdorf Variation** page (`1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4
> Nf6 5. Nc3 a6`)

1. Above the current opening in the tree, ancestors are visible as a vertical
   path: `1. e4` → `1...c5 Sicilian` → `2. Nf3` → … → `5. Nc3`
2. The current node (5...a6 Najdorf) is highlighted. Its **siblings** are listed
   at the same indent level: 5...e6 Scheveningen, 5...g6 Dragon, 5...Nc6
   Classical — directly above or below the current node
3. User presses **↑/↓** to move between siblings — this directly answers "what
   could I have played instead?" without any expand/collapse
4. User can expand any ancestor to reveal _its_ siblings — alternatives at
   earlier branch points (e.g., expand `1...c5` to see `1...e5`, `1...e6`)
5. Clicking **Dragon** navigates to that page; the tree re-renders with Dragon
   as the highlighted node

### Journey C: Exploring the tree (keyboard-driven)

> User wants to understand the whole Sicilian landscape

1. Starting on any Sicilian opening, the tree shows the ancestor path above and
   children below
2. **↑/↓** moves between visible sibling nodes at the same level
3. **→** expands the focused node (or moves into its first child if already
   expanded)
4. **←** collapses the focused node (or moves to its parent if already
   collapsed)
5. This matches the OS file-explorer keyboard model — instantly familiar
6. Each node is clickable / Enter-navigable → loads that opening's detail page

## 5. UX design: vertical indented tree

### Why vertical, not horizontal mind-map

UX research (NNG eye-tracking, Fu et al. 2013, Figma's own testing) strongly
favors vertical indented trees over horizontal node-link diagrams for
navigation:

- **Scanning:** Vertical lists require fewer eye fixations — users read
  downward naturally. Labels get full row width instead of cramped node boxes.
- **Familiarity:** Every OS file explorer, every doc sidebar, every IDE uses
  vertical indented trees. Zero learning curve.
- **Screen space:** Vertical trees scroll in one direction. Horizontal trees
  consume both axes and require pan/zoom — Figma's team found users "lost all
  context of parent items" when deeply nested horizontal trees scrolled.
- **Mobile:** Vertical trees translate directly to mobile. Horizontal trees
  need pinch-zoom and have tiny tap targets.
- **Up/down navigation:** Siblings sit directly above/below each other —
  answering "what could I have played instead?" is a single glance or arrow
  press. In a horizontal layout, siblings stack vertically off a parent node to
  the left, making them harder to compare with the current node.
- **Keyboard model:** ↑/↓ for siblings, →/← for expand/collapse matches the
  universal file-explorer convention. Horizontal trees invert this mapping,
  creating friction.

Chess-specific validation: Lichess uses a vertical indented tree at
`lichess.org/opening/tree`. Every major chess site (Lichess, Chess.com,
365Chess) uses drill-down tables — vertical layouts dominate the domain.

### Settled decisions

**Location:** Replaces the current `RelatedOpeningsTeaser` component. On
desktop, renders in the left column below the chessboard (same position as
today's related openings). On mobile, renders at the bottom of the page.

**Layout — vertical indented tree (file-explorer style):**
- **Ancestors** form a vertical path at the top, each indented one level deeper
- The **current opening** is highlighted (distinct background + left border)
- **Siblings** of the current opening sit at the same indent level — directly
  above/below it
- **Children** appear indented below the current opening
- Indentation guides (subtle vertical lines) connect parent to children
- The tree scrolls vertically within the page — no horizontal scroll needed

**Interaction model:**
- **Expand/collapse (chevron or → / ←):** Toggle a node's children inline.
  Chevron rotates 90° when expanded.
- **↑ / ↓ arrow keys:** Move focus between visible nodes. This naturally moves
  between siblings at the same level, answering "what else could I play here?"
- **→ arrow key:** Expand focused node, or move to first child if already
  expanded.
- **← arrow key:** Collapse focused node, or move to parent if already
  collapsed.
- **Enter or click opening name:** Navigate to that opening's detail page.
- This is the standard `treeview` ARIA pattern — documented in WAI-ARIA
  Authoring Practices and used by VS Code, GitHub, macOS Finder.

**Initial state:** Ancestors shown collapsed (just the path to root) + current
node highlighted + 1 level of children expanded + siblings of current node
visible. User expands from there.

**Responsive behavior:**
- **All breakpoints:** Same vertical tree layout. No breakpoint-specific
  component swap needed — vertical trees are naturally responsive.
- **Desktop (1024px+):** Tree in left column below the board
- **Mobile (<768px):** Tree at page bottom (same component, different placement)

### Node design (each row in the tree)

Each row shows:
- **Indent guides** — vertical lines showing tree depth
- **Expand/collapse chevron** (if node has children) — rotates when expanded
- **Move** that reaches this position (e.g., "5...a6") — subtle/secondary text
- **Opening name** (e.g., "Najdorf Variation") — primary text, clickable link
- **Descendant count** badge (e.g., "251 lines") — right-aligned, gives sense
  of depth below this node
- **Current node** gets highlighted treatment (background color + left accent
  border)
- **Focused node** (keyboard) gets a focus ring

Row height: compact (32–36px) so many nodes are visible without scrolling.
At max branching (22 siblings), that's ~750px — fits on screen without the tree
feeling overwhelming.

### What about leaf nodes?

47.5% of openings are leaves (no children). For these:
- No expand chevron shown — the row is just a name + move
- Ancestors + siblings are still visible above, so the tree is always useful
- No special "end of line" label needed — absence of chevron is sufficient

## 6. Technical approach

### API endpoint

`GET /api/openings/:slug/tree` → returns the tree context for the current
opening:

```json
{
  "current": { "slug": "najdorf-variation", "name": "Najdorf Variation", "move": "5...a6" },
  "ancestors": [
    {
      "slug": "kings-pawn-opening",
      "name": "King's Pawn Opening",
      "move": "1. e4",
      "siblings": []
    },
    {
      "slug": "sicilian-defense",
      "name": "Sicilian Defense",
      "move": "1...c5",
      "siblings": [
        { "slug": "french-defense", "name": "French Defense", "move": "1...e6", "descendantCount": 544 },
        { "slug": "caro-kann-defense", "name": "Caro-Kann Defense", "move": "1...c6", "descendantCount": 362 }
      ]
    },
    {
      "slug": "sicilian-open",
      "name": "Open Sicilian",
      "move": "2. Nf3",
      "siblings": [
        { "slug": "sicilian-alapin", "name": "Alapin Variation", "move": "2. c3", "descendantCount": 72 },
        { "slug": "sicilian-closed", "name": "Closed Sicilian", "move": "2. Nc3", "descendantCount": 91 }
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

- `ancestors`: Full chain from root to parent, ordered root-first. Each
  ancestor includes its own siblings (alternatives at that branch point).
- `siblings`: Alternatives to the current opening at the same branch point.
- `children`: Forward branches from the current opening.

**Lazy loading for expansion:** When user expands a node, fetch its children via
`GET /api/openings/:slug/tree/children` — lightweight endpoint returning just
the immediate children of that node.

### Performance

The tree derivation does prefix-matching across 12,377 openings. Two options:

- **On-the-fly:** Scan all openings per request. At 12k string comparisons this
  is fast enough (<50ms) for a server-side endpoint with the data in memory.
- **Pre-built index:** Build a trie or parent-child map at startup. Faster
  lookups but more memory. Worth it if response times become a concern.

Start with on-the-fly. Optimize to pre-built index if needed.

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
| `packages/web/src/components/detail/OpeningTree.tsx` | Create | Vertical indented tree component (all breakpoints) |
| `packages/web/src/components/detail/OpeningTree.module.css` | Create | Tree styles (CSS Modules) — indent guides, node rows, focus/active states |
| `packages/web/src/pages/OpeningDetailPage.tsx` | Modify | Replace RelatedOpeningsTeaser with OpeningTree |

## 7. Definition of done (v1)

- [ ] `/api/openings/:slug/tree` endpoint returns ancestors, children, siblings
- [ ] `/api/openings/:slug/tree/children` endpoint for lazy expansion
- [ ] Vertical indented tree component renders on all breakpoints (single component)
- [ ] Current opening highlighted (background + left accent border)
- [ ] Expand/collapse chevrons work — chevron rotates on expand
- [ ] Indent guides (vertical lines) connect parents to children
- [ ] Keyboard navigation: ↑/↓ between visible nodes, →/← expand/collapse, Enter to navigate
- [ ] `role="tree"` / `role="treeitem"` ARIA pattern with correct `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`
- [ ] Clicking an opening name navigates to its detail page
- [ ] Tree replaces `RelatedOpeningsTeaser` on the detail page (same positions: left column on desktop, bottom on mobile)
- [ ] Leaf nodes: no chevron, ancestors + siblings still shown
- [ ] Backend tests for tree-service
- [ ] Frontend tests for tree component (render, keyboard nav, expand/collapse)
- [ ] Cache-Control header set in vercel.json for tree endpoints

## 8. Follow-ups (build after v1 tree ships)

### 8a. Family overview pages (keep)

Curated entry points for ~20 major families (Sicilian, Ruy Lopez, KID, etc.)
using the hybrid approach: a config file (`opening_families.json`) defines
family roots, the tree component renders dynamically within each family's scope.
Low effort since the tree component and API already exist — just needs a config
file and a `/family/:slug` route.

### 8b. Landing page "Browse by Family" (keep)

Add ~20 family cards to the landing page as a third discovery path alongside
search and popular openings. Suits exploratory users who want to browse rather
than search. Build after family overview pages exist.

### 8c. Breadcrumb trail (keep — fast follow)

Horizontal breadcrumb above the page title showing the ancestor path:
`1. e4 › Sicilian › Open Sicilian › Najdorf`. Provides orientation without
scrolling to the tree. Low effort — data already available from the tree API's
`ancestors` array. Research (NNG, Smashing Magazine) recommends breadcrumbs
alongside vertical trees for deep hierarchies to solve the "where am I?"
problem.

### 8d. Transposition awareness (keep — defer to v2)

Same position reached via different move orders (e.g., 1. d4 Nf6 2. c4 g6 vs
1. c4 g6 2. d4 Nf6). Affects ~5-10% of openings. Would make the tree more
accurate but turns simple prefix-matching into FEN-based lookup — meaningful
complexity jump. Not needed for v1 but real value for correctness.

## 9. Binned (not building)

- **Horizontal mind-map tree** — Research (NNG eye-tracking, Fu et al. 2013,
  Figma engineering blog) shows vertical indented trees outperform horizontal
  node-link diagrams on scannability, familiarity, screen space efficiency, and
  mobile friendliness. Horizontal layout also inverts the natural ↑/↓ = siblings
  keyboard mapping. The only advantage (seeing the "shape" of the tree at a
  glance) doesn't justify the trade-offs for a navigation-focused UI.
- **Minimap** — Over-engineered for the data. Max depth is ~10-12 moves, max
  branching is 22. This isn't a massive graph that needs an overview indicator.
  Vertical scroll is sufficient.
