# Active Context

**Date:** 2026-10-20

## Current Task: #187 — clean up unused Claude skills and agents

Transcripts from 11 Jul to 20 Oct showed `scout`, `implementer` and `/docs-sync`
never chosen, so they are deleted. `course-discovery` and `popularity-stats`
never loaded because nothing touched their pipelines; their unique content
(rematch staleness, the shipped stats' provenance) moved into
`tools/*/README.md`. `CLAUDE.md` now routes `test:all` and builds to `verifier`
(the main session had run them inline ~25 times to its 3), and `AGENTS.md` gates
new skills on the third repeat. Untracked `.agents/` and `.codex/` copies of the
skills (16 Sep) had drifted; not tracked, left alone.

## Previous Task: #182 — route tests for the live `/api/openings` handlers

`tests/unit/openings-routes.test.js` drives `/search-index`, `/fen/:fen/tree`,
`/fen/:fen/tree/children`, `/random` and `/semantic-search` through supertest on
a five-opening fixture: status codes (404 for an unknown FEN or a non-FEN
string, 400 for a query under two characters), the fields the client reads, the
`?limit` and `?fields=lookup` index variants, and the semantic-search limit cap
(50) and offset floor. None sets Cache-Control — `vercel.json` owns those
headers. Every `openings.routes.js` handler now has a route test. Gate
77/76/80/68 → 81/80/83/72 (measured 82/81/84/73).

Review fix, test first: `/search-index` 400s a `?limit` that is not a positive
whole number (`-5` had returned all but five openings), and builds the index
once and slices it per request — the cache had been keyed on the raw `?limit`
string, one copy per value, never evicted, on one shared TTL clock.

Open: a FEN param containing a literal `%` is decoded twice (Express, then the
route's `decodeURIComponent`), so `/fen/100%25/tree` 500s instead of 404ing; not
pinned, since a test would freeze the bug.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
