# Active Context

**Date:** 2026-07-30

## Current Task: Search hub and results merged into one surface (`ux/phase-5-analyse`)

Typing used to swap the hub out wholesale, taking Surprise me and any sight of
the repertoire with it. The two states are now continuous: the hub's sections
give way, its way out does not.

- **Surprise me survives into the results**, as a footer outside the scroller —
  it used to vanish on the second keystroke, i.e. exactly when someone is
  flailing. Reachable by arrowing one past the last result, not only by click.
- **A count line above the list** carries the whole of the feedback: no "did you
  mean", no correction notice. `role="status"`, so it reaches people who cannot
  watch results appear. Four phrasings in `lib/searchResultsSummary.ts`, each
  checkable against the rows under it.
- **The truncated form names no total.** The search counts everything scoring
  above zero — 4,269 for "sicilian" against a family of ~1,710 — which reads as
  a claim about how many Sicilians exist. It says `Top 20 matches`.
- **The move variant** (`3 openings begin with 1. Nf3`) only fires when every
  row opens with that move, and prints the move as the **data** spells it: case
  is semantic in algebraic notation.
- **"Saved" badges on matching rows**, not a repertoire section (which would
  draw a saved match twice, at two ranks) and not a star (everywhere else a star
  is a control you press; these rows navigate).
- Render cap 8 → 20; the API already returned 20 and we discarded 12.

Applied to **all three** search surfaces — hero, top bar, mobile overlay — the
duplicated-UI seam that produced four of the six audit defects. Two bugs found
on the way: the overlay's last result was clipped by the bottom tab bar, and
`.surpriseBtn` was dead CSS.

**Deviations from the mock:** no bracketed ECO (the pill separates it); "Saved"
in sentence case, not "SAVED"; the narrow top-bar dropdown drops the hint.
**Verified:** 506 frontend, 834 backend, clean build, all three live.
**Bundle:** new `components-search-results.html`. **Spec/plans:**
`docs/superpowers/{specs,plans}/`

## Previous Task: UX review implementation audit

Six phases read back against the handoff bundle; six defects, every one a change
half-applied — two Surprise me controls in the hero, a silent repertoire
removal, `1. NF3`, mobile Practice still outlined, a filter URL 400ing on case,
the gear announcing "Settings". **Detail in `archive.md`.**
