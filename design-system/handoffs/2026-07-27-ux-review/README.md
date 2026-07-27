# Handoff: Opening Book — Discover, Opening detail & Analyse

## Overview

A UX review and redesign of three areas of
[openingbook.xyz](https://openingbook.xyz): the **Discover** landing page, the
**Opening detail** page, and the **Analyse** flow (blank state, transient
states, and results dashboard). 29 changes across 22 screens, all documented
with the reasoning behind them.

The review found that the product's core loop — find an opening, save it, build
a repertoire — was promised on the landing page but not actually completable
there. Most changes exist to close that loop, plus a systemic consistency pass
across chrome, naming, and buttons.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes
showing intended look and behaviour, **not production code to copy directly**.
They are single-file HTML documents with inline styles, built to be read and
compared, not shipped.

The task is to **recreate these designs in the existing codebase**
(`Freddiekinns/chess-opening-explorer`, a React + Vite app with CSS modules)
using its established patterns: the token system in
`packages/web/src/styles/simplified.css`, existing components in
`packages/web/src/components/`, and the CSS-module convention already in use. Do
not port the inline styles — map them to the existing custom properties, which
are listed under **Design tokens** below and already exist in the codebase.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, and copy. Every value in
the mocks maps to an existing design token. Recreate the UI faithfully using the
codebase's existing components and token names rather than the literal hex
values in the HTML.

Two caveats:

- The mocks show **desktop (1200px content) and mobile (414px)** only. No tablet
  breakpoint was designed — see _Not covered_.
- Every screen shows the **maximal case** (opening has videos, studies, master
  games). See _Graceful degradation_.

## Files in this bundle

| File                                   | What it is                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Opening Book - Proposed.dc.html`      | **The design.** 22 screens in journey order. The primary reference.                                                                         |
| `Opening Book - Current.dc.html`       | The live product recreated in the same order, for diffing.                                                                                  |
| `Opening Book - Change log.dc.html`    | **The build spec.** 29 changes grouped by area, each with what changed and why. Includes a "For the build" section of implementation notes. |
| `Opening Book - Design review.dc.html` | The 14 audit findings and their fixes — the rationale behind the change log.                                                                |
| `support.js`                           | Runtime required to open the four HTML files. Keep it alongside them.                                                                       |

Open `Opening Book - Proposed.dc.html` in a browser. Each screen has a stable
anchor id (e.g. `#detail-desktop`) that the change log links to.

## Screens

22 screens across five groups. Anchor ids in brackets.

### 01 · Discover (2)

- **Discover — desktop** `#discover-desktop` — the landing page at rest.
- **Discover — mobile** `#discover-mobile` — same, 414px.

### 01b · Discover states (5)

- **Search focused — desktop** `#discover-search-desktop` — dropdown showing
  recent and repertoire.
- **Search hub — mobile** `#discover-search-mobile`
- **Search results — mobile** `#discover-results-mobile`
- **No results — mobile** `#discover-empty-mobile`
- **Filters sheet — mobile** `#discover-filters-mobile`
- **Filter bar, active facets — desktop** `#discover-filterbar`

### 02 · Repertoire (4)

- **Repertoire populated — desktop** `#repertoire-desktop` — horizontal card
  scroller with mini boards, replaces the empty prompt.
- **Just saved — mobile** `#repertoire-saved-mobile` — star tapped, toast shown.
- **Repertoire tab, populated — mobile** `#saved-tab-mobile`
- **Repertoire tab, empty — mobile** `#saved-tab-empty-mobile`

### 03 · Opening detail (2)

- **Opening detail — desktop** `#detail-desktop` — two-column, board sticky.
- **Opening detail — mobile** `#detail-mobile`

### 04 · Analyse (7)

- **Analyse blank — desktop / mobile** `#analyse-desktop` `#analyse-mobile`
- **Analysing — desktop / mobile** `#analysing-desktop` `#analysing-mobile`
- **Error — desktop / mobile** `#error-desktop` `#error-mobile`

### 05 · Analyse dashboard (2)

- **Dashboard — desktop** `#dashboard-desktop`
- **Dashboard — mobile** `#dashboard-mobile`

## Key changes to implement

Full detail in `Opening Book - Change log.dc.html`. The load-bearing ones:

### Discover

1. **One primary action in the hero.** Search is the only prominent element.
   "Surprise me" and "Search by pasting PGN" become quiet links beneath it,
   Surprise first.
2. **First run leads with content.** The dashed empty-repertoire box becomes a
   one-line prompt so Popular openings sits above the fold on a first visit.
3. **Four mobile tabs**: Discover · Search · Saved · Analyse (was two).
4. **Star on every card header** — quiet at rest, orange when saved. Saving no
   longer requires opening a detail page first. This is the change that closes
   the core loop.
5. **Repertoire row populated** — horizontal scroller of repertoire cards with
   mini boards once anything is saved.

### Opening detail

6. **The level filter governs the opening explorer card only** — never the
   master games list. This was the source of the confusion; master games don't
   respond to the filter, so they move full-width _below_ the filtered surface.
7. **The filter sits at the edge of the data surface it controls**, merged into
   the explorer card header, so the boundary of its effect is visible.
8. **Every reveal is labelled with its payload** ("Show 12 more moves", not
   "Show more").
9. **The board is sticky while the right rail scrolls** — already the
   design-system rule for this layout, but never shown in a mock. Demonstrated
   live in the desktop screen.
10. Renamed "opening book" → **"Opening explorer"** to match Lichess
    terminology, which the underlying data comes from.

### Analyse

11. **Blank state gets a scope line and a sample report.** "Reads your public
    rated games — rapid, blitz & classical. Bullet excluded. Nothing is stored."
    Plus "See a sample report — Magnus · Hikaru", which loads a real GM's
    analysis so the output is visible before committing a username.
12. **Analysing and error states designed** — both were previously undrawn.
13. Dashboard: **"Your record" / "This analysis"** labelling to separate the two
    data scopes.

### Systemic (applies everywhere)

14. **Buttons**: filled, 8px radius, one spec. No mixed outline/filled at the
    same level.
15. **Chrome unified**: 60px desktop top bar, 56px mobile app bar, 240px search
    field.
16. **One name for the feature**: "Your repertoire" for headings, "Repertoire"
    for the tab and app bar, "Added to your repertoire" for the toast. The live
    product's "My repertoire" is **renamed** — second person matches the
    system's voice rule for personal features.
17. **Sentence case** throughout, British spelling (analyse, colour, practise).
18. **Dead links removed**: "View repertoire", "View all", and "Edit" all
    pointed at screens that don't exist.

## Interactions & behaviour

- **Enter submits** the Analyse form. Platform defaults to Chess.com and
  persists from last visit. Analyse stays disabled until a username is entered.
- **Filter state survives back-navigation** from a detail page.
- **Level filter on opening detail** governs the explorer card only.
- **Star** toggles save immediately, no confirmation dialog; the toast is the
  feedback. (Detail-page star confirmation is undesigned — see _Not covered_.)
- **Board sticky** on opening detail desktop; releases when the right rail's
  scroll ends.
- **Repertoire sort** is fixed: most recently saved first. **No manual
  reordering.**
- **Motion**: cards fade up on mount (`cardSlideIn`, opacity 0→1 + translateY
  20px→0, 500ms ease-out, 100ms stagger up to ~12 children). Repertoire row uses
  `sectionReveal` (350ms delay, 400ms ease-out). Hover lifts cards
  `translateY(-2px)`, buttons `-1px`. Honour `prefers-reduced-motion`.

## Graceful degradation

The **sparse opening** — no videos, no studies, few master games — is
deliberately not drawn, because the layout degrades on its own. Each block on
the detail page is independent: **an empty block is omitted, not shown empty**,
and the remaining blocks close up. **Do not add empty-state cards for missing
sections.** Most of the 12,377 openings are sparse, so this is the common case,
not an edge case.

## Repertoire model

There is **no separate repertoire page on desktop** — the row on Discover _is_
the repertoire, which is why "View all" was removed. Mobile keeps its Repertoire
tab. Revisit if saved counts grow past what one row can reasonably hold.

## Accessibility

- Real `<label>` on the username input, not placeholder-only.
- Platform toggle as a radio group, not two buttons.
- Star buttons need an accessible name and `aria-pressed`.
- Orange focus outline on every control,
  `outline: 2px solid var(--color-brand-orange); outline-offset: 2px`. Never the
  browser default.
- Mobile hit targets ≥44px.

## New strings to ship

These are copy, not just layout: the Analyse hero subtitle; "Reads your public
rated games — rapid, blitz & classical. Bullet excluded. Nothing is stored.";
"Your record" / "This analysis"; "Opening explorer"; the labelled reveal
buttons; the facet labels Level · Style · Family · Sort.

## Design tokens

All already defined in `packages/web/src/styles/simplified.css`. Use the token
names, not the hex values.

**Surfaces** — `--surface-base #1a1816` (page) · `--surface-raised #232120`
(cards, panels) · `--surface-elevated #2c2a27` (topbar, popovers) ·
`--surface-overlay #363330` (hover on raised)

**Accent** — `--color-brand-orange #e85d04` ·
`--color-brand-orange-hover #f17a2f` · opacity scale `--accent-a6` →
`--accent-a50`

Orange is reserved for primary CTAs, active nav, the star, and the word "Book"
in the hero. Not for hover, emphasis, data values, or decoration.

**Text** — `--color-text-primary #ece8e1` · `--color-text-secondary #9a958e` ·
`--color-text-muted #8e887f` · `--color-text-inverse #100f0e`

**Result colours** (all win/draw/loss data viz) — `--color-result-white #d4cfc7`
· `--color-result-draw #5a554e` · `--color-result-black #c08840`. Never
substitute generic chart colours.

**Type** — Display: Bricolage Grotesque 700/800 (hero, page titles, section
headings). Body: DM Sans 400/500/700. Mono: SFMono/Monaco/Consolas (ECO codes,
FEN, move notation). Composite shorthands `--heading-hero` `--heading-page`
`--heading-section` `--heading-subsection` `--heading-card`. `.label-meta` =
10px / 0.1em tracking / uppercase / muted, used as section sub-header.

**Spacing** — `--space-0-5` (2px) → `--space-16` (64px). `--space-4` (16px)
default component padding, `--space-6` (24px) default section gap.

**Radii** — `--radius-sm 4px` (badges, pills) · `--radius-md 8px` (default:
buttons, inputs, cards) · `--radius-lg 12px` · `--radius-xl 16px` (modals,
chessboard section) · `--radius-full`

**Shadows** — `--shadow-sm` resting cards · `--shadow-md` hover · `--shadow-lg`
chessboard, popovers · `--shadow-brand` primary button hover

**Borders** — `--color-border #2a2724` solid · translucent scale
`--border-subtle 6%` / `--border-default 10%` / `--border-hover 18%` /
`--border-strong 25%`

**Transitions** — `--transition-fast 0.12s ease` · `--transition-base 0.2s ease`
· `--transition-slow 0.35s ease`

**Layout** — TopBar sticky 60px, `--surface-elevated`, grid `1fr auto 1fr` so
nav stays centred. Mobile tab bar 60px (`--bottom-tab-bar-height`). Detail page
`grid-template-columns: 7fr 5fr; max-width: 1400px; gap: var(--space-6)`, left
column sticky.

## Assets

No new assets. Icons are inline SVG at 1.5–2px stroke, drawn per-component — the
codebase uses no icon font, sprite, or library, and this review adds none. Where
a needed glyph didn't exist, [Lucide](https://lucide.dev/) at 1.5px stroke was
used as a tonal match; substitute with a hand-drawn equivalent or keep Lucide,
but note it's not currently a project dependency.

Logo is `assets/opening-book-icon.png`, already in the repo.

## Not covered by this review

Tablet breakpoints · the practice-mode flow · sign-in · the desktop
search-results state · save confirmation on the detail-page star.

Practice appears as a **secondary** (outlined) button on the opening detail
page. It was briefly made primary and reverted — the functionality isn't fleshed
out, so it shouldn't carry primary weight until it is.
