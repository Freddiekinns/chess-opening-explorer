# Active Context

**Date:** 2026-07-30

## Current Task: Search hub and results merged into one surface (`ux/phase-5-analyse`)

Typing used to swap the hub out wholesale, taking Surprise me and any sight of
the repertoire with it. The two states are now continuous: the hub's sections
give way, its way out does not.

- **Surprise me survives into the results**, as a footer outside the scroller —
  it used to vanish on the second keystroke, i.e. exactly when someone is
  flailing. Reachable by arrowing one past the last result, not only by click.
- **No count line and no number.** A "14 openings match" line was built, then
  cut: the search counts every record scoring above zero — 4,269 for "sicilian"
  against a family of ~1,710 — which reads as a claim about how many Sicilians
  exist, and counting only rendered rows always says twenty. No "did you mean"
  either; the openings appearing are the feedback.
- **"Saved" badges on matching rows**, not a repertoire section (which would
  draw a saved match twice, at two ranks) and not a star (everywhere else a star
  is a control you press; these rows navigate).
- Render cap 8 → 20; the API already returned 20 and we discarded 12.

Applied to **all three** search surfaces — hero, top bar, mobile overlay — the
duplicated-UI seam that produced four of the six audit defects. Two bugs found
on the way: the overlay's last result was clipped by the bottom tab bar, and
`.surpriseBtn` was dead CSS.

**Deviations from the mock:** no count line at all; no bracketed ECO (the pill
separates it); "Saved" in sentence case, not "SAVED". The narrow top-bar
dropdown drops the visible hint — it moves to `title` + `aria-label` ("Surprise
me — jump to a random opening"), so the name still starts with the visible text
(WCAG 2.5.3). Icon and label stay on every surface. **Verified:** 493 frontend,
834 backend, clean build, all three live. **Bundle:** new
`components-search-results.html`. **Spec/plans:**
`docs/superpowers/{specs,plans}/`

## Previous Task: UX review implementation audit

Six phases read back against the handoff bundle; six defects, every one a change
half-applied — two Surprise me controls in the hero, a silent repertoire
removal, `1. NF3`, mobile Practice still outlined, a filter URL 400ing on case,
the gear announcing "Settings". **Detail in `archive.md`.**
