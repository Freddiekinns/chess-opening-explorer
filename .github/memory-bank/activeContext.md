# Active Context

**Date:** 2026-09-24

## Current Task: Feature review and backlog rev 4

**Every feature idea since February was re-checked against `main`.** The
deviation trainer's slice 2 was never started (no detection code, no
`?practice=`), and the 2026-08-11 audit's P0s are all still open: Analyse's
`list[0]` fallback, the unread `?ref=personal`, the explorer's scroll reset,
inert off-book rows, two meanings of "Level", and a 14-month-old popularity
snapshot. Review: `docs/reviews/2026-09-24-feature-review.md`.

**We cannot see our users.** `/api/event` beacons go to runtime logs, which
Hobby keeps for one hour, and the Vercel API reports Web Analytics as not
enabled even though `<Analytics />` is mounted. The PRD's accounts gate has no
data behind it.

**`docs/backlog.md` rev 4:** Now (credibility + measurement) → Next (personal
strip + `?practice=`, practice memory, divergence callout, Start here shelf) →
Then (the trainer with paste-a-game as its public face, repertoire from your
games) → Platform (position graph, offline "position facts"). The archive was
owner-agreed: TASK005, TASK014 abandoned; TASK015 and slice 1 shipped; M3, J8,
3.6, J6 archived; TASK013 merged. **Decisions 2–5 are still open** (board-search
split, Repertoire, the offline engine run, measurement).

The corpus checks for this review: only ~14 distinct trap-named ECO lines;
`courses.json` holds study links, not PGNs; the board-search PRD's 7,794/12,377
reachability figures reproduce exactly.

## Previous Task: SEO check-up, Vercel usage, and the Dependabot queue

Indexed 7,174 pages, but impressions are still 3–40/day. 81 soft 404s were our
own "Opening not found" copy (#142). Active CPU per invocation is ~3× from cold
starts parsing ~78 MB of JSON. `dependabot/**` no longer deploys (#141). The
site icon went from 568 KB to 46 KB (#143). Detail in `archive.md`.
