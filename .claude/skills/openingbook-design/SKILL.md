---
name: openingbook-design
description:
  Design guidance and brand assets for Opening Book (openingbook.xyz, the chess
  opening explorer). Use for any visual work — new components, layout changes,
  colour or type decisions, mocks and prototypes, or reviewing whether a surface
  is on-brand. The system is "Warm Editorial Dark". Contains tokens, type,
  fonts, assets, HTML prototypes and a React UI kit.
---

# Opening Book design system

"Warm Editorial Dark" — a chess reference book viewed under warm lamplight, not
a cold SaaS dashboard. Orange is a bookmark ribbon: CTAs, the active nav state,
the star icon, and the single word "Book" in the hero. Never use it for
emphasis, hover, decoration, or backgrounds.

## References, in order of fidelity

The prototypes are higher-fidelity than any description — read them before
inventing a layout.

- `design-system/project/colors_and_type.css` — the token system (surfaces,
  accent + opacity scale, warm off-white text, result colours, type, spacing,
  radii, shadows, transitions). Import and use the variables; never hardcode
  hex.
- `design-system/project/ui_kits/web/` — pixel-fidelity React recreations of the
  live landing app (TopBar, Hero, OpeningCard, RepertoireRow, MiniBoard).
- `design-system/project/preview/*.html` — reference cards for every token
  group.
- `design-system/project/assets/opening-book-icon.png` — the
  pawn-on-an-open-book mark.
- `design-system/chats/` — transcripts from the Claude Design sessions that
  produced the system. Useful when you need to know _why_ something is the way
  it is; not required reading for routine work.

Production tokens live in `packages/web/src/styles/simplified.css` and **must
stay in sync** with `colors_and_type.css`. Update both in the same commit.

## Hard rules

- British English (analyse, colour, practise as a verb).
- Sentence case for headings, labels, buttons. Title Case only for proper nouns
  and ECO codes.
- No emoji. No unicode decoration. SVG icons at 1.5–2px stroke (Lucide is an
  acceptable substitution — flag it when you use it).
- No gradients except the hero
  (`linear-gradient(145deg, surface-raised, surface-base)`) and the
  landing-search wash.
- Never colour-shift to orange on hover. Card hover: orange border + 1px ring +
  lift -2px. Text hover: secondary → primary.
- Result colours (`#d4cfc7` / `#5a554e` / `#c08840`) are mandatory for
  perspective-based win/draw/loss — White wins / draw / Black wins in opening
  statistics. For a player's _own_ results (the Analyse dashboard W/D/L), use
  the personal-performance tokens `--color-perf-*` (sage win, warm-grey draw,
  muted-brick loss); loss is deliberately dimmer than win so bad results recede.
  Never substitute a generic chart palette for either.

## Working practice

For throwaway visuals (slides, mocks, prototypes), copy assets out and produce
static HTML the user can open. For production code, apply the tokens directly
and follow `packages/web/AGENTS.md` for CSS Modules.

When you add a component or visual surface, add a preview card under
`design-system/project/preview/` in the same change, and a kit file under
`ui_kits/web/` if it's substantial.
