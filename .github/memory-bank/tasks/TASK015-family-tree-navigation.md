# [TASK015] - Hierarchical Family Tree Navigation (Opening Breadcrumbs)

**Status:** Pending  
**Added:** 2026-03-17  
**Updated:** 2026-03-17

## 1. Problem Statement
Currently, related openings are shown in a flat list. Users often don't understand the "lineage" or "Family" of a specific variation (e.g., how the "English Attack" relates to the "Najdorf" and the "Sicilian Defense").

## 2. Proposed Solution (PRD)
Create a structured hierarchy to navigate the opening "Family Tree."

### User Journey (Path to Variation)
1. **Entry**: User lands on a "Modern Variation" (B06).
2. **Contextualize**: User looks at the breadcrumbs at the top of the page.
3. **Trace back**: Breadcrumbs read `King's Pawn Opening > Pirc Defense > Modern Variation`.
4. **Learn parent**: User clicks "Pirc Defense" to see the "Major Alternatives" for each side in the root variation.
5. **Zoom out**: User clicks "King's Pawn Opening (1.e4)" to see how the Pirc compares to the Sicilian or Ruy Lopez.
6. **Navigate variations**: User scrolls to "Explore Families" and sees a visual card-based overview of the "Top 5 Sicilians" or "Top 3 French Defenses."

### Features
- **Opening Breadcrumbs**: A navigation path (e.g., `Sicilian Defense` > `Open Sicilian` > `Najdorf Variation`).
- **Family Overview Page**: A specialized page for "Families" (e.g., all `B20-B99` ECO codes) showing the main variations as a tree.
- **Transposition Awareness**: If a different move order leads to the same position, the breadcrumbs should reflect the "current" theoretical path.
- **Sub-variation List**: Replace the "Variations" list with a nested tree structure for better visual clarity.

### Feasibility: High
- The ECO codes are already structured (e.g., `B50` is a child of `B20`).
- No new external data needed; just a redesign of how existing data is linked.
- **Risk**: Hardcoding family groups (e.g., `Sicilian = B20-B99`) can be brittle; need a configuration file for families.

### Desirability: Must Have
- **Reassessment**: This is fundamentally desirable for "increased understanding." Opening theory isn't a flat list of names; it's a hierarchy. This UI makes that hierarchy explicit.

### MoSCoW: Must Have
- Addresses the core goal of "developing increased understanding" of how openings work.

## 3. Implementation Plan
1. Create `config/opening_families.json` to map ECO ranges to family names.
2. Build `useOpeningHierarchy` hook to determine parent/child relationships.
3. Replace the `OpeningHeader` subtitle with interactive `OpeningBreadcrumbs`.
4. Create the `FamilyOverview` component for the "Mainline" ECO roots.

## 4. Key Files
- `config/opening_families.json`
- `packages/web/src/hooks/useOpeningHierarchy.ts`
- `packages/web/src/components/navigation/OpeningBreadcrumbs.tsx`
- `packages/web/src/pages/FamilyOverviewPage.tsx`
