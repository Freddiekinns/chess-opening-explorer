# Active Context

**Date:** 2026-08-04

## Current Task: Review pass over the seven-PR UX stack (`claude/player-details-layout-qxa1mo`)

Read the cumulative diff `feat/ux-review...HEAD` (213 files, PRs #58–#65) for
correctness, then a second pass over CSS alone. Six defects found and fixed on
the stack tip.

- **TopBar search crashed on ArrowDown+Enter with an empty list.** The cursor
  was clamped to `results.length`, so it reached 0 with nothing there and Enter
  read `results[0].fen` off an empty array. Reachable before typing (the hub is
  showing) and after any query that matched nothing.
- **Stale search responses repainted the list.** Clearing the debounce timer
  never cancelled a request already in flight. `useOpeningSearch` now carries a
  request id, the way `useBrowse` already did.
- **Cancelling an analysis reported the `AbortError` as a user-facing error.**
  The catch could not tell an abort from a failure.
- **`OpeningCard` drew a 0%/0%/0% bar for openings with no stats.** The guard
  was `!== undefined`; `/browse` sends `null`. 16 positions hit it.
- **`MobileDataSurface` said "Loading Lichess data…" forever** when the explorer
  failed and the position had no snapshot. Desktop returned null in that state.
- **Pre-existing, fixed anyway:** `.opening-card` animates up from `opacity: 0`
  and the `prefers-reduced-motion` block cancelled that animation — the whole
  Discover grid was invisible with reduced motion on. One line.

Not fixed, deliberately: two `useRepertoireToast` instances on the landing page
render `.toast` at the same fixed slot, so toasts within 4s of each other
overlap and cover an Undo. A proper fix is one shared toast host, which is a
refactor rather than a review fix.

CSS otherwise came back clean — `clip` vs `hidden` and `backwards` vs `both`
were both applied deliberately, deleted global classes have zero consumers, and
no `:root` tokens changed, so the design-system lockstep rule is not in play.

## Previous Task: One search, not three (`claude/player-details-layout-qxa1mo`)

Three search surfaces each owned a fetch, a debounce and a no-results string;
`useOpeningSearch` now owns the query. Exposed that `eco` is not a Fuse key, so
`B90` returned 0 results wherever there was no local index. Saved openings win
ties via `promoteSaved`. Full detail in `archive.md`.

`main` is merged into the stack tip. Merge order for the seven PRs is in
`progress.md` → What's Left; do not squash inside the stack.
