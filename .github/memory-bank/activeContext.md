# Active Context

**Date:** 2026-06-11

## Current Task: Design-Review Fixes — Fake Stats + Search Dropdown

**Status:** PR raised from branch `claude/ecstatic-fermi-7c5e64`. Verified in
browser (desktop + mobile), 195 frontend tests pass, tsc + ESLint clean.

Born from a full design critique of home / analyse / opening pages. Two critical
fixes applied:

1. **OpeningCard fabricated W/D/L stats** — when an opening had no
   `white_win_rate`/`draw_rate`/`black_win_rate`, `getGameStats()` invented
   percentages with `Math.random()` (changing every render). Now returns `null`
   and both card variants render no win-rate bar instead. Never fabricate data.
2. **Search dropdown stacking bug** — `sectionReveal` keyframes animate
   `transform` and were applied with `animation-fill-mode: both`, so every
   landing section retained `translateY(0)` forever → permanent stacking
   contexts → "My repertoire" painted over (and click-blocked) the open
   suggestions dropdown. Fixed by switching every `sectionReveal … both` to
   `backwards` (visually identical; end state == base state). Guard comment
   added at the canonical keyframes in `simplified.css`.
3. **Search result disambiguation** — `formatMovesPreview` truncated to 6
   tokens/25 chars, so all Najdorf variations displayed identically. Now shows
   the full line up to 60 chars; longer lines keep the **tail** (the
   distinguishing moves), cut at a move-number boundary with a leading "…".

Remaining critique findings, recommendations, and accept/fix decisions are
documented in `docs/reviews/2026-06-11-design-review.md`. Top of the queue:
content-pipeline artifacts on detail pages (mismatched plans, wrong-opening
studies, duplicated titles), card semantics/a11y, analyse hero-card naming.

## Previous Task: CI Green-Up — Lint + Coverage Gates Fixed (2026-06-06)

Complete and merged (PRs #35–#37). Four pre-existing CI bugs fixed (API lint
path, ESLint-vs-Prettier rule conflict, coverage PR-comment permissions, codecov
badge tokenless failure). Local `format:check` CRLF noise is a Windows artifact
— trust CI. Full detail in `archive.md`.
