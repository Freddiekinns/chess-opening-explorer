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

## Previous Task: Style tags tail, waves 5–6 (this branch)

160 more tagged (tail-38 to tail-45): 1,003 variations, 11,328 positions, 0
unresolved. Left: tail-46 to tail-66, 408 variations. An 80-brief wave cost
~19–43% of a 5-hour window; the judge ran inline, with rulings matched to
exported precedents (Noteboom, Grob roots, Scotch anchor). Still open for the
owner: the gambit definition and B54's ECO name (`archive.md`).
