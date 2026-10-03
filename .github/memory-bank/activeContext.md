# Active Context

**Date:** 2026-10-02

## Current Task: Splitting the `irregular` family

`irregular` held 940 positions, from 1.e4 to the Grob, so its family shelf (the
video fallback for pages with no videos of their own) was a grab-bag. It was 16
of the 19 top-200 pages that fall back to a shelf. Three new families in
`data/families.json`: `queens-pawn` (Queen's Pawn Game, 210 positions),
`kings-pawn` (King's Pawn Game, 157) and `offbeat-e4` (Offbeat 1.e4 Defenses,
110). Six narrow re-routes in `data/family-overrides.json`: 2…Nc6 → `italian`,
London-named → `london`, 1.d4 g6 → `pirc-modern`, Neo-Indian → `nimzo-indian`,
Veresov → `trompowsky`, and a mislabelled B01 → `scandinavian`. `irregular`
keeps 421 flank and offbeat positions; top-200 pages on its shelf 16 → 4.

`tools/family-taxonomy/tests/family-taxonomy-data.test.js` pins the real
taxonomy and fails when the committed ECO files drift from the resolver.
Analysis and decisions: `docs/proposals/2026-10-02-irregular-family-split.md`.
Left open: 1.g3 (Hungarian, Benko Opening) stays in `irregular` because KIA's
own shelf is contaminated; the 192 `uncategorised` positions get no shelf.

## Previous Task: Jev rejection filter and video pins

#157 (with #158) ends the video pipeline by dropping pairs Jev confidently
rejects, then pins 18 Jev-and-judge-agreed videos from `config/video_pins.json`.
Top-200 own-page coverage 178 → 172 → 181. Open: the scorer gives 0 to Veresov,
Owen and Nimzo-Larsen videos that name their opening. Full text in `archive.md`.
