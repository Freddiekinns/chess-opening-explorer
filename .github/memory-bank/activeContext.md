# Active Context

**Date:** 2026-08-02

## Current Task: TopBar search field sized to its own panel (`claude/desktop-search-bar-width-ovwyg0`)

**The dropdown was 140px wider than the control that opened it.** The field was
a fixed 240px; the panel took `width: max-content` capped at 380px, anchored
right, so focusing the input flared a box out past the field's left edge.

- **The field gives, not the panel.** `width: clamp(300px, 30vw, 380px)`, and
  the panel is now `left: 0; right: 0` — flush both edges. Fluid because the bar
  is a `1fr auto 1fr` grid: a fixed 380px right column exceeds its fr share
  below ~1045px and drags the nav off centre. Measured at 901/950/1100/1280/1440
  — nav stays centred, no overflow.
- **300px floor is the Surprise me row.** Label plus hint needs ~265px of row;
  below that the hint would ellipsize, which is the thing the panel-sizing
  change bought in the first place.
- **Tablet (640–900px) keeps the old flare.** The 160px field there has no bar
  room to grow into, and 160px-wide rows are worse than a panel that overhangs.
  The grow-leftwards rule now lives only in that media query.

## Previous Task: The empty repertoire slot gets its box back (`ux/phase-5-analyse`)

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
