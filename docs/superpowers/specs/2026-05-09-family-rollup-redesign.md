# Family Rollup Redesign — Design Spec

**Date:** 2026-05-09 **Status:** Draft, pending user review **Surface:** Analyse
page (`/analyse`) — `PersonalOpeningStats` component **Branch:**
`feature/opening-family-rollups` (continues Phase 1) **Related:**

- `docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1-completion.md`
  — Phase 1 (taxonomy, build pipeline, API surface, initial UI)
- `design-system/` — canonical brand reference (Warm Editorial Dark)
- `design-system/chats/chat1.md` — Claude Design session that produced the
  variations
- `design-system/project/explorations/Family Rollup Variations.html` — rendered
  prototype (frames A, B, C, and full-page mock)

---

## Goal

Replace the Phase 1 family-rollup UI on the Analyse page with a treatment that
(a) shares the visual language of the existing variation rows, (b) surfaces the
rollup's actual insight (aggregate win rate, best variation, weakest variation)
instead of just summing counts, and (c) integrates the controls (View toggle,
Sort) into a coherent toolbar pattern rather than stacking three unlabelled
segmented pills.

## Background — what's wrong with Phase 1

Documented in
`docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1-completion.md`.
Briefly:

1. **Fake CSS tokens.** The family-rollup CSS block at
   `packages/web/src/components/personal/PersonalOpeningStats.module.css:2037–2123`
   uses variables that don't exist (`--surface-2`, `--accent-orange`, `--text`,
   `--text-muted`, `--font-headline`, `--font-mono`) with hard-coded fallbacks
   that are _almost_ but not quite right. Result: the wrong shade of orange, a
   serif font where the brand uses a sans display face, slightly cooler greys
   than the warm palette. This explains "fonts and colours all off."
2. **Card metaphor clashes with the flat row metaphor.** Variation rows are a
   flat bordered list; family rows are cards with a left orange spine. Toggling
   between views flips the underlying metaphor.
3. **Buried insight.** A family row shows raw aggregates
   (`120 games · 8 variations`) plus a W/D/L bar. The whole reason to roll up is
   to answer "how do I do across this family, and which line is lifting/sinking
   it?" — and that's invisible.
4. **Three unlabelled segmented pills stacked.** Chess.com/Lichess + As White/As
   Black + Variation/Family. Each uses different padding/radius/colour. The
   Variation/Family toggle is also a global control rendered without a label, so
   its scope is ambiguous.
5. **Sort silently disabled in family view.** SortBar is hidden when
   `groupBy === 'family'`. The user can't ask "show me families where I'm
   weakest."
6. **ARIA misuse.** Two `role="tablist"` controls have no `tabpanel`s. They're
   segmented controls, not tabs.

## Decision

### Row treatment: **Variation B — Highlighted row**

Family rows share the **flat-row scaffold** of variation rows (no card, no left
orange spine). They differ from variation rows by:

- A **subtle surface tint** (`--surface-raised`) to read as a grouping container
  without becoming a card.
- A **prominent aggregate win-rate %** set in display weight (Bricolage
  Grotesque 700, ~22px), result-coloured by side context (cream-leaning for
  white, amber-leaning for black, neutral when colour-agnostic).
- A **Best/Weak sub-meta line** below the family name showing the strongest and
  weakest variation in the family (e.g. _"Best: Najdorf 67% · Weak: Dragon
  38%"_). Single line, secondary text colour, mono numerics.
- A **disclosure chevron** on the left (Lucide `ChevronRight` at 1.5px stroke,
  rotates 90° on expand). Replaces the literal `›` character used in Phase 1.
- Expanded children render as **indented variation rows** beneath the parent —
  same scaffold as the top-level variation rows, indented by `--space-6` (24px)
  on the left, with a 1px left border in `--border-subtle` running the height of
  the indent gutter to suggest grouping.

Why B over A or C:

- A (strict flat row parity) solves the metaphor mismatch but doesn't surface
  the rollup insight — a family row reads identical to a variation row except
  for the chevron.
- C (editorial card) surfaces insight but reintroduces the card-vs-flat-row
  mismatch and scales poorly past ~10 families.
- B does both, stays inside the brand rule that orange is a bookmark ribbon (no
  orange wallpaper on the family tint), and the chat's full-page mock already
  commits to B for both columns.

### Toolbar pattern: **Frame 4 verbatim**

```
┌─ Plumthemaster · 120 games · Chess.com  [switch] ────────────┐
│                                                              │
│   View: [Variation │ Family]   ← page-global, single toggle  │
│                                                              │
│ ┌─ Performance as White ──┐ ┌─ Performance as Black ──┐      │
│ │ Sort: Most played   ▾   │ │ Sort: Lowest win rate ▾ │      │
│ │ ─────────────────────── │ │ ─────────────────────── │      │
│ │ ▸ Sicilian   56%   …    │ │ ▾ Sicilian  45%   …     │      │
│ │ ▸ French     61%   …    │ │   ▸ children            │      │
│ └─────────────────────────┘ └─────────────────────────┘      │
```

Specifically:

- **Single page-global View toggle** above both columns, labelled _"View"_.
  Segmented control with two options: _Variation_ / _Family_.
- **Per-column Sort dropdown** inside each section header. White and Black sort
  independently — different questions per side. Options: _Most played_, _Highest
  win rate_, _Lowest win rate_. Defaults to _Most played_.
- **"As White / As Black" tab toggle removed on desktop** — vestigial when both
  columns render side-by-side. Keep it on mobile (≤960px) where one column shows
  at a time.
- **Per-row expansion state** persists across columns and across toggle changes
  (an expanded Sicilian under White stays expanded if the user toggles the View
  off and back on).

### "Other" bucket demotion

The `uncategorised` bucket renders with:

- **Italic family name** (DM Sans 400 italic).
- **No surface tint** (flat `--surface-base`) so it visibly reads as "leftover"
  not "peer family."
- **Muted aggregate win-rate** (`--color-text-muted` instead of
  result-coloured).
- **Pinned to the bottom** of the family list regardless of game count. Override
  the default `games desc` sort for this row only.

### ARIA cleanup

Both segmented controls (View toggle, side toggle on mobile) become
`role="radiogroup"` with `role="radio"` children + `aria-checked`. The
`tablist`/`tab` misuse is removed. Sort dropdown is a native `<button>` +
popover (or simple `<select>` if pragmatism wins) — not a tab.

---

## Component & file changes

### New files

- `packages/web/src/components/personal/AnalyseToolbar.tsx` — page-global View
  toggle. ~60 LOC.
- `packages/web/src/components/personal/AnalyseToolbar.module.css` — styles for
  the toolbar.
- `packages/web/src/components/personal/SectionToolbar.tsx` — per-section Sort
  dropdown (renders inside each column's header). ~80 LOC.
- `packages/web/src/components/personal/SectionToolbar.module.css`.
- `packages/web/src/components/personal/FamilyRow.tsx` — extracted from
  `PersonalOpeningStats.tsx` (currently inline). New design (Variation B). ~100
  LOC.
- `packages/web/src/components/personal/FamilyRow.module.css`.
- `packages/web/src/components/personal/__tests__/FamilyRow.test.tsx` — tests
  for the new component.
- `packages/web/src/components/personal/__tests__/AnalyseToolbar.test.tsx`.
- `packages/web/src/components/personal/__tests__/SectionToolbar.test.tsx`.

### Modified files

- `packages/web/src/components/personal/PersonalOpeningStats.tsx`:
  - Remove the inline `FamilyRow` component (extract to its own file, see
    above).
  - Remove the standalone `groupByToggle` markup; replace with
    `<AnalyseToolbar>` rendered above the desktop `openingSections` grid.
  - Remove the standalone desktop side-toggle (`pillToggle`) — keep on mobile
    only, gated behind a media query.
  - Replace SortBar pill row inside each section with `<SectionToolbar>`
    (dropdown). Re-enable sort in family view by passing the chosen sort mode
    through `groupByFamily` (see `familyAggregation.ts` change below).
  - Update sort logic so `whiteSortMode` / `blackSortMode` apply to families
    too, not just variations.
  - Best/Weak computation: derive per-family inside `groupByFamily` rather than
    recomputing in `FamilyRow`.

- `packages/web/src/components/personal/PersonalOpeningStats.module.css`:
  - Delete the broken family-rollup block at lines 2037–2123 (groupByToggle,
    familyRow, familyHeader, familyName, familyMeta, chevron, chevronOpen,
    familyVariations, familyVariationItem, variationMeta).
  - Remove the desktop-side `.pillToggle` rules — the mobile rules stay.

- `packages/web/src/components/personal/familyAggregation.ts`:
  - Extend `FamilyRollupRow` with `best_variation: FamilyVariationRow | null`
    and `weak_variation: FamilyVariationRow | null`. Compute inside
    `groupByFamily` after the bucket loop. Qualified set: variations with
    `games >= 2`. If no qualified variations, both fields are `null`.
  - Accept a `sortMode: 'frequency' | 'best' | 'worst'` parameter and apply it
    to the final family list (currently hard-coded to `games desc`). The
    `uncategorised` bucket is always pinned to the end regardless of sort.
  - Existing `score` field stays as is (used for tie-breaking in best/worst sort
    modes).

- `packages/web/src/components/personal/__tests__/familyAggregation.test.ts` —
  add cases for best/weak derivation, sort modes, Other pinning.

- `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`
  — update tests broken by the removed desktop side toggle and the changed
  group-by toggle structure.

### Tokens

No new tokens. Everything in B uses existing variables from `simplified.css`:

- Surfaces: `--surface-base`, `--surface-raised`, `--surface-overlay` (for
  hover).
- Borders: `--border-subtle`, `--border-default`, `--border-hover`.
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`.
- Result colours: `--color-result-white`, `--color-result-draw`,
  `--color-result-black` for the win-rate display per side.
- Type: `--font-family-headline` (Bricolage Grotesque) for the win-rate %;
  `--font-family-primary` (DM Sans) for everything else; `--font-family-mono`
  for numerics inside Best/Weak.
- Spacing: `--space-2` through `--space-6`.
- Radii: `--radius-sm` for the row tint background, `--radius-full` for the
  segmented View toggle.
- Transitions: `--transition-fast` for hover, `--transition-base` for the
  disclosure rotation.

If a token feels missing during implementation, **stop and add it to both
`simplified.css` and `design-system/project/colors_and_type.css`** in the same
PR (see CLAUDE.md design-system lockstep).

### Iconography

- Disclosure chevron: Lucide `ChevronRight` at 1.5px stroke. Inline SVG, drawn
  next to the component (no library import — matches existing convention). Flag
  in a comment that this is the Lucide-substitution pattern from
  `design-system/SKILL.md`.

---

## Behavioural changes (user-facing)

| Today                                                                                         | After                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three unlabelled pill toggles stacked: Chess.com/Lichess, As White/As Black, Variation/Family | Chess.com/Lichess stays. Desktop drops As White/As Black (both columns visible). View toggle gets a _"View"_ label and lives in its own toolbar. Mobile keeps the side toggle as before. |
| Sort hidden in family view                                                                    | Sort works in both views. Per-column. Different sort modes for White vs Black are allowed.                                                                                               |
| Family row = card with orange left bar                                                        | Family row = subtle-tinted flat row, prominent WR%, Best/Weak sub-meta. Variations indent below when expanded.                                                                           |
| "Other" appears as a peer family                                                              | "Other" pinned to the bottom, italic, muted, no tint.                                                                                                                                    |
| Disclosure = literal `›` character                                                            | Lucide `ChevronRight` SVG, 1.5px stroke.                                                                                                                                                 |
| Aggregated stats: counts only                                                                 | Aggregated stats: WR%, best variation (name + %), weak variation (name + %), totals.                                                                                                     |

## Out of scope

- **Phase 2 family-lens routes and chip system** (from the original spec).
  Standalone family pages, family chips on the opening detail page, family
  filter in search. Separate spec/plan when prioritised.
- **Repertoire grouping** (Phase 3).
- **Best/Weak surfacing on the _page-level_ hero cards.** The Phase 1 dashboard
  already has _Top-performing opening_ and _Needs work_ cards above the columns;
  this redesign doesn't change them.
- **Migrating `.pillToggle`, `.platformToggle`, etc. to a shared
  `<SegmentedControl>` primitive.** Tempting but out of scope. We'll have two
  toolbars using the new pattern; the old toggles stay alone for now.
- **Mobile family-view treatment.** Mobile already renders one column at a time;
  Variation B's flat-row scaffold translates directly. The mobile-specific
  opening-card layout (`.mobileCard`) stays; family rows on mobile use the same
  Variation B pattern as desktop, just at the column's full width.

## Test plan

- **`familyAggregation.test.ts`** (existing, extended):
  - Best/weak derivation: family with 3 variations [60%, 50%, 40%] → best=60%,
    weak=40%; ties broken by games desc.
  - Insufficient qualified variations: family where every variation has `<2`
    games → best=null, weak=null.
  - Sort mode `'frequency'` (default): families sorted by games desc.
  - Sort mode `'best'`: families sorted by aggregate win rate desc;
    uncategorised pinned last.
  - Sort mode `'worst'`: families sorted by aggregate win rate asc;
    uncategorised pinned last.
  - Uncategorised pinning: regardless of sort mode, `uncategorised` is the last
    entry when present.

- **`FamilyRow.test.tsx`** (new):
  - Renders display name, win-rate %, games count.
  - Renders Best/Weak sub-meta when both exist; renders neither when both are
    null; renders only one when only one exists.
  - Disclosure: clicking the row toggles `aria-expanded`; expanded variations
    render below in indent.
  - "Other" treatment: italic name, no surface tint, muted win-rate.
  - Result-colour-aware win-rate: white-side family uses
    `--color-result-white`-leaning; black-side uses
    `--color-result-black`-leaning.

- **`AnalyseToolbar.test.tsx`** (new):
  - Renders View label and segmented control.
  - `aria-checked` reflects current view.
  - Changing the View calls the provided `onChange`.
  - Keyboard: arrow keys move between options, space/enter activates.

- **`SectionToolbar.test.tsx`** (new):
  - Renders Sort dropdown with three options.
  - Selecting an option calls `onSortChange` with the right mode.
  - Default option is _Most played_.

- **`PersonalOpeningStats.test.tsx`** (existing, updated):
  - Desktop renders both White and Black columns simultaneously and does not
    render a side toggle.
  - Mobile (<960px) renders one column at a time and renders the side toggle.
  - View toggle defaults to Variation; switching to Family re-renders both
    columns as family rows.
  - Per-column sort: changing White's sort to _Lowest win rate_ does not affect
    Black's sort.
  - Per-row expansion persists across View toggle changes.

## Spec deviations / decisions to revisit

1. **Sort UI: dropdown vs. pill row.** The chat used a dropdown to save
   horizontal space. Pill row (current SortBar) is more discoverable but eats
   more width. Recommendation: dropdown, which scales when more sort modes are
   added later (e.g. _Largest gap White-vs-Black_). If the dropdown feels off in
   implementation, we can switch back inline.

2. **Best/weak qualification threshold.** Variations need `games >= 2` to
   qualify. This matches `findBestOpening` / `findWeakestOpening` in the
   existing variation logic. Consistent across the page.

3. **Result-colour tinting on the family WR%.** The chat didn't specify; the
   variation rows don't tint their stats by side colour. Lifting result-colours
   into the WR% feels right for chess context (cream for "you played White",
   amber for "you played Black") but reviewers might find it noisy. **Open
   question for user review.**

4. **Mobile keeps the As White/As Black toggle.** Necessary because mobile shows
   one column at a time. Means mobile has three pill-style toggles where desktop
   has two. Acceptable trade-off.

---

**Ready for user review.** No code changes have been made beyond the
bundle-adoption commit.
