# Active Context

**Date:** 2025-01-30

## Current Focus: PGN Opening Identification Feature

Implemented ability for users to paste PGN text and identify the matching chess opening, navigating directly to its detail page.

## Recent Changes (2025-01-30)
- **PGN Opening Identification** - Full implementation:
  - Modal entry point via "Or search by PGN" link below search bar on landing page
  - Client-side PGN parsing using chess.js (strips headers, comments, variations)
  - FEN generation after each move for opening lookup
  - Deepest match algorithm - finds last known opening position
  - Distinguishes exact matches vs partial matches (game extends beyond known openings)
  - Error handling for invalid PGN moves
  - Full accessibility: focus trap, Escape to close, ARIA attributes
  - 36 unit tests for PGN utilities, 28 integration tests for modal
- **New files:** `pgn-utils.ts`, `PGNInputModal.tsx`, test files
- **Modified:** `LandingPage.tsx`, `simplified.css`, `utils/index.ts`

## Previous Changes (2025-01-29)
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
