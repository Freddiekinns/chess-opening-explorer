# Active Context

**Date:** 2026-10-18

## Current Task: #183 — mobile card board inset

Below 769px the opening card's mini board now sits 12px in from the top and
left, rounded on all four corners, top-aligned so cards made taller by style
tags don't leave it floating. Under 360px it shrinks to 72px with an 8px inset,
because the nowrap White/Draw/Black labels need about 165px; at 320px they were
already clipping on one card on `main`. Checked at 320, 344, 360, 375, 390, 412,
430 and 768px against real data. `landing-mobile-layout.spec.ts` pins the inset
and that no card content crosses the card's right edge. Not done: moving the
card's styles to a CSS Module (the e2e specs select its global class names), and
deleting the unused `variant="list-item"` branch.

**Next:** #181 is in PR #185, awaiting merge; then #182.

## Previous Task: Issue triage, honest backend coverage (#180)

Both open issues reviewed. #86 closed: flat config and eslint 10 had landed in
#97, and the react-hooks 7 compiler preset (38 sites) is not planned because the
React Compiler isn't being adopted. #166 done in #180: the backend gate counts
2,108 lines, not 847, as a ratchet (72/72/76/62); the dead `youtube-service`,
`video-processor` and `video_quality_filters.json` were deleted.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
