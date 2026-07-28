# Active Context

**Date:** 2026-07-28

## Current Task: UX review phase 2 — browse API (`ux/phase-2-browse-api`)

Third of six phases implementing the 2026-07 UX review. **No UI change.** Lands
before the filter bar so the bar is never built on numbers that do not
reconcile. Stacked on `ux/phase-1-discover` (PRs #58 and #59 still open into
`feat/ux-review`).

`GET /api/openings/browse?level&style&family&sort&page&pageSize` returns items,
`total`, `remaining` and facet counts from **one index in one request** — today
the landing page's category counts come from one fetch and its grid from
another, so they cannot agree.

- **The invariant:** `total === offset + items.length + remaining`. Asserted per
  page on a synthetic corpus and by walking all 1,710 Sicilian openings for
  real.
- **Facets exclude their own dimension** (standard faceted search) — otherwise
  picking a level zeroes every other level and the bar becomes a dead end.
- **One primary style per opening.** Raw `style_tags` cannot be a facet: ~7 tags
  each, and "Strategic" alone is on 8,501 of 12,377, so multi-membership buckets
  each match ~50% of the corpus. The rule (gambit override → highest tag-match
  count → config order) partitions it: positional 3,585 · aggressive 3,168 ·
  gambit 2,182 · solid 1,271 · tactical 1,100 · system 1,068 · 3 unstyled.
- **Vocabulary lives in `config/browse_facets.json`**, loaded by a literal
  `require` — a computed path is invisible to Vercel's file tracer and the file
  would be missing from the deployed function.
- **Unknown facet values 400.** A silent empty result is indistinguishable from
  a genuine empty filter.
- Page size capped at 48; `Cache-Control` in `vercel.json` (mandatory per
  route).

**Known:** the level facet is 61% Advanced, 1.4% Beginner — the enrichment's
judgement, shown honestly rather than hidden. Measure usage after phase 3 before
deciding whether to re-enrich or drop the dimension.

**Verified:** 829 backend tests (63 suites), 372 frontend unchanged, clean
build, endpoint exercised live on :3010.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
**Plans:** `docs/superpowers/plans/2026-07-2{7,8}-ux-phase-{0,1,2}-*.md`

## Previous Task: UX review phase 1 — Discover closes the loop (PR #59)

Shared `Toast` + `useRepertoireToast` (undo must call `toggle` through a ref —
capturing it re-adds instead of removing), star on every card, persistent
top-bar search, shared `SearchHub`, `/repertoire` route, three mobile tabs.
Phase 0 (PR #58) was the systemic pass. **Detail in `archive.md`.**
