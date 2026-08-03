# Active Context

**Date:** 2026-08-03

## Current Task: The mobile search overlay steps aside when a tab navigates (`ux/phase-5-analyse`)

**The tabs weren't dead — the overlay outlived the navigation.** With search
open on mobile, tapping Discover / Repertoire / Analyse did change route; the
overlay stayed on top of the page that had just loaded.

- **Why the tabs are tappable at all.** `SearchOverlay` renders inside the
  sticky `TopBar` (`z-index: 100`), a stacking context — so its `z-index: 300`
  is trapped there, and `BottomTabBar` (later root sibling, also 100) paints
  _and hit-tests_ above the "modal". Deliberate: the overlay reserves
  `padding-bottom` for the bar.
- **The fix is the missing half of that.** Close on `pathname` change, routed
  through `close()` so the stale query goes too. Keyed on the path via a ref — a
  plain `[pathname, open]` dep would shut the overlay the instant it opened.
- **Placement assessed, left alone.** Search stays top-right: a mode over the
  page, not a destination. A 4th tab wins the thumb zone but wants a real
  `/search` route and a portal out of `TopBar`.
- **Known gap, not fixed:** the overlay declares `aria-modal="true"` while the
  tab bar above it is intentionally interactive.

`main` is now merged into the stack tip. Merge order for the seven PRs is in
`progress.md` → What's Left; do not squash inside the stack.

## Previous Task: The mobile filter sheet closes the way it looks (`claude/player-details-layout-qxa1mo`)

The grabber was decoration. On a phone the exits from a sheet filling 88% of the
screen were a ~100px strip of backdrop, the footer button, and Escape.

- **The gesture is real.** Pointer handlers on the grabber + title row: past 25%
  of the sheet (capped 120px) or a flick over 0.5px/ms dismisses, otherwise it
  springs back; the grabber is also a 44px button that closes on tap. Not on the
  scrolling body — deciding per touchmove between "scroll a pill row" and
  "close" steals either a filter tap or a scroll.
- **Twenty-nine families are now opt-in.** Expanded by default, every visit
  opened 2,000px deep for the one facet most visits never touch. Collapsed
  behind a row stating the applied family, the common case fits one screen.
- **Also on this branch: the Analyse summary-card row.** Phase 5 §3 reversed,
  then `.cardIdentity` reserves 70px on name+moves so a wrapping name stops
  putting the two _opening_ cards' lines 24px apart. The record card is
  deliberately not forced into line — it has no moves row to fill. **Detail in
  `archive.md`.**
