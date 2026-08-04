# Active Context

**Date:** 2026-08-03

## Current Task: The mobile search overlay steps aside when a tab navigates (`ux/phase-5-analyse`)

**The tabs weren't dead — the overlay outlived the navigation.** With search
open on mobile, tapping Discover / Repertoire / Analyse did change route; the
overlay stayed on top of the page that had just loaded, so nothing appeared to
happen.

- **Why the tabs are tappable at all.** `SearchOverlay` renders inside the
  sticky `TopBar` (`z-index: 100`), which is a stacking context — so its
  `z-index: 300` is trapped there, and `BottomTabBar` (later root sibling,
  also 100) paints _and hit-tests_ above the "modal". That's deliberate: the
  overlay reserves `padding-bottom` for the bar.
- **Fix is the missing half of that decision.** Close on `pathname` change,
  routed through `close()` so the stale query and results go too. Keyed on the
  path via a ref — a plain `[pathname, open]` dep would shut the overlay the
  instant it opened.
- **Placement assessed, left alone.** Search stays top-right: it's a mode over
  the page, not a destination, it matches the desktop bar, and the tab bar keeps
  three destinations plus a legible Repertoire badge at 320px. A 4th tab wins
  the thumb zone but wants a real `/search` route and a portal out of `TopBar`.
- **Known gap, not fixed:** the overlay declares `aria-modal="true"` while the
  tab bar above it is intentionally interactive, so AT users get Cancel but not
  the tabs.

## Previous Task: TopBar search field sized to its own panel (`claude/desktop-search-bar-width-ovwyg0`)

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
