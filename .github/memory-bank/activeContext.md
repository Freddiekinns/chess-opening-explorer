# Active Context

**Date:** 2026-08-02

## Current Task: Analyse summary cards read as one row (`claude/player-details-layout-qxa1mo`)

**Phase 5's decision §3 reversed** — "the record card keeps its existing
layout". Structure was never the complaint: the card sat in an equal-height grid
with its figures at the top-left over ~40% dead space, and it was the only card
in the row with no bar, so the row had no bottom edge.

- **Composition.** Figures bottom-anchored (`margin-top: auto`) across three
  full-width columns, win left / draw centre / loss right — the bar's own
  geometry, and PerfBar's legend arrangement.
- **The dead space, measured.** 54px of a 228px card — but the opening cards
  carry 51px in the same band, so it was never unique to the record card. Its
  upper block was two lines against their four, so a third line closes it: the
  overall win rate, the only rate on the panel with a sample behind it.
- **The tints are load-bearing.** Equal-width columns cannot align with
  proportional segments, so colour is the only thing tying a count to its band.
  Draws move off primary cream — brightest number, least interesting fact.
- **Four disagreements between rules drawn in different places** (what "the
  fonts are all off" meant): bar height 6 vs 8px, headline 22 vs 20px, tracked
  "WINS" beside sentence-case "win rate", a sage border on the Wins tile alone.
- **"Your record" now counts every decided game.** W/D/L were tallied inside the
  classified branch, so a real result with an unrecognised opening vanished from
  the record while the header still counted it. `whiteGames`/`blackGames` stay
  matched-only — they label the lists, so they must equal the rows beneath.
- **Left alone on the owner's call**: opening cards keep single-fill rate bars;
  mobile keeps three tiles (but carries the rate on its scope line — parity of
  information, not layout); `MIN_CARD_GAMES` stays 4, since at variation level a
  floor of 8 often qualifies nothing and `findBestOpening` then falls back to an
  unfiltered `list[0]`. Guards assert the _agreements_, each verified failing.

## Previous Task: The empty repertoire slot gets its box back (`ux/phase-5-analyse`)

**A handoff divergence with no recorded reason.** The mock draws Discover's
empty state as a bordered one-line bar with a 16px outline star; the build
shipped a bare sentence. Change 03 justified _height_ (a ~180px dashed panel →
~40px) while keeping the container — "one-line prompt" got read as "one line of
text". Empty and populated are the same slot: with no surface the first save
conjures a section out of bare text rather than filling a container. The test
had frozen the drift ("not a panel" asserted more than anyone decided); it now
says not a _titled empty-state_ panel. `components-repertoire-row` draws both.
