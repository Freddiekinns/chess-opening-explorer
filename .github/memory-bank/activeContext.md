# Active Context

**Date:** 2026-08-03

## Current Task: One search, not three (`claude/player-details-layout-qxa1mo`)

Design review of the shipped UX raised three items on search. All three taken;
one of them turned out to be sitting on a defect nobody had noticed.

- **A — three implementations became one hook.** `SearchBar`, `TopBarSearch` and
  `SearchOverlay` each owned a fetch, a debounce (300ms vs 250ms) and a
  no-results string, and only the hero expanded abbreviations.
  `useOpeningSearch` now owns the query; the surfaces keep only focus, keyboard
  and where a chosen result goes.
- **The defect underneath it.** `eco` is not a Fuse key, so `B90` returned **0**
  results from `/semantic-search` — the top bar and the mobile overlay have no
  local index, so ECO search was dead on both while the copy told users to try
  one. New `searchByEcoCode` branch; `B90` now returns its 31 Najdorf lines.
- **B — the saved boost shipped.** `promoteSaved` re-sorts within a _relative_
  tie band (2% of the leader), because score scales differ by 10× between search
  types. Never floats a weak match just because it is saved.
- **C — one no-results voice.** Shared `SearchNoResults` on all three; the top
  bar had none at all and simply closed its panel.
- **Surprise me followed**, on the same argument: four identical copies of one
  fetch in `lib/randomOpening.ts`. No divergence yet — but the reasoning for the
  swallowed error survived in one copy of four, which is how search drifted.
- **Also fixed, blocking the stack:** `facetDisplay` exported from
  `FilterBar.tsx` failed `react-refresh/only-export-components`, so CI lint was
  red from phase 3 up. Moved to `resultCount.ts`.

`main` is merged into the stack tip. Merge order for the seven PRs is in
`progress.md` → What's Left; do not squash inside the stack.

## Previous Task: The mobile search overlay steps aside when a tab navigates (`ux/phase-5-analyse`)

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
- **Known gap, not fixed:** the overlay declares `aria-modal="true"` while the
  tab bar above it is intentionally interactive.
