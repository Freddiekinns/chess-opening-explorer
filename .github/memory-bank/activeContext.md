# Active Context

**Date:** 2026-03-28

## Current Task: TASK016 Phase B — Design Token Migration & Polish

**Status:** Complete. "Warm Editorial Dark" design system fully applied across
all pages. Build clean.

**Done (this session):**

- **Phase B token migration**: Replaced all hardcoded colours in
  `simplified.css` (~80 instances) with design tokens — rgba borders →
  `--border-*`, rgba shadows → `--shadow-*`, hardcoded fonts → `--text-*`, px
  radii → `--radius-*`
- **Analyse page overhaul**: Removed harsh brand-orange dominance — distribution
  bars now use chess-thematic result colours (amber/grey/cream), card labels
  subdued, win rate values neutral, sort pills use subtle warm highlight,
  opening variation names in secondary text
- **Surface warmth**: Bumped entire elevation scale warmer — base `#1a1816`,
  raised `#232120`, elevated `#2c2a27`, overlay `#363330` (was near-black
  `#100f0e`)
- **Nav sizing**: Logo 16px, nav items 16px, bar height 60px (was
  13px/13px/56px)
- **Detail page headers**: "Overview", "Opening book", "Continuations",
  "Videos", "Studies" bumped to headline font at 16-18px (were 13-14px body
  text)
- **Landing page animations**: Added staggered `sectionReveal` entrance
  animations to hero, subtitle, search bar, PGN link, and repertoire section
- **Detail + analyse page CSS modules**: Background agents migrated 14 module
  files to design tokens
- **Repertoire/popular card consistency**: Shared visual language (ECO pills,
  matching warm backgrounds)

## Previous Task: Footer Standardisation — DONE

MIT LICENSE added; footer consolidated; `FeedbackSection` removed.
