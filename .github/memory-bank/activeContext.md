# Active Context

**Date:** 2026-10-18

## Current Task: #182 — route tests for the live `/api/openings` handlers

`tests/unit/openings-routes.test.js` drives `/search-index`, `/fen/:fen/tree`,
`/fen/:fen/tree/children`, `/random` and `/semantic-search` through supertest on
a five-opening fixture: status codes (404 for an unknown or malformed FEN, 400
for a query under two characters), the fields the client reads, the `?limit` and
`?fields=lookup` index variants and their cache keys, and the semantic-search
limit cap (50) and offset floor. None sets Cache-Control — `vercel.json` owns
those headers. Every `openings.routes.js` handler now has a route test. Gate
77/76/80/68 → 81/80/83/72 (measured 82/81/84/73).

Open: a FEN param containing a literal `%` is decoded twice (Express, then the
route's `decodeURIComponent`), so `/fen/100%25/tree` 500s instead of 404ing; not
pinned, since a test would freeze the bug.

## Previous Task: #181 (#185) — delete the uncalled API endpoints

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

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
