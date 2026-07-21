# Active Context

**Date:** 2026-07-20

## Current Task: Video matcher — modifier-aware sibling-variation matching

**Status:** Implemented + rematched; PR raised from
`fix/video-matcher-sibling-variations`. Fred reported the Accelerated Dragon
page ranking plain-Dragon and Hyperaccelerated videos above real Accelerated
Dragon ones; root causes: (1) substring name matching ("accelerated dragon"
matched inside "hyperaccelerated dragon"), (2) any-word variation bonus
(`some()` let 'dragon' alone earn +25), (3) no modifier awareness. Fix in
`tools/video-pipeline/lib/video-matcher.js`: `findPhrase` (word-boundary,
diacritic-normalized, light s/d suffix stemming, "Acc." → "accelerated", rejects
occurrences behind foreign `variation_modifiers` from config), full-segment
variation bonus at >5-char granularity (guard stays >3 so short names — Lolli,
Sozin — apply no swing and niche pages keep family videos). Removed bogus
abbreviation aliases (accelerated dragon ↛ dragon, semi-slav ↛ slav). **Final
results** (strict boundary-aware audit, baseline → new): sibling-modifier
matches 301→0; top1 full-segment specificity 40.8%→42.1%; top-200 coverage held
183/200; cross-family contamination 0; 19 pages dropped to zero matches — all
were contamination/junk, and the family-fallback shelf covers them. Shipped
audit's "#1 names variation" 48.8%→47.6% is expected: that substring metric
counted sibling contamination as "naming" the variation. 15 new tests (137
pipeline green). Follow-up idea: extend the sibling guard to content-only
matches (Alapin/Scheveningen titles still sit ~105 on the Accelerated page via
description matches).

## Previous Task: Opening-detail & analyse UI tweaks (shipped)

PRs #52–#55 merged 2026-07-15→20: mobile category-filter dropdown, opening
detail mobile overhaul (design 2a, one data surface), "Most popular next moves"
caption + unified mobile Analyse cards (shared `PerfBar`), move lists restored
on phone cards. Full detail in `archive.md`.
