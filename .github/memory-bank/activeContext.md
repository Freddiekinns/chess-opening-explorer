# Active Context

**Date:** 2026-07-27

## Current Task: UX review phase 1 — Discover closes the loop (`ux/phase-1-discover`)

Second of six phases implementing the 2026-07 UX review. **Delivery topology:**
every phase PRs into the long-lived `feat/ux-review`, which merges to `main` as
a **single** PR at the end. Phase 1 is stacked on `ux/phase-0-systemic` (PR #58)
rather than branched from a merged base — merge #58 first, and phase 1's diff
resolves to its own commits.

The goal: find → save → revisit, completable without opening a detail page.

- **Shared `Toast` + `useRepertoireToast`.** One hook decides wording and timing
  everywhere (grid, detail page, repertoire page), so they cannot drift. Undo
  matters because the star is now a single tap on a scrolling list. **Gotcha:**
  `useRepertoire.toggle` closes over its own render's array, so the undo closure
  must call through a ref — capturing `toggle` re-adds the opening instead of
  removing it. The plan had this bug; two tests pin it.
- **Star on every card** — `OpeningCard` already accepted the props and nothing
  passed them. 44px target, never navigates the card (cards stay real links).
- **Slim empty prompt** replaces the dashed panel; Popular openings is now above
  the fold at both 390 and 1360 on a first visit.
- **Persistent top-bar search** on every page (was detail-only). "Surprise me!"
  left the bar for the hub. **Gotcha:** the hub wrapper cancels `mousedown` so
  the field keeps focus — rows fire on click and the input's 150ms blur teardown
  would otherwise unmount the row under a slow press.
- **Shared `SearchHub`** — desktop's dropdown showed nothing until you typed.
- **`/repertoire`** (noindex, not in the sitemap) + three mobile tabs (Discover
  · Repertoire · Analyse) with a count badge. No Search tab; no desktop
  repertoire page — the Discover row is the repertoire.

**Verified:** 372 frontend tests, clean build, loop walked at 390 and 1360.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
**Plans:** `docs/superpowers/plans/2026-07-27-ux-phase-{0,1}-*.md`. Phases 2–5
unplanned by design — the browse API's shape informs phase 3.

## Previous Task: UX review phase 0 — systemic pass (PR #58)

One button spec (Practice primary, Load more tertiary), self-labelling
`ResultBar` in both `OpeningCard` variants, decorative orange removed, one
repertoire name, sentence case, global `:focus-visible` ring, `aria-pressed` on
the star. No behaviour change. **Detail in `archive.md`.**
