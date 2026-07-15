# Active Context

**Date:** 2026-07-15

## Current Task: Mobile landing filter UI fix (branch `claude/mobile-landing-filter-ui-mq5qjk`)

**Problem:** On the landing page's Popular openings grid, the six ECO
**category** filters rendered as a horizontal-scroll pill row at ≤767px. The
long labels (e.g. "Closed and Semi-Closed Games (D)") clipped illegibly at the
scroll-container edge ("Irregul…", "Semi-C…"). Design handoff: Claude Design
"Mobile filter button layout", option **1e (hybrid)**.

**Fix (mobile only, ≤767px — desktop wrapped pills unchanged):**

- **Level** filter stays a swipeable pill row; added a right-edge fade
  (`.filter-scroll::after`) hinting horizontal scroll. Label cased "All levels"
  to match the design.
- **Category** filter collapses into a new **`CategoryFilter`** component
  (`packages/web/src/components/filters/CategoryFilter.{tsx,module.css}`): a
  "Category" trigger (filter icon + label + chevron) opening a full-size
  dropdown menu (full labels, checkmark on active, backdrop + Escape to close).
  Trigger shows the **full** selected name (per Fred, not the mocked short "C ·
  Open"), truncating with an ellipsis only as an ultra-narrow (<330px) safety
  net.
- Desktop keeps the wrapped ECO pill row (`.category-filters--eco`, hidden on
  mobile); the dropdown is `display:none` above 767px.

**Files:** `CategoryFilter.{tsx,module.css}` (new) + test,
`ComplexityFilters.tsx` (scroll-fade wrapper + casing),
`PopularOpeningsGrid.tsx` (desktop pills + mobile dropdown), `simplified.css`
(`.filter-scroll`, `.category-filters--eco` hide, mobile fade). Design-system
lockstep: preview card
`design-system/project/preview/components-filters-mobile.html`. No token
changes.

**Verified:** 288 frontend tests green (incl. new CategoryFilter suite); ESLint
clean; Playwright at 390/320px — full name shows at 390px, graceful ellipsis at
320px, zero horizontal overflow; desktop unchanged.

## Previous Task: Slice 1 Evidence Engine + right-column redesign (PR #50/#51, merged)

`/api/explorer` proxy (Lichess auth-gated since 2026-03; zero-scope token, route
owns CDN Cache-Control, crawler UAs 403). `WinRatePanel` = one Stats card
(LevelLens pills → games/Elo → win bar → master games); `All` band default;
snapshot fallback relabelled as all-rated (not master) games. Both
squash-merged; production verified. Next: Slice 2 per PRD §6.
