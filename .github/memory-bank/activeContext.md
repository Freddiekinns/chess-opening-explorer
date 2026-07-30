# Active Context

**Date:** 2026-07-30

## Current Task: Master games moves up the mobile stack (`ux/phase-5-analyse`)

It was rendering **last** — after videos, studies and even the search pills. Not
a defect: the UX-review spec's decision table put it there, and phase 4 built it
faithfully. **A spec decision reversed, not a bug fixed.** Its stated reason —
"makes both breakpoints agree on block order" — was false: desktop renders
master games in the rail under the explorer card with resources full-width
below, so desktop always had this order, as did the bundle's preview card and
the 2a handoff. Spec updated in place (§3.2) so nobody restores the table's
decision.

- **Now: Overview · explorer surface · master games · plans · videos+studies ·
  search pills.** The first three are data about the position; everything after
  leads away from the page. Collapsed it costs one row, so plans barely moves;
  the reverse isn't true — a tall section in front strands a data row behind a
  screen of scrolling.
- **No component change** — it was already `variant="accordion"` (collapsed,
  counted, "Over-the-board masters"). Only the JSX position moved.
- **Order guard** at `pages/__tests__/mobile-stack-order.test.tsx`: asserts
  document order across all six blocks and that the disclosure stays collapsed.
  Verified to fail on the old order before landing.
- Accepted cost: the `IntersectionObserver` gate now trips after a swipe or two
  rather than a full scroll, so more masters requests — absorbed by the route's
  7-day CDN cache, and it 403s crawlers. No reserved height: plenty of deep
  positions have zero master games and a vanishing placeholder would shift
  content _upward_.

**Bundle:** notes added to `components-opening-detail-mobile.html` (the card
already drew the right order). **Verified:** 495 frontend, clean build.

## Previous Task: Search hub and results merged into one surface

Typing swapped the hub out wholesale, taking Surprise me and any sight of the
repertoire with it. Surprise me now survives as a footer outside the scroller,
reachable by arrowing one past the last result; "Saved" badges ride on matching
rows rather than a section that would draw a saved match twice. A count line was
built then cut — the search counts every record scoring above zero (4,269 for
"sicilian" vs a family of ~1,710). All three surfaces. **Detail in git.**
