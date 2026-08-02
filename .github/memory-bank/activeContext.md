# Active Context

**Date:** 2026-08-02

## Current Task: Analyse summary cards read as one row (`claude/player-details-layout-qxa1mo`)

**Phase 5's decision §3 reversed** — "the record card keeps its existing layout,
`.statsRows` is already the mock's structure". Structure was never the
complaint: the card sat in an equal-height grid with its figures at the top-left
over ~40% dead space, and it was the only card in the row with no bar, so the
row had no bottom edge.

- **Composition.** Figures bottom-anchored (`margin-top: auto`) across three
  full-width columns, win left / draw centre / loss right — the bar's own
  geometry, and PerfBar's legend arrangement.
- **The dead space, measured.** 54px of a 228px card beside a two-line opening
  name — but the opening cards carry 51px in the same band, so it was never
  unique to the record card. Its upper block was two lines against their four,
  so a third line closes it: the overall win rate, the only rate on the panel
  with a sample behind it (the headline cards read 100% off four games).
- **The tints are load-bearing.** Equal-width columns cannot line up with
  proportional segments, so colour is the only thing tying a count to its band.
  Draws move off primary cream — brightest number, least interesting fact.
- **Four disagreements between rules drawn in different places**, which is what
  "the fonts are all off" meant: bar height 6px vs 8px, headline 22px vs 20px,
  tracked-uppercase "WINS" one card-width from sentence-case "win rate", a 3px
  sage border on the mobile Wins tile alone.
- **"Your record" now counts every decided game.** W/D/L were tallied inside the
  classified branch, so a real result with an unrecognised opening vanished from
  the record while the header still counted the game as analysed. Latent before;
  a stated rate makes it checkable. `whiteGames`/`blackGames` stay matched-only
  — they label the lists, so they must equal the rows beneath.
- **Left alone on the owner's call**: the opening cards keep their single-fill
  rate bars; mobile keeps three tiles (it does carry the rate on its scope line
  — parity of information, not layout); `MIN_CARD_GAMES` stays 4, since at
  variation level a floor of 8 often qualifies nothing and `findBestOpening`
  then falls back to an unfiltered `list[0]`.
- Guards assert the _agreements_ — bar heights across two files, the bottom
  anchor, one label treatment — each verified failing on the old values.

## Previous Task: Practice drops to accent-outline (`ux/phase-5-analyse`)

Filled orange → orange border + orange label, both breakpoints. A spec decision
reversed on the owner's call: §3 argued from implementation completeness, a
different question from how much attention a feature has earned. Named the third
button tier (primary · accent-outline · secondary · tertiary); fixed proportion
(desktop 11px inside 24px padding vs mobile 13px → both 13px, min-height 44px).
Guard rewritten to assert the halves agree rather than to pin the fill. §3.4.
