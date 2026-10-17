# Active Context

**Date:** 2026-10-17

## Current Task: Issue triage, honest backend coverage — next #181

Both open issues reviewed. #86 closed: flat config and eslint 10 had landed in
#97, and the react-hooks 7 compiler preset (38 sites) is not planned because the
React Compiler isn't being adopted. #166 done in #180: the backend gate counts
2,108 lines, not 847, as a ratchet (72/72/76/62); the dead `youtube-service`,
`video-processor` and `video_quality_filters.json` were deleted.

**Next, in order**, each a fresh session:

1. **#181**: delete the nine `/api/openings` endpoints nothing calls. The issue
   and its comment trace why each lost its caller; all were deliberate. Open
   decision for the owner: is "nothing in the codebase calls it" enough, given
   Vercel keeps 12h of logs? `/stats` is **database counts, not popularity
   stats**, and `user-journeys.md` still promises "Site Statistics", which no UI
   draws. Settle that journey line in the same PR.
2. **#182**: route-level tests for the five live handlers that have none.
3. **#183**: the mini board sits flush against the card's left edge on mobile
   (≤768px). A design call between two fixes.

Checked and fine on `main`: home cards draw the W/D/L bar at 390px and 1280px;
mobile hides only the "N games" count (deliberate, `861fe4687`).

## Previous Task: Analytics read-out, gap events, soft 404s

Shipped in #179. A read of PostHog, Vercel and Search Console (baseline:
`archive.md`) added `search_start`, `search_no_results`, `video_gallery_view`
and `opening_nav`. `lib/prerender.ts` keeps the middleware's pre-render on
screen until the aggregate fetch lands, which fixes 86 soft 404s; revalidate in
Search Console. **Revisit late Nov 2026** with six weeks of the new events.
Search ranking and the video pipeline are paused until then.
