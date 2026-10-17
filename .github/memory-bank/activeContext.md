# Active Context

**Date:** 2026-10-17

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
76/68/80/77.

**Next:** #182 (route tests for the four live handlers still untested;
`/semantic-search` now has its projection test), then #183 (mobile card board
flush left, a design call).

## Previous Task: Issue triage, honest backend coverage (#180)

Both open issues reviewed. #86 closed: flat config and eslint 10 had landed in
#97, and the react-hooks 7 compiler preset (38 sites) is not planned because the
React Compiler isn't being adopted. #166 done in #180: the backend gate counts
2,108 lines, not 847, as a ratchet (72/72/76/62); the dead `youtube-service`,
`video-processor` and `video_quality_filters.json` were deleted.

Checked and fine on `main`: home cards draw the W/D/L bar at 390px and 1280px;
mobile hides only the "N games" count (deliberate, `861fe4687`).

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
