# API rules

Node.js + Express. Vercel functions in `api/` are thin wrappers (18–72 lines)
that import from here, so development and production run identical business
logic.

Backend tests are Jest. `testMatch` in the root `package.json` covers
`tests/**/*.test.js` and `tools/**/tests/**/*.test.js`; `packages/*/tests/` is in
`testPathIgnorePatterns`, so a test placed inside this package will silently
never run. Put API tests in the root `tests/` directory.

**Every other backend test builds its own `express()` and mounts a router**, so
nothing but `tests/unit/server-entrypoints.test.js` ever executes `server.js` or
`api/index.js` — the files carrying the app-level middleware, the 404 handler
and the error handler. A change that stops either constructing is otherwise
invisible: 1004 tests pass and the Vercel build succeeds, because a serverless
function is only required on its first invocation. Express 5 demonstrated this
on #109, where `app.all('*')` throws under path-to-regexp 8 and every check was
green. Keep that test loading both entry points.

## Caching is mandatory

**Every new API route must declare its caching.** Either add a `Cache-Control`
entry in `vercel.json`, or set the headers in the route itself — but not both,
because config headers override function headers. `/api/explorer` owns its own
headers for this reason (see below).

Defaults:

| Route type                          | Header                                        |
| ----------------------------------- | --------------------------------------------- |
| Static / semi-static data           | `s-maxage=3600, stale-while-revalidate=86400`  |
| Search and query endpoints          | `s-maxage=300, stale-while-revalidate=600`     |
| User-specific (e.g. `/api/personal`) | `private, no-store`                           |

Verify with `curl -I <url>` — expect `x-vercel-cache: HIT` on the second request.

This matters more than it looks: crawlers index 12,000+ pages, so an uncached
route is multiplied across all of them against a Vercel Hobby tier limit of 10 GB
fast origin transfer.

## The Lichess explorer proxy

**Lichess opening explorer requires authentication** (since 2026-03).
Anonymous requests to `explorer.lichess.org` get 401 — this is Lichess-wide
DDoS defence, not an IP block or a bug (their docs still claim public access;
trust the behaviour). Live stats go through the `/api/explorer` proxy
(`packages/api/src/routes/explorer.routes.js`), which attaches
`LICHESS_EXPLORER_TOKEN`. The token allows 25 requests/min, so CDN caching is
load-bearing — never bypass the proxy or call Lichess from the client. **The
route owns its Cache-Control headers** (7d masters / 24h bands / no-store
failures): do not add an `/api/explorer` entry to `vercel.json`, because
config headers override function headers and would clobber the per-band TTLs.
The route also 403s known crawler user-agents before touching Lichess. Without
the token the route 503s and the Win Rate panel falls back to snapshot stats.

## Search responses are projected

Search responses are projected down to the fields a row draws by
`toSearchResult` in `openings.routes.js` — fen, name, eco, moves,
games_analyzed, searchScore. Twenty whole opening records was 55 KB, mostly
`analysis_json` descriptions, to draw twenty lines of name and ECO code — on
every keystroke, mostly on phones. It is now 4.4 KB. **Do not return raw
service results from a search route.**

## Data

Read data from `api/data/` — it is canonical in every environment.
`packages/api/src/data/` holds only `seed.sql`; it is not a data mirror.

## Coverage

`npm run test:coverage` enforces 90% globally, but `collectCoverageFrom` in
`package.json` excludes most services (search, eco, llm, opening-data, database,
youtube, chesscom, personal-games) and all of `api/`. The 90% figure therefore
describes the covered subset, not the backend. Shrinking that exclusion list is
tracked as TASK006 — when you add tests for an excluded service, remove its line.
