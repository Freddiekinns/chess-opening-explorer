# Active Context

**Date:** 2026-08-02

## Current Task: The mobile filter sheet closes the way it looks like it does

The grabber was decoration. A 36×4 pill on a bottom sheet promises a drag, and
nothing was behind it — so on a phone the exits were a ~100px strip of backdrop
above a sheet filling 88% of the screen, the footer button, and Escape, which a
phone does not have. Pulling it down did nothing.

- **The gesture is real.** Pointer handlers on the grabber + title row: past 25%
  of the sheet (capped at 120px) or a flick over 0.5px/ms it dismisses,
  otherwise it springs back. The grabber is also a 44px button that closes on
  tap. Deliberately not on the scrolling body — deciding per touchmove between
  "scroll a pill row" and "close" steals either a filter tap or a scroll.
- **Twenty-nine families are now opt-in.** Expanded by default, every visit
  opened 2,000px deep for the one facet most visits never touch, and the applied
  family was legible only by scrolling to find the highlighted row. Collapsed
  behind a row that states it, the whole common case — 13 level / style / sort
  pills — fits one screen with nothing to scroll. Selecting collapses it again,
  as the desktop dropdown does.
- **Left alone**: one sheet holding every facet (a sheet per facet is three taps
  to set a level); live apply; the footer's true count. The IA was right.
- Also: `overscroll-behavior: contain` so a flick at the list's end stops there;
  a slide-up entrance, `backwards` per the transform-fill-mode rule.
- Guards in `FilterSheet.test.tsx`, each verified failing first. jsdom has no
  `PointerEvent`, so `fireEvent.pointerDown` silently drops `clientY` — the drag
  tests dispatch MouseEvents with a `pointerId` or they pass vacuously.

## Previous Task: Analyse summary cards read as one row (`claude/player-details-layout-qxa1mo`)

Phase 5 §3 reversed. Figures bottom-anchored across three columns (win left /
draw centre / loss right — the bar's own geometry) with a third line, the
overall win rate, closing the slack. Four disagreements between rules drawn in
different places fell out of it (6 vs 8px bars, 22 vs 20px headline, tracked vs
sentence case, a sage border on one tile). It also exposed a real defect: "Your
record" tallied W/D/L inside the classified branch, so a real result with an
unrecognised opening vanished from the record the header still counted.
