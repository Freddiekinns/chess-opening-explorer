# Active Context

**Date:** 2026-07-29

## Current Task: UX review — implementation audit (`ux/phase-5-analyse`)

All six phases read back against the handoff bundle
(`design-system/handoffs/2026-07-27-ux-review/`, 29 changes) and the spec. Six
defects found and fixed on the phase-5 branch. Every one was a change
half-applied, not a decision taken wrongly.

- **Two Surprise me controls in the hero.** Phase 1 added the quiet links but
  left `SearchBar`'s filled landing button — on mobile a full-width filled
  button above a 99px quiet link. The hub was wired into the top bar and the
  mobile overlay but **not the hero field** the change was drawn for.
- **The Discover repertoire row removed silently.** It called `remove()` while
  every other star goes through `useRepertoireToast`. The one tap that destroys
  something the user built had no Undo.
- **Family group headings uppercased chess notation** — `1. Nf3` reached the
  screen as `1. NF3`, which is not a move.
- **Practice was still outlined on mobile.** Phase 0 changed the global
  `.practice-toggle-btn`; the mobile button lives in the page module and kept
  the pre-review styling — the inverted priority change 24 exists to fix, on the
  breakpoint it mattered most on.
- **A filter URL 400d on a change of case.** `level=Beginner` but
  `style=aggressive`; one wrong capital blanked the whole grid.
- **The Analyse gear announced itself as "Settings"**, saying nothing about what
  it sets.

**Deviations reviewed and kept:** three mobile tabs (not four), 60px chrome (not
56/64), pre-baked sample fixtures, "Over-the-board masters" rather than the
mock's invented "2,400+ Elo", the gear in the search overlay.

**Left open:** mobile shows no facet chips, so the active filters are only
legible inside the sheet. **Verified:** 472 frontend, 834 backend, clean build.
**Spec/plans:** `docs/superpowers/{specs,plans}/`

## Previous Task: UX review phase 5 — Analyse (PR #63)

One header, "This analysis / Your record", sample reports from committed
fixtures, the reduction shared with the generator. **Detail in `archive.md`.**
