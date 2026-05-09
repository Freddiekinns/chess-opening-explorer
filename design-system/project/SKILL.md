---
name: openingbook-design
description:
  Use this skill to generate well-branded interfaces and assets for Opening Book
  (openingbook.xyz, the chess opening explorer), either for production or
  throwaway prototypes/mocks/etc. Contains essential design guidelines, colors,
  type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available
files. The system is "Warm Editorial Dark" — a chess reference book viewed under
warm lamplight, NOT a cold SaaS dashboard. Orange is a bookmark ribbon (CTAs,
the active nav state, the star icon, and the single word "Book" in the hero) —
never use it for emphasis, hover, decoration, or backgrounds.

Key files:

- `colors_and_type.css` — token system (surfaces, accent + opacity scale, warm
  off-white text, result-colour palette, type, spacing, radii, shadows,
  transitions). Import this and use the variables directly; do not hardcode hex
  values.
- `assets/opening-book-icon.png` — the pawn-on-an-open-book mark.
- `ui_kits/web/` — pixel-fidelity React recreations of the live landing app
  (TopBar, Hero, OpeningCard, RepertoireRow, MiniBoard).
- `preview/*.html` — small reference cards for every token group.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy
assets out and create static HTML files for the user to view. If working on
production code, you can copy assets and read the rules here to become an expert
in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.

Hard rules:

- British English (analyse, colour, practise as verb).
- Sentence case for headings, labels, buttons. Title Case only for proper nouns
  / ECO codes.
- No emoji. No unicode decoration. SVG icons at 1.5–2px stroke (Lucide is an
  acceptable substitution — flag it).
- No gradients except the hero
  (`linear-gradient(145deg, surface-raised, surface-base)`) and the
  landing-search wash.
- Never colour-shift to orange on hover. Hover on cards: orange border + 1px
  ring + lift -2px. Hover on text: secondary → primary.
- Result colours (`#d4cfc7` / `#5a554e` / `#c08840`) are mandatory for
  win/draw/loss; do not substitute generic chart palettes.
