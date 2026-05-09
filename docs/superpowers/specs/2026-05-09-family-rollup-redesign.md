# Family Rollup Redesign — Design Spec

**Date:** 2026-05-09 **Status:** Draft v2, pending user review **Surface:**
Analyse page (`/analyse`) — `PersonalOpeningStats` component **Branch:**
`feature/opening-family-rollups` (continues Phase 1) **Related:**

- `docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1-completion.md`
  — Phase 1 (taxonomy, build pipeline, API surface, initial UI)
- `design-system/` — canonical brand reference (Warm Editorial Dark)
- `design-system/chats/chat1.md` — Claude Design session that produced the
  variations
- `design-system/project/explorations/Family Rollup Variations.html` — rendered
  prototype (frames A, B, C, and full-page mock)

**Revision history:**

- v1 (2026-05-09): Variation B + frame-4 toolbar baseline.
- v2 (2026-05-09): Folded in `frontend-design` critique — leader-dot
  table-of-contents pattern, hairline rules instead of surface tint,
  display-size WR%, committed result-colour tinting, editorial inline-link
  toolbar (replacing dropdown chrome), Other as footnote-strip rather than row,
  full motion section, tabular figures spec-wide, hand-rolled chevron (no
  Lucide).

---

## Goal

Replace the Phase 1 family-rollup UI on the Analyse page with a treatment that
(a) shares the visual language of the existing variation rows, (b) surfaces the
rollup's actual insight (aggregate win rate, best variation, weakest variation)
instead of just summing counts, (c) integrates the controls (View, Sort) into a
coherent editorial header rather than stacking three unlabelled segmented pills,
and (d) commits the visual character firmly to the **Warm Editorial Dark** brand
— a chess reference book under lamplight, not a SaaS dashboard.

## Background — what's wrong with Phase 1

Documented in
`docs/superpowers/plans/2026-05-04-opening-family-rollups-phase-1-completion.md`.
Briefly:

1. **Fake CSS tokens.** The family-rollup CSS block at
   `packages/web/src/components/personal/PersonalOpeningStats.module.css:2037–2123`
   uses variables that don't exist (`--surface-2`, `--accent-orange`, `--text`,
   `--text-muted`, `--font-headline`, `--font-mono`) with hard-coded fallbacks
   that are _almost_ but not quite right. Wrong shade of orange, serif font
   where the brand uses a sans display face, slightly cooler greys.
2. **Card metaphor clashes with the flat row metaphor.** Variation rows are a
   flat bordered list; family rows are cards with a left orange spine. Toggling
   between views flips the underlying metaphor.
3. **Buried insight.** A family row shows raw aggregates
   (`120 games · 8 variations`) plus a W/D/L bar. The whole reason to roll up is
   to answer "how do I do across this family, and which line is lifting/sinking
   it?" — invisible.
4. **Three unlabelled segmented pills stacked.** Different padding/radius/colour
   on each. The Variation/Family toggle has no label, so its scope is ambiguous.
5. **Sort silently disabled in family view.**
6. **ARIA misuse.** `role="tablist"` controls have no `tabpanel`s.

## Aesthetic direction

**Warm Editorial Dark, leaning into the "chess reference book" metaphor.** The
visual structure of this surface should read as a typeset table of contents in a
chess monograph, not as a stack of dashboard tiles. Specifically:

- Hierarchy carried by **typographic structure** (rules, leader dots, weight,
  size) rather than CSS bento boxes (cards, tints, surface elevation).
- Numerals are **typographic events**, not decorations — the win-rate gets
  display weight at a size large enough to be the row's anchor, with tabular
  figures so percentages align across the column like a price list in a menu.
- Result colours (cream for white, amber for black) are committed, not deferred.
  This is the chess-distinctive move that separates the surface from any other
  dashboard.
- Controls read as **editorial section headers** (tracked-out small caps, inline
  link options) rather than dashboard chrome (segmented pills, dropdowns).

This direction is non-negotiable for the spec; deviating from it during
implementation pulls the surface back toward generic dashboard.

---

## Decision

### Row treatment: **Editorial leader-dot row**

Family rows share the **flat-row scaffold** of variation rows. They differ from
variation rows by **typographic structure**, not by surface elevation:

- **Hairline rule above each family row** — `1px solid var(--border-default)`
  (translucent white at 10%). The first family rule sits flush with the section
  header; the last family closes with another rule. No surface-tint background
  on the row itself.
- **Disclosure marker** at the row's left edge — hand-rolled inline SVG (single
  `<path>`, 1.5px stroke, 16×16 viewbox), drawn next to the component file in
  the existing brand convention (no Lucide, no library import). Stretch goal in
  implementation: a stylised pawn glyph that "advances" 90° on expand,
  referencing the brand logo.
- **Family name** — `var(--font-family-headline)` (Bricolage Grotesque), weight
  700, size `var(--text-lg)` (18px), letter-spacing `-0.01em`. White-space
  nowrap; truncates with ellipsis at narrow widths.
- **Leader-dot connector** — between the family name and the win-rate, a flex
  spacer rendering middle-dots (`·`) or a CSS dotted border simulation in
  `var(--color-text-muted)` at low contrast. This is the editorial signature of
  the surface; reads as "Sicilian Defence . . . . . . . . . . . . **56%**".
  Implementation: a `<span>` with `flex: 1`,
  `border-bottom: 1px dotted var(--border-subtle)`, `align-self: end`,
  `transform: translateY(-4px)` to sit on the typographic baseline.
- **Aggregate win-rate %** — `var(--font-family-headline)`, weight 800, size
  **28–32px** (uses `clamp(28px, 2.4vw, 32px)`), letter-spacing `-0.02em`,
  `font-variant-numeric: tabular-nums`. **Result-coloured by side context**:
  white-side rows use `var(--color-result-white-text)` (`#e8e4de`, cream-leaning
  off-white), black-side rows use `var(--color-result-black-text)` (`#d4a050`,
  amber). This is committed, not optional.
- **Sub-meta line** beneath the family name — best and worst variations in the
  family, set inline as editorial prose:

  > _Best Najdorf — 67% · Needs work Dragon — 38%_

  Family name fragment in `var(--font-family-primary)` (DM Sans) **italic**,
  weight 400. Percentages in `var(--font-family-mono)` with tabular figures.
  Brand middle-dot separator (`·`) with `var(--space-2)` margins. The labels
  _Best_ and _Needs work_ are in `var(--color-text-muted)`; the variation names
  in `var(--color-text-secondary)`; the percentages in
  `var(--color-text-primary)`. No colons, en-dashes between name and percentage.
  When neither best nor worst qualifies (no variation has `games >= 2`), the
  sub-meta line is omitted entirely.

- **Games count** — small mono row meta on the far right edge of the row,
  `var(--text-xs)` (12px), `var(--color-text-muted)`, tabular figures, formatted
  as `"42 games"`.
- **Expanded variations** render beneath the parent — same scaffold as the
  top-level variation rows, indented `var(--space-6)` (24px) on the left, with a
  1px left border in `var(--border-subtle)` running the height of the indent
  gutter. Variation rows beneath have **no leading hairline rule** (rules are a
  family-only signal). They inherit the side's result-colour tint at smaller
  size.

**Why this row treatment:** The leader-dot connector is the single unforgettable
detail this surface gets. It's a visual quotation from the typesetting tradition
the brand explicitly references, costs almost nothing to implement, and gives
the row a pattern no other product on the web has. Combined with the
display-weight result-coloured WR% and the hairline rules, the rows read as
typeset reference material rather than dashboard tiles.

### Section header & controls — editorial, not chrome

Replace dashboard-chrome controls (segmented pills, dropdowns) with **inline
editorial labels and link-style options**.

```
PERFORMANCE AS WHITE                         42 games

ORDER  Most played · Highest win rate · Lowest win rate
─────────────────────────────────────────────────────────
▸ Sicilian Defence . . . . . . . . . . . . . . .  56%   42 games
  Best Najdorf — 67% · Needs work Dragon — 38%
─────────────────────────────────────────────────────────
▸ French Defence  . . . . . . . . . . . . . . .  61%   18 games
  Best Winawer — 70% · Needs work Advance — 48%
─────────────────────────────────────────────────────────
…
```

Specifically:

- **Section header** — `Performance as White / Performance as Black` set in
  `var(--font-family-headline)` weight 800, `var(--text-xl)` (20px),
  letter-spacing `-0.02em`. Right-aligned games count uses `.label-meta` style
  (10px, 0.1em tracked, uppercase, `var(--color-text-muted)`).
- **View switcher** — page-global, sits above both columns:

  > **VIEW** Variation · Family

  `VIEW` is the `.label-meta` utility (10px, 0.1em tracked, uppercase, muted).
  `Variation` and `Family` are inline link-style options in DM Sans 500, 13px,
  separated by a brand middle-dot. Active option in `var(--color-text-primary)`;
  inactive in `var(--color-text-muted)`. Hover: muted → primary, no colour shift
  to orange. ARIA: `role="radiogroup"` with two `role="radio"` children +
  `aria-checked`. Keyboard: arrow keys move focus, space/enter activates.

- **Order switcher (per column)** — sits inside each section header, below the
  title, above the rules:

  > **ORDER** Most played · Highest win rate · Lowest win rate

  Same pattern as VIEW: tracked-out label + inline link options + middle-dot
  separators. Independent state per column. Defaults to _Most played_. ARIA: a
  second `radiogroup` per column. No dropdown chrome, no caret, no popover.

This pattern reads as a section header in a magazine, not a control surface. It
also reuses the `.label-meta` utility already in the design system, so no new
visual primitives are introduced.

**"As White / As Black" tab toggle is removed entirely on desktop** — vestigial
when both columns render side-by-side. Mobile (≤960px) keeps the side toggle as
before, since one column shows at a time on narrow viewports.

**Per-row expansion state** persists across View changes (an expanded Sicilian
under White stays expanded if the user toggles View off and back on).

### "Other" — footnote-strip, not a row

The `uncategorised` bucket is **not rendered as a peer family row**. Instead,
beneath the last family row's closing rule, separated by `var(--space-6)` of
flat space (no rule), render a single-line footnote:

> _+ 12 uncategorised openings · 6 games · 50%_

- Single line, `var(--text-xs)` (12px).
- DM Sans 400 italic.
- Colour: `var(--color-text-muted)`.
- Tabular figures on the count and percentage.
- The leading `+` and middle-dots are part of the brand voice (sparse,
  declarative).
- Not expandable — uncategorised openings are by definition unfamilyable, so the
  disclosure metaphor doesn't apply.
- Not rendered at all when the bucket is empty.

This is more than typographic demotion — it removes Other from the family
hierarchy entirely. The user's eye doesn't read it as "another family I should
study"; it reads as a footnote acknowledgement of long-tail coverage.

### Win-rate count-up on first render

When the dashboard transitions from the loading state to the rendered state,
each family-row WR% animates from 0 to its actual value over **350ms with
ease-out**. This is the page's "high-impact moment" — first impression is the
result-coloured numerals settling into place across both columns. Skipped under
`prefers-reduced-motion`.

### ARIA cleanup

Both inline-link switchers (VIEW, ORDER) become `role="radiogroup"` with
`role="radio"` children + `aria-checked`. The Phase 1 `tablist`/`tab` misuse is
removed from this surface (the side toggle on mobile is also migrated to
`radiogroup`). Disclosure rows use `aria-expanded` + `aria-controls` per the
existing pattern.

---

## Motion

The brand has explicit motion conventions in `simplified.css`. The redesign
inherits them and adds two surface-specific moves. All motion is gated behind
`prefers-reduced-motion: no-preference` per the global media query.

| Surface element                    | Motion                                         | Duration                         | Easing                                           |
| ---------------------------------- | ---------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Family rows on first render        | `cardSlideIn` (opacity 0→1, translateY 20px→0) | 500ms                            | `ease-out`, staggered 80ms per row up to 12 rows |
| Disclosure chevron rotate          | `transform: rotate(0 → 90deg)`                 | 180ms                            | `cubic-bezier(0.4, 0, 0.2, 1)`                   |
| Expanding family — children appear | Per-child opacity + translateY 4px → 0         | 220ms                            | `ease-out`, staggered 60ms per child             |
| Win-rate first-render count-up     | Number animates from 0 to actual value         | 350ms                            | `ease-out`                                       |
| Inline-link option hover           | `color: muted → primary`                       | `var(--transition-fast)` (120ms) | `ease`                                           |
| Active inline-link option change   | `color` cross-fade between active and inactive | 150ms                            | `ease`                                           |

The count-up is the only mechanism added beyond what's already in
`simplified.css`. Implementation: a small `useCountUp(target, durationMs)` hook
that returns a number ramped from 0 to `target` via `requestAnimationFrame`,
with an early-return when `prefers-reduced-motion: reduce` is set (returns
target immediately). Lives in
`packages/web/src/components/personal/useCountUp.ts`.

---

## Component & file changes

### New files

- `packages/web/src/components/personal/AnalyseToolbar.tsx` — page-global VIEW
  switcher (inline-link pattern). ~50 LOC.
- `packages/web/src/components/personal/AnalyseToolbar.module.css`.
- `packages/web/src/components/personal/SectionToolbar.tsx` — per-section ORDER
  switcher (inline-link pattern). Reuses the same internal segmented-radiogroup
  primitive as `AnalyseToolbar` (extracted as `InlineLinkSwitch` if both
  components share enough — see refactor note below). ~60 LOC.
- `packages/web/src/components/personal/SectionToolbar.module.css`.
- `packages/web/src/components/personal/InlineLinkSwitch.tsx` — shared primitive
  used by both AnalyseToolbar and SectionToolbar. Renders a `.label-meta` label
  - N inline-link options + middle-dot separators with `radiogroup` semantics.
    ~70 LOC.
- `packages/web/src/components/personal/InlineLinkSwitch.module.css`.
- `packages/web/src/components/personal/FamilyRow.tsx` — extracted from
  `PersonalOpeningStats.tsx` (currently inline). New design (leader-dot row).
  ~120 LOC.
- `packages/web/src/components/personal/FamilyRow.module.css`.
- `packages/web/src/components/personal/UncategorisedFootnote.tsx` — single-line
  footnote-strip below the family list. ~30 LOC.
- `packages/web/src/components/personal/UncategorisedFootnote.module.css`.
- `packages/web/src/components/personal/useCountUp.ts` — animated-numeral hook,
  honours `prefers-reduced-motion`. ~30 LOC.
- `packages/web/src/components/personal/__tests__/FamilyRow.test.tsx`.
- `packages/web/src/components/personal/__tests__/AnalyseToolbar.test.tsx`.
- `packages/web/src/components/personal/__tests__/SectionToolbar.test.tsx`.
- `packages/web/src/components/personal/__tests__/InlineLinkSwitch.test.tsx`.
- `packages/web/src/components/personal/__tests__/UncategorisedFootnote.test.tsx`.
- `packages/web/src/components/personal/__tests__/useCountUp.test.ts`.

### Modified files

- `packages/web/src/components/personal/PersonalOpeningStats.tsx`:
  - Remove the inline `FamilyRow` component (extract to its own file).
  - Remove the standalone `groupByToggle` markup; replace with
    `<AnalyseToolbar>` rendered above the desktop `openingSections` grid (and
    above the mobile section list).
  - Remove the standalone desktop side-toggle (`pillToggle`) — keep on mobile
    only, gated behind a media query.
  - Replace `<SortBar>` pill row inside each section with `<SectionToolbar>`
    (inline-link). Re-enable sort in family view by passing the chosen sort mode
    through `groupByFamily`.
  - Update sort logic so `whiteSortMode` / `blackSortMode` apply to families
    too, not just variations.
  - Best/Weak computation: derive per-family inside `groupByFamily` rather than
    recomputing in `FamilyRow`.
  - Render `<UncategorisedFootnote>` below the family list when
    `groupByFamily()` returns a non-null `uncategorised` field.
  - Section header receives the new `Performance as White / Black` typography
    treatment with right-aligned games count in `.label-meta`.

- `packages/web/src/components/personal/PersonalOpeningStats.module.css`:
  - Delete the broken family-rollup block at lines 2037–2123.
  - Remove the desktop-side `.pillToggle` rules — mobile rules stay.
  - Update `.sectionHeader` / `.sectionTitle` to match the new typography
    treatment if not already aligned.
  - Add a `tabular-nums` utility class (or reuse one if present) for any
    surface-level numerals not covered by component-scoped CSS.

- `packages/web/src/components/personal/familyAggregation.ts`:
  - Change return type from `FamilyRollupRow[]` to
    `{ rows: FamilyRollupRow[]; uncategorised: UncategorisedSummary | null }`.
    `UncategorisedSummary = { games: number; wins: number; draws: number; losses: number; variation_count: number; win_rate: number }`.
  - Extend `FamilyRollupRow` with `best_variation: FamilyVariationRow | null`
    and `weak_variation: FamilyVariationRow | null`. Compute inside
    `groupByFamily` after the bucket loop. Qualified set: variations with
    `games >= 2`. If no qualified variations, both fields are `null`.
  - Accept a `sortMode: 'frequency' | 'best' | 'worst'` parameter and apply it
    to the final family list (currently hard-coded to `games desc`). The
    `uncategorised` bucket is removed from the family list entirely (it's
    returned separately as `uncategorised`).
  - Existing `score` field stays as is (used for tie-breaking in best/worst sort
    modes).

- `packages/web/src/components/personal/__tests__/familyAggregation.test.ts` —
  update existing tests to the new return shape; add cases for best/weak
  derivation, sort modes, and the uncategorised separation.

- `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`
  — update tests broken by the removed desktop side toggle and the changed
  toolbar structure; add tests for the count-up animation respecting
  `prefers-reduced-motion`.

### Tokens

**No new tokens.** The redesign uses only existing variables from
`simplified.css`:

- Surfaces: `--surface-base`, `--surface-overlay` (hover lift on rows).
- Borders: `--border-subtle`, `--border-default`.
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`,
  `--color-text-accent`.
- Result colours: `--color-result-white-text` (`#e8e4de`),
  `--color-result-black-text` (`#d4a050`) for the win-rate display per side.
  `--color-result-draw-text` is available but not currently used.
- Type: `--font-family-headline` (Bricolage Grotesque) for family name and
  win-rate; `--font-family-primary` (DM Sans) for body and inline-link options;
  `--font-family-mono` for percentages inside the sub-meta line and the games
  count.
- Spacing: `--space-2` through `--space-8`.
- Radii: `--radius-sm` for any small treatment; **no pill radius required** (the
  redesign eliminates pill controls).
- Transitions: `--transition-fast` for hover, `--transition-base` for the
  disclosure rotation.

**Spec-wide rule on numerals:** every element on this surface that displays a
number (WR%, games count, best/weak percentages, totals, footnote count) sets
`font-variant-numeric: tabular-nums`. Without it, percentage columns don't align
across the 8–28 family rows possible on this surface, which is visually
fatiguing.

If a token feels missing during implementation, **stop and add it to both
`simplified.css` and `design-system/project/colors_and_type.css`** in the same
PR (see CLAUDE.md design-system lockstep).

### Iconography

- Disclosure marker: hand-rolled inline SVG matching the existing convention
  (single `<path>`, 1.5px stroke, 16×16 viewbox), drawn directly inside
  `FamilyRow.tsx`. **No Lucide import, no flag needed.** Default geometry: a
  rightward-pointing chevron (`M 6 4 L 10 8 L 6 12`).
- Stretch goal (optional, implementation-time decision): replace the chevron
  with a stylised pawn glyph that "advances" 90° on expand. References the brand
  logo. If pursued, the SVG path lives in the same component file with a brief
  comment indicating the design intent.

---

## Behavioural changes (user-facing)

| Today                                                                                         | After                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three unlabelled pill toggles stacked: Chess.com/Lichess, As White/As Black, Variation/Family | Chess.com/Lichess stays. Desktop drops As White/As Black (both columns visible). VIEW becomes a labelled inline-link switcher above both columns. Mobile keeps the side toggle (also migrated to inline-link).                                                |
| Sort hidden in family view; SortBar pill row in variation view                                | ORDER inline-link switcher per column. Works in both views. Different orders on White vs Black are allowed.                                                                                                                                                   |
| Family row = card with orange left bar                                                        | Family row = leader-dot table-of-contents pattern with hairline rule above, family name on the left, dotted leader, display-weight result-coloured WR% on the right. Sub-meta line below shows best/weakest variation. Variations indent below when expanded. |
| "Other" appears as a peer family row                                                          | "Other" rendered as a single-line footnote-strip below the family list — italic, muted, not expandable.                                                                                                                                                       |
| Disclosure = literal `›` character                                                            | Hand-rolled inline SVG chevron, 1.5px stroke. Optional stretch: pawn-glyph marker.                                                                                                                                                                            |
| Aggregated stats: counts only                                                                 | Aggregated stats: display-weight WR% (result-coloured), best variation (name + %), weakest variation (name + %), games count.                                                                                                                                 |
| Win-rate appears statically                                                                   | Win-rate counts up from 0 over 350ms on first render (gated behind `prefers-reduced-motion`).                                                                                                                                                                 |

---

## Out of scope

- **Phase 2 family-lens routes and chip system.** Standalone family pages,
  family chips on the opening detail page, family filter in search.
- **Phase 3 repertoire grouping.**
- **Best/Weak surfacing on the _page-level_ hero cards.** The Phase 1 dashboard
  already has _Top-performing opening_ and _Needs work_ cards above the columns;
  this redesign doesn't change them.
- **Migrating `.platformToggle` (Chess.com / Lichess) to the new
  `<InlineLinkSwitch>` primitive.** Tempting but out of scope. The platform
  toggle remains as-is for this PR; a follow-up can unify it.
- **Mobile-specific opening-card layout (`.mobileCard`) for the variation
  view.** Stays as-is. Family rows on mobile use the same leader-dot pattern as
  desktop, just at the column's full width.
- **Tooltip on the WR% explaining the score formula.** Could come in a follow-up
  — the formula is `(wins + 0.5 * draws) / games`, but the spec doesn't surface
  that.

## Test plan

- **`familyAggregation.test.ts`** (existing, extended):
  - New return shape: `{ rows, uncategorised }` instead of `FamilyRollupRow[]`.
  - Best/weak derivation: family with 3 variations [60%, 50%, 40%] → best=60%,
    weak=40%; ties broken by games desc.
  - Insufficient qualified variations: family where every variation has `<2`
    games → best=null, weak=null.
  - Sort mode `'frequency'` (default): families sorted by games desc.
  - Sort mode `'best'`: families sorted by aggregate win rate desc.
  - Sort mode `'worst'`: families sorted by aggregate win rate asc.
  - Uncategorised separation: `uncategorised` bucket is returned as a separate
    field, never appears in `rows` regardless of sort mode.
  - Empty uncategorised: returns `null`, not an empty summary.

- **`FamilyRow.test.tsx`** (new):
  - Renders display name, win-rate %, games count.
  - Renders sub-meta line when both best and weak exist; renders neither when
    both are null.
  - Renders only the populated half of the sub-meta line when only one qualifies
    (regression: the omit case).
  - Disclosure: clicking the row toggles `aria-expanded`; expanded variations
    render below in indent; chevron rotates.
  - Result-colour-aware win-rate: white-side uses `--color-result-white-text`;
    black-side uses `--color-result-black-text`.
  - Tabular figures: `font-variant-numeric: tabular-nums` is set on numeral
    elements (asserted via computed style or class).
  - Hairline rule: each family row carries a leading
    `border-top: 1px solid var(--border-default)`.
  - Leader-dot connector renders between name and WR% (asserted by class
    presence).

- **`UncategorisedFootnote.test.tsx`** (new):
  - Renders only when `uncategorised` is non-null.
  - Renders the count, games, and percentage in the documented format.
  - Italic, muted, not interactive (no role, no click handler).

- **`AnalyseToolbar.test.tsx`** (new):
  - Renders VIEW label and two inline-link options.
  - `aria-checked` reflects current view; `radiogroup` semantics correct.
  - Changing the View calls the provided `onChange`.
  - Keyboard: arrow keys move focus between options, space/enter activates.
  - Hover on inactive option changes colour from muted to primary (computed
    style assertion).

- **`SectionToolbar.test.tsx`** (new):
  - Renders ORDER label and three inline-link options.
  - Selecting an option calls `onSortChange` with the right mode.
  - Default option is _Most played_.
  - Independent state from any sibling SectionToolbar.

- **`InlineLinkSwitch.test.tsx`** (new):
  - Generic primitive: renders a label, N option-buttons, separators between
    them.
  - `radiogroup` / `radio` ARIA semantics.
  - Keyboard navigation (arrows, home/end, space/enter).

- **`useCountUp.test.ts`** (new):
  - Returns target value immediately when `prefers-reduced-motion: reduce`.
  - Returns intermediate values during the ramp when motion is permitted.
  - Cleans up `requestAnimationFrame` on unmount.

- **`PersonalOpeningStats.test.tsx`** (existing, updated):
  - Desktop renders both White and Black columns simultaneously; no side toggle.
  - Mobile (<960px) renders one column at a time; side toggle present.
  - View toggle defaults to Variation; switching to Family re-renders both
    columns as family rows with leader-dot pattern.
  - Per-column sort: changing White's sort to _Lowest win rate_ does not affect
    Black's sort.
  - Per-row expansion persists across View toggle changes.
  - Uncategorised footnote renders below the family list when present; absent
    when no uncategorised openings exist.
  - Win-rate count-up: under `prefers-reduced-motion: reduce`, WR% renders final
    value immediately.

---

## Spec deviations / decisions to revisit

1. **Best/weak qualification threshold.** Variations need `games >= 2` to
   qualify. Matches `findBestOpening` / `findWeakestOpening` in the existing
   variation logic. Consistent across the page.

2. **Mobile keeps the As White/As Black toggle.** Necessary because mobile shows
   one column at a time. Means mobile has two switchers (side, VIEW) where
   desktop has one (VIEW). Acceptable trade-off — both use the same
   `InlineLinkSwitch` primitive, so the visual register is consistent.

3. **Pawn-glyph disclosure marker as stretch goal.** Default chevron is
   shippable; pawn glyph is an upside if implementation has time.

4. **`InlineLinkSwitch` primitive scope.** Used by AnalyseToolbar (VIEW) and
   SectionToolbar (ORDER) and the mobile side toggle. Not yet used by the
   platform toggle (Chess.com / Lichess) — that's a follow-up unification.

5. **Order option `'best'` / `'worst'` naming in code stays "best/worst" for
   consistency with existing variation sort modes.** The user-visible labels are
   _Highest win rate_ / _Lowest win rate_.

---

**Ready for user review.** No code changes have been made beyond the
bundle-adoption commit (`45d6872c4`) and v1 spec commit (`2fa55bfe1`).
