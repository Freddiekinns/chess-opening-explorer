# Active Context

**Date:** 2026-10-10

## Current Task: Search intent-parser misreads

Branch `fix/search-intent-misreads`, stacked on #172 (itself on #171). The four
queries noted with the style tags, each with its own cause, plus one found on
the way; failing tests committed first (`search-intent-misreads.test.js`).

- **"solid response to e4"** gave nothing: `RESPONSE_TO` had to start with
  "response", so the modifier pattern took "response to e4" as a name. And
  `filterByResponseToMoves` kept the opposite of replies — lines merely
  _containing_ e4 and _not_ starting 1.e4 (1.d4 d5 2.e4).
- **"solid e4 openings"** was the same modifier misread; style-plus-move now
  runs first. Its ordering then exposed `Math.min(1, score)` in
  `scoreSemanticResults`, which tied every style-plus-move result.
- **"… for white"** kept nearly everything (`^1\.` and "two moves"). Side is now
  the mover of the shallowest ply carrying the line's "Family: first variation"
  name, normalised so "Defence" rows join their line. Alternative-name rows
  ("Pirc: 2.Nf3") still start their own line — a corpus naming limit.
- **"advanced sicilian defence"** dropped the name; it now narrows by it
  (spelling-normalised), ignoring a name that matches nothing. Style words come
  from `STYLE_AXES` only — "defense" was being used as a style.

## Previous Task: E2E specs green and in CI (#172)

9 of 9 Playwright specs pass against `mockApi.ts` (browse route, schema-v2
studies, today's labels); CI job **Test E2E**; `webServer` runs `dev:web` only.
Full text: `archive.md`.
