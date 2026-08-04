# Active Context

**Date:** 2026-07-27

## Current Task: UX review phase 0 — systemic pass (branch `ux/phase-0-systemic`)

First of six phases implementing the 2026-07 UX review. **Delivery topology:**
every phase branches from and PRs into the long-lived `feat/ux-review`
integration branch, which merges to `main` as a **single** PR at the end — each
phase still gets its own Vercel preview, but `main` is touched once.

Phase 0 is the no-behaviour-change base every later phase inherits:

- **One button spec.** Primary = orange / `--color-text-inverse` / `--radius-md`
  (Practice is now primary — it was the weakest-looking button in the product);
  tertiary = neutral surface, no orange (Load more, which used to out-rank it);
  Analyse CTA de-pilled. Pill shape now survives only on the platform toggle.
- **`ResultBar` extracted** (`components/shared/`) and adopted by both
  `OpeningCard` variants. Bars self-label — "White 31% · Draw 39% · Black 30%"
  replaces "W/D/B", so no legend is needed. Uses the previously-unused
  `--color-result-*-text` tokens; the fill tokens are too low-contrast as type.
  Returns `null` when stats are absent — callers never guard, nothing is faked.
- **Decorative orange gone**: the dead `.section-title` family (orange gradient
  underline, zero consumers) and the Win rate card's orange accent bar.
- **Copy**: "Your repertoire" everywhere, "Added to your repertoire" toast,
  sentence case throughout, "Paste a game" replaces "Search by pasting PGN".
- **A11y**: global `:focus-visible` orange ring for every control (text inputs
  keep their border+glow), `aria-pressed` on `StarButton`, 44px star target on
  touch pointers or ≤767px.

**Verified:** 336 frontend + 784 backend tests green, clean build, and checked
live at 390/1360 — labels don't clip, no horizontal overflow, Practice renders
`rgb(232,93,4)` on `rgb(16,15,14)`, Load more carries no orange.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
**Plans:** `docs/superpowers/plans/2026-07-27-ux-phase-{0,1}-*.md`

## Previous Task: Opening-detail & analyse UI tweaks (PR #55)

Move lists weren't showing under opening names on phones — `.mobileCardMoves`
and `.variationMoves` were both `display:none` at ≤480px, so real phones saw
name+bar only. Removed both hides; stepped family/variation names down to 14px
at ≤480 to complete the small-screen font-scale unification. Shipped in #54
before it: "Most popular next moves" caption, mobile show-more 5→3, unified
mobile Analyse cards via a shared `PerfBar`. **Detail in `archive.md`.**
