# Active Context

**Date:** 2025-01-29

## Current Focus: Interactive Move Trainer (Practice Mode) MVP

Implemented Practice Mode on the opening detail page - an interactive trainer where users can play opening moves, receive feedback, and build muscle memory through guided repetition.

## Recent Changes (2025-01-29)
- **Practice Mode MVP** - Full implementation of interactive move trainer:
  - Toggle between explore and practice modes via "Practice" button
  - Color selection (White default, can switch to Black with board flip)
  - Move validation using chess.js - only correct moves accepted
  - Auto-play opponent responses after 400ms delay
  - Hint system - manual button or auto-show after 2 failed attempts (amber highlight)
  - Completion state with "Complete!" message
  - Audio feedback (move sounds, success chime) with WebAudio API + fallback tones
  - 12 unit/integration tests covering all functionality
- **New files:** `useAudio.ts` hook, `practice-mode.test.tsx`, CSS styles
- **Modified:** `OpeningDetailPage.tsx`, `simplified.css`, test setup

## Previous Changes (2025-09-07 → 2025-09-08)
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
