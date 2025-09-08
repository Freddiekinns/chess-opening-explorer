# Active Context

**Date:** 2025-09-08

## Current Focus: Related Openings UX Consolidation & Design System Alignment

Completed consolidation of the Related Openings experience from a dual (teaser + tab/modal) model to a single inline expandable teaser. Added JS-driven height animation for smoother expand/collapse with reduced-motion safeguard. Unified header hierarchy via new card header pattern (accent bar with softened gradient) and de-emphasized ECO pill (right alignment + tooltip accessibility).

## Recent Changes (2025-09-07 → 2025-09-08)
- Hybrid related openings UI implemented (TASK003) then consolidated (TASK002 final pass).
- Removed gradient fade & partial row artifact; standardized collapsed preview to 4 rows (including mainline row when present).
- Replaced CSS max-height transition approach with measured JS height animation (supports collapse symmetry, cleans up transition end, respects `prefers-reduced-motion`).
- Introduced unified `.card-header` pattern with softened vertical accent bar gradient (rgba(232,93,4,0.88) → 0.18).
- ECO pill moved to right side of header, visually de-emphasized (opacity) and given tooltip (`title` + `aria-label`).
- All 7 targeted related openings tests passing after each iteration.
- Memory bank updated: TASK002 & TASK003 completion logs, index adjustments, active context refresh, planned pattern additions.
 - Removed legacy `RelatedOpeningsTab` component & duplicate root Jest UI test; frontend tests now consolidated under `packages/web` (Vitest) per AD-011.

## Emerging Patterns / Decisions
- Prefer single-surface progressive disclosure over dual-surface (avoids cognitive split + maintenance overhead).
- JS measurement for height animations only on container wrapper; internal list static to prevent race conditions.
- Accent bar now stylistic token candidate (consider variable extraction: `--card-accent-start`, `--card-accent-end`).

## Next Potential Steps (Not Yet Scheduled)
1. Tokenize accent bar colors & width for theme agility.
2. Conditional accent suppression heuristic (dense vertical stacks).
3. Shared Tooltip component (encapsulate `title`/ARIA + potential richer content later).
4. Semantic heading outline audit across detail page (ensure proper h1 → h2 → h3 progression).
5. Optional staggered fade on newly revealed rows (respect reduced-motion).

## Current Status Summary
Related openings feature stable, accessible, visually consistent with emerging design system primitives. Test runner separation (Jest backend / Vitest frontend) enforced; no open bugs. Enhancements future-scoped.
