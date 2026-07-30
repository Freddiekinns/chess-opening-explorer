# Active Context

**Date:** 2026-07-30

## Current Task: Practice drops to accent-outline (`ux/phase-5-analyse`)

Filled orange → orange border + orange label, both breakpoints. **A spec
decision reversed on the owner's call.** §3 argued from implementation
completeness — "fully implemented, so it can carry primary weight" — which is a
different question from how much of the page's attention a feature has earned.
Practice is a good action that is not yet what the detail page is _for_.

- **Names the third button tier.** The bundle documented two (filled primary,
  grey `.btn--secondary`) while `buttonSpec.test.ts` called an orange outline
  "secondary" — never true of `.btn--secondary`. Now: primary · accent-outline ·
  secondary · tertiary, in `components-buttons`.
- **Proportion fixed with it** — the other half of the complaint. Desktop was
  11px inside 24px padding (a swatch with a word in it) while mobile said 13px
  for the same control. Both 13px now, padding brought in, mobile min-height
  44px because it is a thumb target.
- **Guard rewritten, not deleted.** Its durable purpose was never "keep Practice
  filled": the button is drawn twice in two files and has drifted across
  breakpoints twice — once on fill, once on type size. It now asserts the halves
  _agree_, plus pagination carries no brand colour. Verified failing on the old
  CSS. Spec §3.4.

## Previous Task: One search row for all three surfaces

Typing changed how an opening was **drawn**, not just which were listed — three
result-row implementations and two hub rows across two type scales.
`shared/SearchRow.tsx` now serves every surface and both states. Fell out of it:
the hero hub panel had _zero_ padding ("Recent" read as clipped); the top-bar
dropdown was pinned to its 240px field, which is why Surprise me dropped its
visible hint there; the results list showed under four of twenty. Leading icons
dropped entirely — they put the name at 39px before typing and 13px after, and
only repeated the section heading. Surprise me keeps an orange label (an action
among destinations, the rule `.cancelBtn`/`.back-link` already follow) but no
icon: Sparkles reads as AI, shuffle/dice as a mode or a gamble, a gift or
mystery box as a reward. Mobile's hero now hands off to the full-screen overlay
instead of running a second search model on one screen. Spec §3.3; parity guard
at `shared/__tests__/search-row-parity.test.tsx`.
