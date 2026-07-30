# Active Context

**Date:** 2026-07-30

## Current Task: One search row for all three surfaces (`ux/phase-5-analyse`)

Typing changed how an opening was **drawn**, not just which openings were
listed. There were **three** result-row implementations (hero, top bar, mobile)
and **two** hub rows, across two type scales — hub on `--text-*` (13px medium,
ECO inline in a meta line), hero results on the `--font-size-*` legacy aliases
(16px semibold, ECO pill, 135° gradient + half-pixel lift on hover). Not a
decision: what happens when four surfaces are built in four phases and the row
is never named as a component.

- **`SearchRow` + `SurpriseRow`** (`shared/SearchRow.tsx` + `.module.css`) now
  serve every surface and both states. Kept from the hub: the bounded card,
  section headings, quiet Surprise me. Kept from the results: 14px semibold
  name, ECO pill, mono moves on their own line. Dropped: the gradient, the
  sub-pixel lift, the ECO pill recolouring on hover.
- **Three fixes fell out of it.** The hero hub panel had _zero_ padding, so
  "Recent" read as clipped and rows touched the sides. The top-bar dropdown was
  pinned to its 240px field, which is why Surprise me dropped its visible hint
  there — panel now sizes to content (≤380px), hint restored, `title`-only
  exception gone. Results list was capped at 280px against 71px rows (under four
  of twenty visible) → `min(60vh, 480px)`.
- **Sparkles → Shuffle.** Sparkles is the industry's AI glyph; on a random-jump
  control it promises intelligence that isn't there.
- **Guard:** `shared/__tests__/search-row-parity.test.tsx` compares a hub row
  against a results row and fails if they diverge.

**Bundle:** new `components-search-row.html` is canonical; the hub and results
cards now own their panels only. Spec §3.3. **Verified:** 498 frontend, clean
build, all three surfaces checked live.

## Previous Task: Master games moves up the mobile stack

It rendered **last** on mobile — after videos, studies and the search pills. Not
a defect: the UX-review spec's decision table put it there and phase 4 built it
faithfully. **A spec decision reversed, not a bug fixed** — its stated reason
("makes both breakpoints agree") was false, since desktop renders it in the rail
under the explorer card with resources full-width below. Now Overview · explorer
· master games · plans · videos+studies · search pills: position data first,
then a gradient away from the page. No component change (already a collapsed
accordion). Spec §3.2 rewritten so nobody restores the table's decision; order
guard at `pages/__tests__/mobile-stack-order.test.tsx`, verified to fail on the
old order before landing. **Detail in git.**
