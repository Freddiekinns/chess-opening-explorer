# Chess Opening Explorer — agent guide

Chess learning platform at [openingbook.xyz](https://openingbook.xyz). React
19 + TypeScript frontend, Express API, JSON files as the production database,
and four data pipelines (video, study, LLM enrichment, popularity stats).

Commands live in `package.json`. Architecture and current state live in
`.github/memory-bank/` — read `activeContext.md` and `progress.md` first.

Scoped rules load automatically when you work in these directories:

- `packages/web/AGENTS.md` — React, CSS Modules, SPA behaviour
- `packages/api/AGENTS.md` — routes, caching, data paths, tests
- `tools/analysis/AGENTS.md` — Python

Deep pipeline documentation is in each `tools/*/README.md`.

## Conventions

- Conventional commits (`feat`/`fix`/`chore`/`docs`/`refactor`/`test`)
- British English in all user-facing copy (analyse, colour, practise as a verb)
- Run `npm run format` before committing; Prettier owns formatting
- Write code that reads like the surrounding code: match its comment density,
  naming, and idiom

## Gotchas

Non-obvious things that have caused real regressions. Every entry here is
load-bearing.

### Data and API

- **`api/data/` is the single canonical data location.** The API reads
  video-index/courses/popularity data from `api/data/` in every environment. The
  old `packages/api/src/data/` mirror and its copy-after-regenerate step were
  removed 2026-07-06; the pipeline writes `api/data/video-index.json` directly.

- **Never fetch large payloads on mount.** `/api/openings/all` (24.8 MB) returns
  a cacheable 410. Use `/api/openings/search-index` for client-side search data,
  `/api/openings/semantic-search` for server-side queries, and the aggregate
  `/api/openings/page/:fen` for the detail page. Crawlers index 12,000+ pages
  and will amplify any unbounded payload into a large origin-transfer bill.

  The search index has two sizes and both are earned by a user action, never by
  a page load. `?limit=1000` (207 KB) is the slice every search surface ranks
  against; `lib/searchIndex.ts` fetches it once, on the first character typed
  into any search box. The full index (3.0 MB) has exactly one caller — the PGN
  lookup behind "Paste a game", which cannot identify a position outside the
  popular thousand. The landing page used to pull the slice on mount for the
  hero alone, so every visitor paid for a search most of them never ran.

  Search responses are projected down to the fields a row draws by
  `toSearchResult` in `openings.routes.js` — fen, name, eco, moves,
  games_analyzed, searchScore. Twenty whole opening records was 55 KB, mostly
  `analysis_json` descriptions, to draw twenty lines of name and ECO code — on
  every keystroke, mostly on phones. It is now 4.4 KB. **Do not return raw
  service results from a search route.**

- **Lichess opening explorer requires authentication** (since 2026-03).
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

- **Search query shape is decided on the client, ranking on the server.**
  `packages/web/src/lib/searchQuery.ts` owns abbreviation expansion ("qgd" →
  "Queen's Gambit Declined"), the ECO-code and chess-move tests, and the one
  debounce constant; `hooks/useOpeningSearch.ts` owns the fetch and the local
  index. All three search surfaces (hero `SearchBar`, `TopBarSearch`, mobile
  `SearchOverlay`) call that hook — **do not add a fetch, a debounce or a local
  index to a search component.** They each had their own until 2026-08-03, and
  only the hero expanded abbreviations, so "kid" gave the King's Indian in one
  box and the Kiddie Countergambit in another. Surprise me is
  `lib/randomOpening.ts`, shared the same way by the same three plus the landing
  page.

- **Search matches names literally before it does anything fuzzy.**
  `search/NameIndex.js` bands a query against normalised opening names (exact
  phrase → whole words → last word still being typed → substring) and orders
  each band by `games_analyzed`. `search()` runs move, ECO, name, meaning,
  spelling in that order and returns the first pass with anything to say. Fuse
  is the typo net only. Until 2026-08-04 every text query went through Fuse over
  name/moves/style_tags/**description**, which cost 850–2,800ms and scored a
  third of the corpus as matches — "sicilian" hit 4,269 of 12,377 openings, and
  every re-ranking pass downstream existed to undo that. Literal matching
  answers the same queries in 2–5ms. **Do not put `description` back in
  `FUSE_OPTIONS.keys`**, and do not add routing heuristics that guess what a
  query is before trying to match it: the deleted `looksLikeOpeningName` and
  `isAmbiguousSemanticTerm` sent "aggressive openings" to a 2.4s fuzzy name
  search that returned the Andersspike.

- **Both halves of the search rank by the same bands, and a test says so.**
  `lib/localSearch.ts` (client, paints on the keystroke from the shared index
  slice) and `search/NameIndex.js` + `searchByMove` (server, replaces it a
  moment later) implement one rule twice. `local-server-parity.test.ts` imports
  the server module directly and runs both over the same openings. If they
  drift, the results reshuffle under the cursor mid-read.

- **A band plus `log10(games)/10` is the score shape.** It keeps the popularity
  term under 1 so a result can never climb a band, and gives `promoteSaved` a
  tie band that means something. Flat multipliers do not: the semantic path's
  `Math.min(0.1, games / 10000)` saturated at a thousand games, so style
  searches fell back to corpus order and "aggressive openings" led with the Amar
  Gambit.

- **Clearing a debounce timer does not cancel a request that already left.**
  Anything that fetches per keystroke needs a monotonic request id checked
  before every `setState`, the way `useBrowse` and `useOpeningSearch` do it.
  Without one, a slow query resolves after the query that replaced it and
  repaints the older list under the newer one. Clearing the field must bump the
  id too, or the list comes back a moment after the user emptied it.

- **`eco` is not a Fuse key, so ECO codes need `searchByEcoCode`.** Before the
  explicit branch in `search-service.js`, `B90` returned **0** results against
  31 openings carrying the code — while the UI told users to "try an ECO code".
  If you add a query shape the fuzzy index cannot see, it needs its own branch,
  not a hope that Fuse copes.

- **Popularity stats cover all rated Lichess players, not master games.** Label
  UI surfaces accordingly.

- **Never render fabricated data.** If real stats are missing, omit the element
  or show an explicit "no stats" state. Never synthesise numbers that look like
  real statistics. (`OpeningCard` once invented W/D/L percentages with
  `Math.random()`.)

- **Missing stats are `null`, not `undefined` — guard with `!= null`.**
  `popularity_stats.json` carries an entry for all 12,377 positions, but 16 of
  them hold `"white_win_rate": null, "games_analyzed": 0`, and
  `BrowseService.toItem` passes those nulls through rather than omitting the
  keys. A `!== undefined` guard lets them past and `Math.round(null * 100)` is
  `0`, so `OpeningCard` drew "White 0% · Draw 0% · Black 0%" for openings with
  no data at all — the fabricated-data trap wearing a type coercion.

### Deployment and SEO

- **The opening page's content must stay in the HTML `middleware.ts` returns.**
  Google indexed 5,010 opening pages over June–July 2026 and dropped them on
  30/31 July. No deploy that day, no manual action, nothing broken — a quality
  purge. All 12,377 pages had a unique `<title>` but shipped an empty `#root`
  and the same mail-merge description ("Explore the {name} ({eco}). Played after
  {moves}. Learn key ideas…"), so a month of impressions earned 0.5–2.9% CTR at
  position ~11 and Google stopped serving them. The middleware now renders the
  opening's own description and win rates into `#root` — React replaces it on
  mount, so it is the page's pre-hydration state, not a second copy. **Do not
  return the meta description to a template, and do not put content back behind
  the JS render.** TASK009 chose meta-only injection deliberately in Feb 2026
  and named this exact escalation as its follow-up; the escalation has happened.

- **An unknown FEN must 404 — but a failed shard lookup must not.** `App.tsx`'s
  `<Route path="*">` renders the landing page, so before the middleware branched
  on a missing lookup entry, every malformed or stale `/opening/` URL returned
  200 with the landing page behind it, and Search Console was reporting them as
  soft 404s. `getSeoEntry` therefore returns `found` / `missing` / `unavailable`
  and **only `missing` 404s**: collapsing the last two back into `undefined`
  means one transient CDN miss on a shard 404s every opening page that shard
  holds. Fail open — the app still renders the position client-side.

- **`middleware.ts` and `OpeningDetailPage` must agree on the description.**
  React 19 hoists a component's `<meta>` into `<head>` **beside** the one the
  middleware already wrote rather than replacing it, so any divergence leaves
  the crawler's rendered DOM holding both — including the boilerplate the page
  was de-indexed for. Both call `buildOpeningDescription` in
  `lib/siteConfig.ts`, the one place the template fallback lives. The page
  deliberately renders **no** `<link rel="canonical">` and no `og:url`: only the
  middleware knows which page owns a shared opening name, so a second
  self-canonical would contradict it on 1,677 pages.

- **The `seo-lookup` shards and `middleware.ts` share a djb2 hash and a payload
  shape.** Change either and both must change together, plus the golden values
  in `seo-lookup-shards.test.js`. `seo-middleware.test.js` bundles the real
  middleware with esbuild and runs it against the real built `index.html`, so it
  catches a drift the unit tests cannot.

- **Sitemaps are generated, not hand-written.** `scripts/generate-sitemaps.js`
  emits only pages that own their canonical URL (10,700 of 12,377 — 1,677 are
  duplicate names or "<parent>, <move>" captions pointing at the page that owns
  the name), ordered by game volume so a young domain's crawl budget lands on
  the openings people actually search for. There was no generator until
  2026-08-07, which is why the index sat at `lastmod 2026-06-02` for two months.
  The flat `sitemap.xml` is gone — it carried a byte-identical URL set to the
  shards and robots.txt declared both, submitting the same 12,379 URLs twice.

- **Host-based redirects belong in `vercel.json`, not `middleware.ts`.**
  Vercel's edge resolves host-level redirects (www↔apex, custom domains)
  _before_ middleware runs, so any `if (url.host === …)` branch in middleware is
  dead code. Vercel's built-in www handling also defaults to 307 Temporary,
  which Google Search Console will not consolidate as a canonical signal. Use
  the `redirects` array with `"permanent": true`.

- **The middleware matcher must exclude `sitemap.xml` and `robots.txt`.** The
  matcher is a broad negative lookahead; anything not excluded goes through the
  Edge function, including static SEO files. When these are missing from the
  exclusions, Search Console reports the sitemap as "Couldn't fetch / Type:
  Unknown". (Broke in the 2026-03-29 SEO refactor.)

### Pipelines

- **Never guess YouTube channel IDs.** Verify with the user or test via the RSS
  feed (`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`).

- **Channel tiers live in `config/youtube_channels.json`** — the single source
  of truth. Do not hardcode channel lists in matcher code.

- **`courses.json` is a full rebuild each run.** Never hand-edit it.

Pipeline-specific caveats (rematch modes, cache staleness, audit scripts) live
in the `.claude/skills/` entries for each pipeline and in `tools/*/README.md`.

### Tooling

- **Lint is code quality, Prettier is formatting.** ESLint configs enforce
  code-quality rules only. Do not re-add stylistic rules
  (`indent`/`quotes`/`semi`/`linebreak-style`) — they fight Prettier.
  `packages/api`'s lint script is `eslint src/`; backend tests live at the repo
  root, not `packages/api/tests/`.

### Design system

- **`design-system/` is the canonical reference for the Warm Editorial Dark
  brand**, and the `openingbook-design` skill is the way in. Tokens live in two
  places that must stay in sync: `packages/web/src/styles/simplified.css` (what
  production imports) and `design-system/project/colors_and_type.css`. Update
  both in the same commit. New component or visual surface: add a preview card
  under `design-system/project/preview/`.

## Keeping docs current

When a change affects commands, modes, config, or architecture, update the
related docs in the same PR: this file, the scoped `AGENTS.md` files,
`.claude/skills/`, `.github/memory-bank/`, and the relevant `tools/*/README.md`.

Memory bank size caps (enforced by hand, so respect them):

| File               | Cap       | Contents                            |
| ------------------ | --------- | ----------------------------------- |
| `activeContext.md` | 50 lines  | Current task + previous task only   |
| `progress.md`      | 100 lines | One line per completed task         |
| `context.md`       | 160 lines | Architecture, stack, decisions      |
| `archive.md`       | none      | Full session detail, read on demand |

Never append to `activeContext.md` — replace the current task section. Move
completed detail to `archive.md`.
