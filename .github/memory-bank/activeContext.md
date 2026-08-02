# Active Context

**Date:** 2026-08-02

## Current Task: Analyse summary cards read as one row (`claude/player-details-layout-qxa1mo`)

**Phase 5's decision §3 reversed** — "the record card keeps its existing layout,
`.statsRows` is already the mock's structure, restyling would be churn". The
structure was never the complaint. The card sat in an equal-height grid with its
figures clustered at the top-left and roughly 40% of it empty, and it was the
only card in the row with no bar, so the row had no bottom edge at all.

- **Composition, not decoration.** Figures bottom-anchored (`margin-top: auto`)
  in three full-width columns, win left / draw centre / loss right — the bar's
  own geometry, and PerfBar's legend arrangement. Left-aligned columns stopped
  at two-thirds of a card whose bar spanned all of it.
- **The tints are load-bearing.** Equal-width columns cannot line up with
  proportional segments, so colour is the only thing tying a count to its band.
  Draws move off primary cream — as the brightest number they pulled the eye
  first, and they are the least interesting of the three.
- **Four disagreements between rules drawn in different places**, which is what
  "the fonts are all off" was pointing at: bar height 6px vs 8px, headline 22px
  vs 20px, tracked-uppercase "WINS" one card-width from sentence-case "win
  rate", and a 3px sage border on the mobile Wins tile alone.
- **Left alone on the owner's call**: the two opening cards keep their
  single-fill rate bars, and mobile keeps three stat tiles rather than adopting
  the desktop record card. Neither was bad; matching is not a reason.
- Guards assert the _agreements_ (bar heights across two files, bottom anchor,
  one label treatment) — verified failing on the old values, not just green.

## Previous Task: Practice drops to accent-outline (`ux/phase-5-analyse`)

Filled orange → orange border + orange label, both breakpoints. A spec decision
reversed on the owner's call: §3 argued from implementation completeness, which
is a different question from how much of the page's attention a feature has
earned. Named the third button tier (primary · accent-outline · secondary ·
tertiary); fixed proportion (desktop 11px inside 24px padding vs mobile 13px →
both 13px, mobile min-height 44px). Guard rewritten to assert the two halves
agree rather than to pin the fill. Spec §3.4.
