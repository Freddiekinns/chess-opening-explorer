# Active Context

**Date:** 2026-08-02

## Current Task: The empty repertoire slot gets its box back (`ux/phase-5-analyse`)

**A handoff divergence with no recorded reason.** The Proposed mock draws the
Discover empty state as a bordered one-line bar — `--surface-raised`,
`--color-border`, 8px radius, a 16px outline star — on both breakpoints. The
build shipped a bare sentence: no surface, no border, no star.

- **The recorded rationale doesn't cover it.** Change 03 justified _height_: a
  dashed panel with icon, title and hint pushed Popular openings below the fold.
  The mock's answer was ~180px → ~40px while keeping the container. "One-line
  prompt" got read as "one line of text" at plan step
  (`2026-07-27-ux-phase-1-discover.md:781` hands over the bare CSS with no
  note), and the design review's own audit of this element (finding 11) touched
  only the link — it left the box alone.
- **Why the box is right.** Empty and populated are the same slot: with no
  surface the first save doesn't fill a container, it conjures a section out of
  bare text. The star was the one word doing instructional work, tying the
  sentence to the glyphs in every card header below.
- **The test had frozen the drift.** "is a single line of guidance, not a panel"
  asserted more than anyone decided. Now: not a _titled empty-state_ panel — no
  "Nothing saved yet", no CTA — which is what change 03 actually bought.
- **Bundle lockstep.** `components-repertoire-row` drew the `/repertoire` tab's
  empty state but never the Discover prompt its own note referred to; both are
  drawn now, with why they're different shapes.

## Previous Task: Practice drops to accent-outline (`ux/phase-5-analyse`)

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
  filled": the button is drawn twice and has drifted across breakpoints twice —
  on fill, then on type size. It now asserts the halves _agree_. Spec §3.4.
