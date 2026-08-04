# Sample reports

The Analyse blank state offers two pre-baked reports so a first-time visitor can
see the payoff before typing a username. They are committed fixtures, not a live
call — a third-party request on a landing screen means rate-limit exposure, a
slow first paint and a support burden.

## Regenerating

```bash
npm run sample:generate
```

Fetches each player's most recent rated rapid/blitz/classical games, classifies
them with the same `analyseGames` the page runs, and rewrites
`packages/web/src/data/sample-reports/*.json`.

Commit the regenerated fixtures. The page prints `generatedAt` beside the
report, so a stale fixture is visible rather than silent.

## Adding a player

Add an entry to `SAMPLES` in `generate-sample-reports.js`, then register it in
`packages/web/src/components/personal/sampleReports.ts` — the loader map is
explicit so the bundler can code-split each fixture.

## Two things that will trip you up

**The script imports `packages/shared/dist` leaf modules, not `dist/index.js`.**
The shared package's top-level barrels (`index.ts`, `types/index.ts`) re-export
without file extensions, which Node's ESM resolver rejects. Vite rewrites those
for the web build, so the package's declared entry point is only broken here.
Import `dist/utils/<module>.js` directly.

**`dist/` is not committed**, so the npm script builds `packages/shared` before
running. Calling the script with bare `node` on a clean checkout will fail.

## Why the fixtures are not tiny

They carry the full untruncated opening lists, because the family rollups on the
dashboard aggregate over every opening, not the top ten. At `limit: 100` each
file is roughly 25–30 KB. Keep it there unless a file grows past a couple of
hundred kilobytes.
