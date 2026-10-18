# Active Context

**Date:** 2026-10-18

## Current Task: #181 — delete the uncalled API endpoints

Gone, on the agreed bar (nothing in the codebase calls it; checked every file
type, runtime-built URLs, sitemaps and the pre-render): thirteen `/api/openings`
handlers (the issue's nine, plus `/search`, `/fen/:fen`, `/fen/:fen/related`,
`/popular-by-eco`), and the whole `/api/stats` and `/api/courses` functions —
the detail page gets both through `/page/:fen`. Six Vercel functions remain.
Also gone: their `vercel.json` rules (`/fen/(.*)` stays for `/tree`), the
service functions left with no caller, `scripts/optimize-for-vercel.js` (its
output was never read), `StatisticsShowcase` and the "Site Statistics" journey.
Tests of live logic were ported, not dropped: video fallback and the opening
record hit `/page/:fen`, the projection test hits `/semantic-search`, and the
stats loading paths test `popularity-stats-service` directly. Gate 72/72/76/62 →
77/76/80/68 (lines/statements/functions/branches).

**Next:** #182 (route tests for the four live handlers still untested;
`/semantic-search` now has its projection test).

## Previous Task: #183 — mobile card board inset (#186)

Below 769px the mini board sits 12px in from the top and left, rounded on all
four corners and top-aligned; under 360px it shrinks to 72px with an 8px inset
so the nowrap W/D/L labels fit. `landing-mobile-layout.spec.ts` pins both. Not
done: the card's CSS Module move and the unused `variant="list-item"` branch.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
