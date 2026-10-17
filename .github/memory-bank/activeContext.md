# Active Context

**Date:** 2026-10-17

## Current Task: #181 — delete the dead `/api/openings` endpoints

Nine handlers nothing calls are gone: `POST /fen-analysis`, `/eco/:code`,
`/classification/:c`, `/categories`, `/stats`, `/popular`, `/family/:code`,
`/videos/:fen`, `/search-suggestions`. Bar agreed with the owner: nothing in the
codebase calls it (checked every file type, runtime-built URLs, sitemaps and the
pre-render). Also gone: their four `vercel.json` cache rules, the `eco-service`
/ `search-service` / `opening-data-service` functions left with no caller, and
the "Site Statistics" journey (`/stats` was database counts; no UI since July
2025). The `/videos` family-fallback tests now hit `/page/:fen`, which shares
the logic. Coverage gate 72/72/76/62 → 76/76/79/66.

**Next:** #182 (route tests for the five untested live handlers), then #183
(mobile card board flush left, a design call).

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
