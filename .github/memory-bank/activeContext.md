# Active Context

**Date:** 2026-08-02

## Current Task: The mobile filter sheet closes the way it looks like it does

The grabber was decoration. A 36×4 pill on a bottom sheet promises a drag and
nothing was behind it — so on a phone the exits from a sheet filling 88% of the
screen were a ~100px strip of backdrop, the footer button, and Escape, which a
phone does not have.

- **The gesture is real.** Pointer handlers on the grabber + title row: past 25%
  of the sheet (capped 120px) or a flick over 0.5px/ms dismisses, otherwise it
  springs back; the grabber is also a 44px button that closes on tap. Not on the
  scrolling body — deciding per touchmove between "scroll a pill row" and
  "close" steals either a filter tap or a scroll.
- **Twenty-nine families are now opt-in.** Expanded by default, every visit
  opened 2,000px deep for the one facet most visits never touch. Collapsed
  behind a row that states the applied family, the common case — 13 level /
  style / sort pills — fits one screen. Selecting collapses it again.
- **Left alone**: one sheet holding every facet; live apply; the footer's true
  count. The IA was right. Guards in `FilterSheet.test.tsx` — jsdom has no
  `PointerEvent`, so `fireEvent.pointerDown` drops `clientY`; the drag tests
  dispatch MouseEvents with a `pointerId` or they pass vacuously.

### Also on this branch: the Analyse summary-card row

Phase 5 §3 reversed (detail in `archive.md`), then one more pass answering
"should every card be the same height and layout?". They already are where it
reads — equal heights, label / headline / bar baselines. So the change is
`.cardIdentity`, a 70px reserve on name+moves: it fixes the two _opening_ cards
against each other, where a wrapping name put their "N games" lines 24px apart
on cards of identical shape (invisible in both fixtures — neither player has a
qualifying weak opening). It cannot align them with the record card, which has
no moves line; that middle is structurally a block short and forcing it would
mean inventing a line. Also `.winRateRow`/`.statsRows` padding-top unified (16
vs 20px, one role) and the dead ≤768px headline overrides deleted, since 17px
read as live against a reserve computed from 20px. **A games count on the record
card was declined**: the header states it twice and the counts sum to it.

## Previous Task: TopBar search field sized to its own panel (`claude/desktop-search-bar-width-ovwyg0`)

**The dropdown was 140px wider than the control that opened it.** The field was
a fixed 240px; the panel took `width: max-content` capped at 380px, anchored
right, so focusing the input flared a box out past the field's left edge.

- **The field gives, not the panel.** `width: clamp(300px, 30vw, 380px)`, panel
  now `left: 0; right: 0`. Fluid because the bar is a `1fr auto 1fr` grid: a
  fixed 380px right column exceeds its fr share below ~1045px.
- **300px floor is the Surprise me row** — label plus hint needs ~265px.
- **Tablet (640–900px) keeps the old flare**; that field has no room to grow.
