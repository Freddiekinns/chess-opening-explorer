# Handoff: Rank by your level (issue 205)

## Overview

Let a visitor set their rating band once on the Discover landing page and have
the popular openings grid **and** hero search rank by popularity at that band.
The choice persists site-wide via the existing `my-level` preference, so the
opening detail page's Level Lens and the landing page always agree; the last
change on any page wins.

Chosen direction: **2a: level as a filter** (see
`Level Selector Explorations.dc.html`, top section). Options 1a–1d below it are
the explored alternatives and are context only.

## About the design files

The files in this bundle are **design references built in HTML**: prototypes
showing the intended look and behaviour, not production code. Recreate them in
the existing `packages/web` React + CSS Modules codebase using its patterns
(`FacetSelect`, `FilterBar`, `useBrowse`, `SearchBar`, `lib/myLevel.ts`). Don't
port the HTML.

Open `Level Selector Explorations.dc.html` in a browser (keep the sibling files
next to it). The mock is interactive: click "Your level" to reorder the grid.
**Game counts in the mock are made up.** Win/draw/loss bars don't change with
the band in the mock, but they should in the real build (see Data).

## Fidelity

**High fidelity.** The mock is built from the repo's own components and tokens
(`simplified.css`, `FacetSelect.module.css`, `SearchRow.module.css`,
`TopBar.module.css`). Match it exactly. Reuse existing components rather than
restyling.

## Screens / views

### 1. Landing: filter row (`PopularOpeningsGrid` → `FilterBar`)

**New control: "Your level"**, the first item in `FilterBar`'s `.bar`, before
Difficulty.

- Use the existing `FacetSelect` (same trigger: min-height 44px, padding 8px
  12px, `--surface-raised` bg, 1px `--color-border`, radius 8px, 13px/500 DM
  Sans, chevron 13px).
- Trigger copy: label `Your level`, value = the band's **rating range**
  (`Under 1400`, `1400–1800`, `1800–2200`, `2200+`, `Masters`) or `All levels`
  when unset/All.
  - Use ranges, not level names, on the trigger. The Difficulty facet already
    uses Beginner/Intermediate/Advanced to mean how hard an opening is, and the
    two must not read as the same thing.
- Active (band ≠ All): border `--accent-a50` (same as the other facets' `active`
  treatment if one exists; otherwise this).
- A **1px × 24px divider** (`--border-default`) after the control, separating
  "how it's ranked" from "what it's filtered to".
- **Menu** (`FacetOptionList`-style, width 280px, `--surface-overlay`, 1px
  `--border-default`, radius 12px, `--shadow-lg`):
  - One row per entry in `BANDS` (from `lib/lichessExplorer.ts`), in order,
    starting with All. Rows: min-height 44px, padding 12px 16px, 1px
    `--border-subtle` bottom divider, hover `--color-overlay-light`.
  - Row content: name (`--color-text-primary`, 500) left; range right-aligned
    (`--color-text-muted`, tabular nums; blank for All); a 15px orange check on
    the selected row.
  - Footer note, 12px, `--color-text-muted`, padding 10px 16px: **"Saved on this
    device. Opening pages use it too."**
- Mobile: add the same control as the first item in `FilterSheet`.
- **Clear filters** must NOT reset the level. It's a preference, not a filter.
  Leave it out of `activeCount`.

### 2. Landing: section heading (`PopularOpeningsGrid`)

- Unset / All: unchanged. `Popular openings` + the existing subtitle.
- Band set: h2 = `Popular at {range}` (e.g. `Popular at 1400–1800`); Masters →
  `Popular in master games`. Subtitle =
  `Ranked by games played at {range} on Lichess.` / Masters:
  `Ranked by games in the Lichess masters database.`
- Card game count (`OpeningCard` games label) shows games **at that band**.

### 3. Hero search dropdown (`SearchBar` → `.search-results-dropdown`)

- Results rank by popularity at the saved band (relevance first, then band
  popularity as the tiebreaker/boost. Keep fuzzy relevance dominant).
- New **scope line** at the top of the dropdown, above the `<ul>`: padding 14px
  16px 2px, flex space-between.
  - Left: `.label-meta` style (10px, 700, 0.1em tracking, uppercase,
    `--color-text-muted`): `Ranked for {range}` or `Ranked for all players`.
  - Right: `Change`, a 12px/500 `--color-text-secondary` text button, underline
    offset 3px, decoration `--border-hover`; hover → `--color-text-primary`.
    Opens the same band menu as the filter (anchored right) without closing the
    dropdown. Keep focus/mousedown behaviour consistent with the existing
    `onMouseDown={e => e.preventDefault()}` pattern.
- Apply the same to the mobile search overlay and the TopBar header search.

## Interactions & behaviour

- Selecting a band: `setMyLevel(id)`,
  `trackEvent('band_select', { band: id, surface: 'landing_filter' | 'search' })`,
  refetch grid, close menu. The grid keeps its other facets and its sort.
- Sort: band ranking applies when sort = `Most played`. With `A–Z`, order is
  alphabetical but the band heading and per-band game counts stay.
- **No "Clear" for level.** All is the reset, picked from the menu (matches
  LevelLens: "there is always an active level").
- Loading: reuse the grid's existing loading state. The count reads `Counting…`
  as today.
- Hover/focus: inherit FacetSelect / SearchRow states. Focus ring
  `2px solid --color-brand-orange`, offset 2px.

## State management

- **Source of truth:** `lib/myLevel.ts` (`openingbook:my-level` in
  localStorage). Add a small `useMyLevel()` hook that returns `[band, setBand]`:
  - reads `getMyLevel()` on mount;
  - writes through `setMyLevel` / `clearMyLevel`;
  - broadcasts in-tab changes (custom event, e.g.
    `window.dispatchEvent(new Event('my-level-change'))`) and listens to
    `storage` events so other tabs and other mounted components (LevelLens,
    FilterBar, SearchBar) update live.
  - Update `LevelLens` to use the hook so detail ↔ landing stay in sync with
    last-write-wins.
- **Do NOT store the band in the URL as `level`.** `useBrowse` already uses
  `?level=` for **Difficulty**. If URL sharing of the band is wanted, use
  `?band=` and have it override (not overwrite) the saved preference for that
  view. Recommended: keep it out of the URL for v1.
- `useBrowse`: accept `band` and pass `band` to `/api/openings/browse`; include
  it in the `fetchPage` deps. `useOpeningSearch`: same, for search ranking.

## Data / API

- Live Lichess explorer calls can't rank 12,000+ openings. The browse endpoint
  and the search index need **popularity per band built ahead of time** (games
  count per BANDS id, ideally W/D/L per band too) in the opening dataset.
- `/api/openings/browse?band=<BandId>`: `sort=popular` orders by that band's
  games; return that band's `games_analyzed` and win rates on each item.
- Search index: include a compact per-band popularity array per opening so
  client-side ranking works without extra requests.
- A saved band means only one band's data is requested per view, which cuts
  unnecessary calls. Detail-page explorer calls (LevelLens) continue to fetch a
  single band and can be cached per `(fen, band)`.

## Copy (exact)

- `Your level`, `All levels`, `Under 1400`, `1400–1800`, `1800–2200`, `2200+`,
  `Masters` (use BANDS' own labels/ranges if they differ. BANDS is canonical)
- Menu footer: `Saved on this device. Opening pages use it too.`
- Heading: `Popular at {range}` · `Popular in master games`
- Subtitle: `Ranked by games played at {range} on Lichess.` ·
  `Ranked by games in the Lichess masters database.`
- Search: `Ranked for {range}` · `Ranked for all players` · `Change` British
  English, sentence case, en dash in ranges.

## Design tokens used

`--surface-base #1a1816`, `--surface-raised #232120`,
`--surface-elevated #2c2a27`, `--surface-overlay #363330`,
`--color-border #2a2724`, `--border-subtle rgba(255,255,255,.06)`,
`--border-default .10`, `--border-hover .18`, `--accent-a50 rgba(232,93,4,.5)`,
`--color-brand-orange #e85d04`, `--color-text-primary #ece8e1`,
`--color-text-secondary #9a958e`, `--color-text-muted #8e887f`,
`--shadow-lg 0 8px 24px rgba(0,0,0,.35)`, radii 8px (triggers) / 12px (menus).
All exist in `styles/simplified.css`.

## Files to touch (expected)

- `lib/myLevel.ts` (+ new `hooks/useMyLevel.ts`)
- `components/filters/FilterBar.tsx`, `FilterSheet.tsx`, `FacetSelect.tsx`
  (reuse)
- `components/landing/PopularOpeningsGrid.tsx` (heading/subtitle)
- `hooks/useBrowse.ts` (band param), browse API route + dataset build script
- `components/shared/SearchBar.tsx`, `hooks/useOpeningSearch.ts`, search index
  build, mobile search overlay
- `components/detail/LevelLens.tsx` (switch to the hook)

## Files in this bundle

- `Level Selector Explorations.dc.html`: canvas. **2a** (top) is the spec, and
  1a–1d are the alternatives.
- `Landing Level.dc.html`: the landing/search mock (`variant="filter"` = 2a).
- `colors_and_type.css`, `pieces.js`, `support.js`: needed to open the mocks
  locally.

## Assets

No new assets. Board pieces are the existing `pieceSvgs.ts` set. Icons are
inline line SVGs already in the codebase (chevron, check, star).
