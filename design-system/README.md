# Opening Book design system

Canonical reference for the **Warm Editorial Dark** brand. Originally exported
from [Claude Design](https://claude.ai/design); maintained here as the source of
truth for visual work.

**Start with the `openingbook-design` skill**
(`.claude/skills/openingbook-design/`) — it carries the hard rules and points
back into this bundle. This README describes what's in the bundle and how to
keep it current.

## Contents

| Path                          | What it is                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `project/colors_and_type.css` | The token system — surfaces, accent scale, text, result colours, type, spacing, radii, shadows                 |
| `project/ui_kits/web/`        | Pixel-fidelity React recreations of the live landing app (TopBar, Hero, OpeningCard, RepertoireRow, MiniBoard) |
| `project/preview/`            | Small HTML reference cards, one per token group                                                                |
| `project/assets/`             | Brand assets, including the pawn-on-an-open-book mark                                                          |
| `project/explorations/`       | Design alternatives that weren't shipped                                                                       |
| `project/uploads/`            | Source material from design sessions                                                                           |
| `chats/`                      | Transcripts of the Claude Design sessions that produced the system                                             |

The HTML and React files are **prototypes, not production code**. Match their
visual output; don't copy their internal structure unless it happens to fit.
They are higher fidelity than any written description — read them before
inventing a layout.

The transcripts are useful when you need to know _why_ a decision was made. They
are not required reading before routine visual work.

## Token sync

Tokens exist in two places that must stay identical:

- `packages/web/src/styles/simplified.css` — the runtime source, what production
  imports
- `design-system/project/colors_and_type.css` — the reference and Claude Design
  handoff format

Change both in the same commit. A drift between them is invisible until
something renders the wrong colour.

## Maintenance

When you add a component or visual surface:

1. Add a preview card under `project/preview/`
2. Add a kit file under `project/ui_kits/web/` if it's substantial
3. Update the skill if a hard rule changed

New Claude Design session: drop the transcript into `chats/`.
