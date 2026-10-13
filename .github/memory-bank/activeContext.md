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

## Previous Task: Style tags tail waves 5–12, gambit search (this branch)

The tail is finished: 568 more tagged (tail-38 to tail-66), 1,411 variations,
11,863 positions, every variation outside the 14 hubs; 0 unresolved. A wave cost
~20–40% of a 5-hour window; the judge ran inline, matched to exported
precedents. If Jev's save hits a Windows file lock, re-run
`jev-classify.js --new`. Briefs from waves 11–12 carry thin evidence notes on
the rarest gambits; rerun one if its page draws traffic.

Gambit search: "gambit"/"gambits" and Discover's Gambit filter now also take
openings _named_ gambits (`STYLE_NAMES`, `name_pattern`), so the Queen's Gambit
and "Gambit Declined" lines stay findable though tagged none; 982 → 1,921. Open:
QGD sub-lines crowd the top of that list; B54's ECO name.

Naming review (2026-10-13): labels kept as they are. A page hides Offbeat beside
Dubious (440/441 overlap) and Lead in development on a gambit (338/402); data
and search unchanged. Parked: plans don't say which side benefits (French
Advance shows White's "Space advantage" to Black players).
