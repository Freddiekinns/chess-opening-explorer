# Active Context

**Date:** 2026-05-09

## Current Task: Family Rollup Redesign — Shipped

**Status:** Complete on branch `feature/opening-family-rollups`. Editorial
leader-dot row treatment, inline-link toolbars, footnote-strip "Other", and WR%
count-up replace the Phase 1 family-rollup UI.

**What shipped:**

- New shared primitive `InlineLinkSwitch` (radiogroup of inline-link options
  with tracked-out small-caps label) powers `AnalyseToolbar` (page-global VIEW
  switcher) and `SectionToolbar` (per-column ORDER switcher). Replaces the three
  unlabelled segmented pills from Phase 1.
- `FamilyRow` renders the editorial leader-dot row: hairline rule above each
  family, dotted leader between name and WR%, display-weight result-coloured WR%
  (cream for white, amber for black) with tabular figures, Best/Needs work
  sub-meta beneath. Hand-rolled SVG chevron. cardSlideIn 80ms stagger, child
  expand 60ms stagger, 350ms WR% count-up — all gated by
  `prefers-reduced-motion`.
- `UncategorisedFootnote` replaces "Other" peer-row with a single-line italic
  muted footnote-strip.
- `useCountUp` hook (rAF-based; returns target immediately under reduced
  motion).
- `groupByFamily` now returns `{ rows, uncategorised }`, derives
  `best_variation`/`weak_variation` (qualified at games >= 2), accepts
  `sortMode`.
- Phase 1's broken family-rollup CSS block (87 lines, fake variables) deleted.
  Desktop side toggle dropped (both columns visible); mobile keeps it.
- Adopted `design-system/` bundle (Claude Design handoff) at repo root as
  canonical brand reference. Token lockstep documented in CLAUDE.md.
  `openingbook-design` skill installed at `~/.claude/skills/`.

**Tests:** 203 frontend (+40 new), 655 backend untouched. Build clean, format
clean.

## Previous Task: Opening Family Rollups Phase 1 (2026-05-08)

28-family taxonomy + ~140 override rules → build-time `family_id` enrichment
(98.45% coverage). New `/api/families` endpoint + `family_id` on search-index.
Initial Variation/Family toggle on Analyse page (replaced by this redesign).
