# Active Context

**Date:** 2026-10-11

## Current Task: Style tags tail, waves from tail-24

Branch `style/tail-wave-1` (#174), stacked on #173. The tail plan is in
`archive.md` ("Style tags tail — plan"); each wave is 4 Sonnet agents × 20
unsourced briefs, then `jev-classify.js --new`, `collect-unsourced.js`,
`validate.js`, an Opus judge over what it lists, and `export.js`.

- **Done:** tail-24 to tail-37 (280 variations); `style-tags.json` now covers
  843 variations, 11,036 positions. 0 unresolved.
- **Left:** tail-38 to tail-66, 568 variations. 80 briefs cost 44% of a 5-hour
  window and 40 cost 30% (2026-10-11), so one 80-brief wave per window.
- **Read tags from the variation's own pages.** Semi-Slav Accepted was tagged
  Sharp/Advanced from the 6.e4 Botvinnik, but the Botvinnik is its own
  variation; this one's pages are the 6.a4 lines. `UNSOURCED.md` now says so.
- **Never let the judge call `/api/explorer`** — the shared Lichess token (25 a
  minute). Wave 1's judge did; later prompts forbid it.

Open, for the owner:

- **Gambit definition.** The wave-1 judge proposed that material the giver can
  win back at will (e.g. ...Qxe5+) is not a gambit unless the main line declines
  to recapture. The taxonomy is unchanged.
- **B54** is still named "Dragon Variation, Accelerated Dragon" in the ECO data.

## Previous Task: Search intent-parser misreads (#173)

"solid response to e4", "solid e4 openings", "… for white" and "advanced
sicilian defence" each misread; fixed with failing tests first. Dead category
routes removed. Full text: `archive.md`.
