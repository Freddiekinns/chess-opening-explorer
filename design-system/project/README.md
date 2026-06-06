# Opening Book — Design System

A design system for **Opening Book**
([openingbook.xyz](https://openingbook.xyz)) — a chess opening explorer that
lets players discover, study, and practise 12,000+ openings backed by Lichess
statistics, curated Lichess studies, and AI-generated strategic analysis.

The product calls its visual language **"Warm Editorial Dark"** — a chess
reference book viewed under warm lamplight rather than under a cold monitor
glow.

## Index

- `colors_and_type.css` — design tokens (palette, type, spacing, radii, shadows,
  transitions) and semantic helpers (`.h1`, `.body`, `.label-meta`,
  `.btn--primary`, …)
- `fonts/` — webfonts (Bricolage Grotesque, DM Sans). If absent, see Google
  Fonts link in `colors_and_type.css`.
- `assets/` — logos, icons, mark + product imagery
- `preview/` — small HTML cards that populate the Design System tab (one concept
  per card)
- `ui_kits/web/` — pixel-fidelity recreations of the Opening Book web app
  (landing hero, search bar, opening grid, repertoire row, top bar, footer)
- `SKILL.md` — agent skill file so this system can be used inside Claude Code as
  `/skill openingbook-design`

## Sources

This system was reverse-engineered from one repo:
**[Freddiekinns/chess-opening-explorer](https://github.com/Freddiekinns/chess-opening-explorer)**
(the openingbook.xyz codebase).

Key files referenced:

- `packages/web/src/styles/simplified.css` (~3,250 lines, the canonical "Warm
  Editorial Dark" token system + global components)
- `packages/web/src/components/layout/TopBar.{tsx,module.css}` — sticky 60px
  topbar with desktop search + Surprise me CTA
- `packages/web/src/components/landing/RepertoireSection.{tsx,module.css}` —
  saved-opening cards with mini chessboards
- `packages/web/src/pages/LandingPage.tsx` — hero with
  `Opening <span>Book</span>` accent
- `packages/web/index.html` — Bricolage Grotesque + DM Sans loaded from Google
  Fonts; favicon at `opening-book-icon.png`

The design tokens here are taken **verbatim** from `simplified.css` so anything
built with this system stays drift-free with the live product.

---

## Content fundamentals

The product positions itself as a calm, _editorial_ reference — closer to a
chess book than a SaaS dashboard.

**Tone:** confident, declarative, chess-literate. Never marketing-cute, never
breathless. The hero subtitle is one sentence and ends in a full stop:
_"Discover, explore and learn chess openings."_

**Voice:** second-person ("your style", "your repertoire") for personal
features; third-person/feature-noun ("Practice Mode", "PGN Identification") for
capabilities. Never "I" or "we".

**Casing:** sentence case for headings, labels, and buttons (e.g. _"My
repertoire"_, _"Search by pasting PGN"_, _"Surprise me"_). Title Case is
reserved for proper nouns (_Opening Book_, _Caro–Kann Defence_, _London System_)
and ECO codes (`A00`, `B12`).

**Spelling:** British English — _analyse_, _colour_, _practise_ (verb) — see the
codebase's `AnalyseGamesPage.tsx`. Match this when writing copy.

**Number formatting:** numerals always, plus comma thousand-separators ("12,377+
openings", "40M+ Lichess games", "6,100+ study chapters"). Stats lead with the
count, then the noun.

**Specific examples lifted from the live product:**

- Hero: _"Opening **Book**" / "Discover, explore and learn chess openings."_
- Search placeholder: _"Search variations, ECO codes, or systems..."_
- PGN link: _"Search by pasting PGN"_
- Repertoire empty: _"No openings saved yet. Tap the star on any opening to save
  it to your repertoire for quick access."_
- CTA: _"Surprise me"_ (orange button, top-right)

**Emoji / unicode:** never. The brand has zero emoji and avoids unicode glyphs
as decoration. Iconography is line SVG (1.5–2px stroke) drawn or imported as
code; star ★ is the one place a filled glyph appears (in `StarButton`).

**Density:** copy is sparse. Sections lead with a 1–3 word title (_"My
repertoire"_, _"Popular openings"_, _"By style"_) and let the content speak.
Avoid taglines, sub-subtitles, or marketing prose around components.

---

## Visual foundations

The system has one rule that governs everything: **orange is a bookmark ribbon,
not wallpaper.** It is reserved for primary CTAs, the active nav state, the star
icon, and the single word "Book" in the hero — and that's it. Hover states,
emphasised text, data values, decorative borders, and section accents all use
neutral warm tones.

### Foundation

- **Surface system** — four warm-dark layers, each a distinct elevation step:
  - `--surface-base #1a1816` — page background
  - `--surface-raised #232120` — cards, panels, sidebar
  - `--surface-elevated #2c2a27` — popovers, dropdowns, the topbar
  - `--surface-overlay #363330` — hover states on raised surfaces, subtle
    highlights Backgrounds carry a subtle warm cast (#1a vs cold #1e); the
    system explicitly avoids cold grey.
- **Accent** — `--color-brand-orange #e85d04`, hover `#f17a2f`. Plus an opacity
  scale (`--accent-a6` → `--accent-a50`) used for ghost tints, focus rings, and
  shadow glows.
- **Text** — warm off-whites, never pure white. `#ece8e1` primary, `#9a958e`
  secondary, `#8e887f` muted, `#100f0e` inverse (text-on-orange).
- **Result colours** (chess-thematic data viz, used everywhere win/draw/loss is
  displayed): `--color-result-white #d4cfc7` (cream — white wins),
  `--color-result-draw #5a554e` (warm grey — draws),
  `--color-result-black #c08840` (amber — black wins). These MUST be used; never
  hardcode generic chart colours.

### Type

- **Display:** Bricolage Grotesque, weights 700/800. Used for hero, page titles,
  section headings — quirky but disciplined.
- **Body:** DM Sans, weights 400/500/700. Used for body, UI, buttons.
- **Mono:** SFMono / Monaco / Consolas system stack. Used for ECO codes, FEN
  strings, move notation.
- Hero is `clamp(36px, 6vw, 64px)` extra-bold, tracking `-0.02em`.
- The `.label-meta` utility — 10px, 0.1em tracked, uppercase, muted — is used as
  a section sub-header throughout.
- Composite shorthands `--heading-hero`, `--heading-page`, `--heading-section`,
  `--heading-subsection`, `--heading-card` enforce rhythm across pages.

### Spacing & rhythm

- Extended spacing scale: `--space-0-5` (2px) → `--space-16` (64px), with
  half-steps (1.5, 2.5) for tight inner padding.
- `--space-4` (16px) is the default component padding, `--space-6` (24px) the
  default section gap.
- Layout maxes at 1200–1400px; landing/detail content is centred with
  `max-width: 1400px`.

### Radii

`--radius-sm 4px` (badges, pills) · `--radius-md 8px` (default — buttons,
inputs, cards) · `--radius-lg 12px` (large cards) · `--radius-xl 16px` (modals,
the chessboard section) · `--radius-full 9999px` (pill toggles).

### Shadows

A defined elevation system — never hardcode `box-shadow`:

- `--shadow-sm 0 1px 2px rgba(0,0,0,0.2)` — resting cards
- `--shadow-md 0 4px 12px rgba(0,0,0,0.25)` — hover cards
- `--shadow-lg 0 8px 24px rgba(0,0,0,0.35)` — the chessboard section, popovers
- `--shadow-brand 0 4px 12px var(--accent-a30)` — primary button hover
- `--shadow-brand-lg 0 6px 20px rgba(232,93,4,0.35)` — emphasis

### Borders

- `--color-border #2a2724` solid, plus a translucent scale:
  `--border-subtle 6%`, `--border-default 10%`, `--border-hover 18%`,
  `--border-strong 25%`. Subtle 1px `rgba(255,255,255,0.06)` is the most common
  divider.

### Transitions & motion

- `--transition-fast 0.12s ease`, `--transition-base 0.2s ease`,
  `--transition-slow 0.35s ease`.
- Cards fade up on mount (`@keyframes cardSlideIn` — opacity 0→1, translateY
  20px→0, 500ms ease-out, staggered 100ms per child up to ~12).
- The repertoire row uses `sectionReveal` (350ms delay, 400ms ease-out).
- Hover states are gentle: cards lift `translateY(-2px)`, buttons lift `-1px`.
  No bounce, no springs.
- Accordions use `cubic-bezier(0.4, 0, 0.2, 1)` for icon rotations.
- Honours `prefers-reduced-motion`: animations are disabled in the global media
  query.

### Hover & press states

- **Hover on cards/items:** border switches from `--color-border` →
  `--color-brand-orange`, a 1px `--accent-a12` ring appears, background lifts
  from `--surface-raised` → `--surface-overlay`, plus a 2px upward translate.
- **Hover on links/text:** colour darkens from secondary → primary; never a
  colour shift to orange (orange = action, not emphasis).
- **Hover on primary button:** background `--color-brand-orange` →
  `--color-brand-orange-hover`, plus `--shadow-brand`, plus 1px lift.
- **Press:** chess board navigation buttons use `transform: scale(0.9)` on
  `:active`; otherwise no specific press treatment — the hover state's lift is
  dropped on press.
- **Focus:** always `outline: 2px solid var(--color-brand-orange)` with
  `outline-offset: 2px`. Never relies on browser default focus rings.

### Backgrounds

- The hero uses a soft linear gradient
  `linear-gradient(145deg, var(--surface-raised) 0%, var(--surface-base) 100%)`
  with a subtle `--accent-a20` bottom border. This is the **only** gradient in
  the system — every other surface is a flat colour.
- Landing-variant search input has a near-invisible orange wash:
  `linear-gradient(145deg, var(--accent-a6) 0%, transparent 100%)`.
- No images, patterns, textures, or full-bleed photography. The single brand
  image is the pawn-on-an-open-book logo (`assets/opening-book-icon.png`).

### Cards

- Resting: `--surface-raised` background, `1px solid --color-border`,
  `--radius-md`, `--shadow-sm`, `--space-6` padding (cards) or `--space-4`
  (panels).
- Hover: orange border, `--shadow-md`, lifted, plus the rare decorative flourish
  — a 3px gradient bar
  `linear-gradient(white-result, draw-result, black-result)` revealed at the top
  edge (the only place "decorative" colour appears).
- Cards with embedded mini chessboards (`.opening-card.has-board`) zero their
  padding and put the board in a `card-board-wrapper` with
  `--radius-md --radius-md 0 0`.

### Pills, badges, tags

- ECO pill: `--surface-overlay` background, mono font, semibold, 11–12px,
  slightly muted text. The technical-identifier flavour.
- Style pill: `--accent-a6` background, muted text, very low-key — used for tags
  like _aggressive_, _positional_.
- Complexity pills: tinted by level — green/amber/red/violet at 15% opacity
  backgrounds with 25% opacity borders. The exception that proves the "no other
  accent colours" rule, scoped strictly to the complexity-tag namespace.

### Layout rules

- The TopBar is sticky, 60px tall, `--surface-elevated`, with a 1px
  `--border-subtle` bottom edge. CSS grid `1fr auto 1fr` so nav stays
  dead-centre regardless of right-slot content.
- The BottomTabBar (mobile) reserves `--bottom-tab-bar-height: 60px` of body
  padding.
- Two-column detail layout is
  `grid-template-columns: 7fr 5fr; max-width: 1400px; gap: var(--space-6)`. The
  left column (chessboard + moves) is sticky.

### Transparency & blur

- The system uses **opacity scales** (`rgba(255,255,255,0.06|0.10|0.18|0.25)`
  for borders; `rgba(232,93,4,0.06|0.12|0.20|0.30|0.50)` for accent) but does
  **not** use `backdrop-filter: blur`. Surfaces are opaque.

### Imagery vibe

- Other than the logo, there is no imagery. If imagery were added, it should
  match the warm-dark editorial mood: warm, slightly desaturated, no cold blues.
  Chessboards are themed `--color-result-white #d4cfc7` and `#665e54`
  (cream/dark warm-grey) rather than the default green/cream Lichess scheme.

---

## Iconography

**Approach:** inline SVG icons, drawn directly in components. Stroke icons are
1.5–2px wide; the dominant style is _thin-line monoline_ (e.g. the empty-state
star in `RepertoireSection.tsx`). The codebase does **not** use an icon font, an
SVG sprite, or a third-party icon library. Each icon lives next to the component
that needs it.

**Filled vs stroke:** stroke is the default; filled is reserved for state-on
(e.g. `StarButton` filled = saved to repertoire, in brand orange).

**Logo:** `assets/opening-book-icon.png` — a stylised orange pawn standing on an
open book, on the warm-dark background. Used as favicon, apple-touch-icon, and
as the social card image. There is no SVG version in the repo; the PNG is the
canonical asset.

**Emoji / unicode glyphs:** none. Use SVG or text. The one allowed glyph is `★`
inside the `StarButton`, but even that is rendered via SVG in the source.

**Iconography substitution policy for this design system:** when prototyping
with this system and a needed glyph isn't already in the repo, use
**[Lucide](https://lucide.dev/)** at 1.5px stroke as a near-perfect tonal match
(Lucide's geometry and stroke weight align with the existing hand-drawn icons).
Flag any Lucide use as a substitution in design comments. The product does not
currently link Lucide from CDN — that is a system-only convention.

---

## Font substitution flag

`Bricolage Grotesque` and `DM Sans` are loaded from Google Fonts in production
(`packages/web/index.html`). This design system links them from the same Google
Fonts CSS by default and does **not** ship local TTF/WOFF files. If you need
fully offline fonts, download the official families from
[fonts.google.com/specimen/Bricolage+Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque)
and
[fonts.google.com/specimen/DM+Sans](https://fonts.google.com/specimen/DM+Sans)
and drop them in `fonts/`.
