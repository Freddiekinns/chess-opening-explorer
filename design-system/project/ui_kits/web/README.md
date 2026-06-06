# Opening Book — Web UI Kit

Pixel-fidelity recreation of the openingbook.xyz landing experience, faithful to
`Freddiekinns/chess-opening-explorer` (`packages/web/`).

## Components

- `MiniBoard.jsx` — schematic 8×8 chessboard themed in `--color-result-white` /
  dark warm-grey, renders pre-baked positions (`caro-kann`, `sicilian`,
  `london`, …) as unicode glyphs.
- `TopBar.jsx` — sticky 60px header. Grid `1fr auto 1fr` so nav stays centred.
  Logo · Explore/Analyse nav with orange active underline · search input ·
  "Surprise me" CTA.
- `Hero.jsx` — landing hero with the _Opening Book_ lockup (orange-on-"Book"),
  one-sentence subtitle, centred large search field with the warm-orange wash,
  and the "Search by pasting PGN" link.
- `RepertoireRow.jsx` — horizontally-scrolling row of saved openings; mini-board
  on top, name + ECO + complexity below; star toggles save state. Empty state
  matches the live product.
- `OpeningCard.jsx` — grid card with mini-board, ECO + complexity pills,
  win/draw/loss bar themed in the result palette, and the orange-bordered hover
  state with the gradient accent line at the top.

## What's interactive

- Search filters the grid live (top-bar + hero searches both).
- Star toggles save state and surfaces a toast.
- "Surprise me" picks a random opening and toasts its name.
- "Explore / Analyse" tabs switch active state in the header.

## Pieces are unicode glyphs

The original repo uses `react-chessboard` with SVG piece sets that aren't in the
repo as standalone assets. To stay faithful without inventing new SVGs, this kit
renders board pieces as Unicode chess glyphs (`♟ ♜ ♞ ♝ ♛ ♚`). **Flagged
substitution** — replace `MiniBoard.jsx` with `react-chessboard` (or a real
piece-set sprite) in production.
