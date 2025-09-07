# TASK003 - Related Openings Hybrid Teaser Refinement

**Status:** In Progress  
**Added:** 2025-09-07  
**Updated:** 2025-09-07  

## Original Request
Refine the hybrid related openings UI (teaser + tab) to align with design system, improve navigation (SPA), accessibility, hierarchy, and clarity while keeping decisions: no win rates, no compare view, fixed sorting by games analyzed.

## Thought Process
The teaser currently provides discovery but visually underperforms versus design system components. Navigation relies on window.location causing full reload. We will incrementally refactor to use router navigation, add clearer hierarchy, semantics, and prepare for future analytics without overengineering.

## Implementation Plan
- Phase 1 (This task scope):
  1. Replace window.location in teaser & tab with react-router navigate.
  2. Restructure teaser markup: heading group, optional mainline item, top 3 variations list, CTA button.
  3. Add aria roles: region + aria-labelledby, list semantics simplified to ul/li.
  4. Add subtle descriptor text: "Top variations (sorted by games analyzed)".
  5. Introduce BEM-ish class names consistent with design system (e.g., related-teaser__list, related-teaser__item).
  6. Add focus styles via existing global focus ring (class hook if needed).
  7. Update tests to assert navigate is called with /opening/:fen.
  8. Maintain existing logic (no sorting changes, capped at 3 siblings, mainline conditional).

- Out of Scope (future phases): analytics events, move snippets, two-column layout inside tab, expand animation, persisted tab selection.

## Progress Tracking
**Overall Status:** In Progress - 10%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Create task file | Complete | 2025-09-07 | |
| 1.2 | Refactor teaser navigation | Not Started | 2025-09-07 | |
| 1.3 | Refactor tab navigation | Not Started | 2025-09-07 | |
| 1.4 | Teaser semantic/markup improvements | Not Started | 2025-09-07 | |
| 1.5 | Add descriptor text & classes | Not Started | 2025-09-07 | |
| 1.6 | Update tests for navigation | Not Started | 2025-09-07 | |
| 1.7 | Run & fix tests | Not Started | 2025-09-07 | |
| 1.8 | Update TASK002 + this task logs | Not Started | 2025-09-07 | |

## Progress Log
### 2025-09-07
- Task initialized with scope & constraints.

## Release Summary (Pending)
*To be filled on completion.*
