# Active Context

**Date:** 2026-10-11

## Current Task: Analytics read-out, gap events, soft 404s

Branch `feat/analytics-gap-events`. A read of PostHog, Vercel and Search Console
(baseline numbers: `archive.md`) found three questions the events could not
answer, and 86 real opening pages still soft 404 after #142.

- **New events:** `search_start` and `search_no_results` (from
  `useOpeningSearch`, which now takes its surface; no query text),
  `video_gallery_view` (once per set of videos, on screen), `opening_nav`
  (`via: explorer | breadcrumb`, desktop and mobile).
- **Soft 404s:** createRoot discarded the middleware's pre-render, so a slow (3s
  cold) or failed aggregate fetch left the crawler "Loading opening..." or an
  error message. `lib/prerender.ts` keeps the first page's pre-render on screen
  until the data arrives. Revalidate in Search Console after deploy.
- **Revisit late Nov 2026** with six weeks of the new events. Search ranking and
  the video pipeline are paused until then.

## Previous Task: Style tags tail, waves from tail-24 (#174)

843 variations tagged; tail-38 to tail-66 (568) left, one 80-brief wave per
5-hour window. Open for the owner: the gambit definition the wave-1 judge
proposed, and B54's ECO name. Full text: `archive.md`.
