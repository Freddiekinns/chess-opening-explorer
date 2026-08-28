# Chess Opening Explorer — agent guide

Chess learning platform at [openingbook.xyz](https://openingbook.xyz). React
19 + TypeScript frontend, Express API, JSON files as the production database,
and four data pipelines (video, study, LLM enrichment, popularity stats).

Commands live in `package.json`. Architecture and current state live in
`.github/memory-bank/` — read `activeContext.md` and `progress.md` first.
`REVIEW.md` is the review policy: what a pass over a diff looks for here, and
what to leave alone because CI already covers it.

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

### Background wake-ups cost a full turn

A scheduled check-in or a webhook event replays the whole conversation and bills
the owner for it. "Staying silent" is not free — a check-in printing one line
costs what one printing a page costs.

- **Never schedule a recurring check-in on a pull request.** A PR that is green
  and conflict-free is waiting on a human; nothing changes without them, and the
  merge arrives as a webhook anyway.
- **Unsubscribe (`unsubscribe_pr_activity`) once CI is green** with no
  outstanding review. The window worth waking for is the few minutes between a
  push and the checks settling; after that every event is a `vercel[bot]` deploy
  notice or a coverage table.
- **Never relay bot status comments to the owner.** They can see them.

Recorded because it has happened twice: ~14 unsolicited turns on PR #67, five of
them self-scheduled hourly polls of a PR that was green throughout, and 14+ the
same on PR #63 the week before.

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

- **Give each test in `seo-middleware.test.js` a fresh middleware instance.**
  `seoShardCache` lives at module scope, so one shared instance carries a warm
  cache between tests — which silently voided the fail-open tests: the shard was
  already resident, `fetch` was never reached, and flipping `unavailable` to
  `missing` left all 21 green. They now assert the shard was actually requested.
  When you touch this file, mutate the branch you believe you are covering and
  confirm the suite goes red.

- **A shared opening name is not a duplicate page; a shared board is.** 2,071
  rows carry a name another row also has, and every one is a different position
  with its own moves, description and win rates — `King's Pawn Game` is both
  1.e4 (3.8B games) and 1.e4 e5 (1.5B), and `Danish Gambit: Accepted, 4.Bc4`
  (11.4M) is not the `Danish Gambit: Accepted` it is named after. Canonicalising
  on the name de-indexed 1,677 real pages carrying 6.65 billion games before
  review caught it. What a name collision breaks is the **title**, so those rows
  carry `sharesName` and the middleware appends their move list — which
  separates all 677 shared names with none left ambiguous. The only true
  duplicates are the **271 rows whose FEN differs from another's in nothing but
  the move counters** (`positionKey` compares the first four fields); those, and
  only those, get a canonical.

- **Sitemaps are generated, not hand-written.** `scripts/generate-sitemaps.js`
  emits the 12,106 pages that own their canonical URL, ordered by game volume so
  a young domain's crawl budget lands on the openings people actually search
  for. There was no generator until 2026-08-07, which is why the index sat at
  `lastmod 2026-06-02` for two months. The flat `sitemap.xml` is gone — it
  carried a byte-identical URL set to the shards and robots.txt declared both,
  submitting the same 12,379 URLs twice.

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
  of truth. Do not hardcode channel lists in matcher code. Resolve them through
  `lib/channel-tiers.js`, which normalises titles to letters and digits before
  comparing: the config's display name is not the YouTube channel title ("Chess
  Network" vs `ChessNetwork`), and a raw string compare silently demoted that
  premium channel to the unknown tier — 60 scoring points and a stricter
  duration gate that withheld 183 of its videos from the corpus.

- **`courses.json` is a full rebuild each run.** Never hand-edit it.

- **The video matching corpus is the enrichment cache, not the `videos` table.**
  Matching writes back only the top 10 per opening, so the table holds ~1,700 of
  the ~10,200 videos ever fetched. `pipeline:rematch` reads
  `tools/data/video_enrichment_cache.json` as well (`lib/enrichment-corpus.js`)
  — without it, re-scoring is a ratchet where a better scorer can only reshuffle
  a worse one's survivors, and a video dropped once is gone for good. That is
  what cost the Accelerated Dragon page Seirawan's 455k-view lecture and two
  Naroditsky theory speedruns: they score 155–175 today and had simply left the
  corpus.

- **Per-opening video order is decided twice.** `compareMatches`
  (`lib/video-matcher.js`) picks the top 10; `getTopVideosForOpening`
  (`database/schema-manager.js`) re-derives the **displayed** order in SQL. They
  must break ties identically, which is why `variation_rank` is persisted on
  `opening_videos` rather than kept in memory. Adding the tie-break to the JS
  half alone changed nothing — the SQL re-sorted by view count on the way to the
  JSON, and the symptom looked exactly like the fix not working.

- **An opening's alias list can contain its own family name.** `parseAliases`
  splits ECO alias strings on commas, so `"Sicilian Defense, O'Kelly Variation"`
  gives the **Kan** page a bare `"Sicilian Defense"` alias. Matched as a name,
  that scored every generic Sicilian video 80 on a specific sub-variation page —
  above any real variation match, and past both guards, because the intra-family
  guard only fires for family matches and the corroboration rule only for
  content matches. Aliases equal to the page's family prefix are skipped; the
  video can still qualify through the family path, which is policed.

- **A video's description is not its subject.** Series descriptions cross-link
  their sibling episodes ("The theory of the Accelerated Dragon:
  https://youtu.be/…"), so every Sicilian lecture in a playlist name-matches
  every other Sicilian page. The scorer only counts a description/tags hit on a
  sub-variation page when the **title** names the variation too; otherwise the
  video falls through to the family path where the intra-family guard applies.
  Until 2026-08-10 an uncorroborated mention scored +60 — above a family match —
  and bypassed that guard, which is how Alapin, Scheveningen and Prins lectures
  sat on the Accelerated Dragon page at 100+.

Pipeline-specific caveats (rematch modes, cache staleness, audit scripts) live
in the `.claude/skills/` entries for each pipeline and in `tools/*/README.md`.

### Tooling

- **A failing test comes first, and a hook stops it being unwritten.** For a bug
  fix: reproduce it as a test, confirm it fails for the reason you expect,
  commit that test, then fix the code without touching it.
  `.claude/hooks/test-integrity.js` runs as a `PreToolUse` hook and blocks an
  edit that adds `.skip` / `.only` / `xit` to a test file, and a shell command
  that removes a test path or writes a disabled test into one. It is a fence,
  not a wall — a shell is too expressive to police completely, and the wall is
  the PR diff. Its patterns are anchored to the start of a line so a disabler
  quoted inside a string is not mistaken for one being introduced.

  The deliberate exception is `ALLOW_TEST_SKIP=1`, and using it belongs in the
  commit message. Hooks inherit the environment of the process Claude Code runs
  in, so for `Edit` and `Write` it has to be exported **before** starting Claude
  Code — there is no per-call environment. A `Bash` command can carry it inline,
  as a prefix, which is also the way out of the fence's one real false positive:
  a heredoc whose body quotes a command the fence would block. Writing about
  this hook in a shell heredoc trips it, twice so far. Use `Edit` or `Write` for
  those files.

- **The two kinds of hook bind at different times.** The Claude Code hook above
  is read from `.claude/settings.json` and works in any clone. The husky git
  hooks (`pre-commit` runs prettier + eslint, `pre-push` runs type-check and
  `test:all`) only bind once `npm install` has run, because `prepare: husky` is
  what sets `core.hooksPath`. A fresh remote session therefore commits with **no
  git hooks at all** until you install — run `npm ci` before committing, or rely
  on CI, which runs lint and `format:check` on every PR regardless.

- **Lint is code quality, Prettier is formatting.** ESLint configs enforce
  code-quality rules only. Do not re-add stylistic rules
  (`indent`/`quotes`/`semi`/`linebreak-style`) — they fight Prettier.
  `packages/api`'s lint script is `eslint src/`; backend tests live at the repo
  root, not `packages/api/tests/`.

- **The dependency gate is scoped on purpose, and its allowlist expires.**
  `npm run security:audit` (`scripts/audit-dependencies.js`, run by CI) fails on
  high and critical advisories in **production** dependencies only. Dev-only
  findings — the vitest/vite/esbuild dev-server class — are Dependabot's job,
  not a merge blocker, because a gate that must be overridden every PR teaches
  the override. **The allowlist is empty, and the bar for adding to it is
  "unreachable from production _and_ no upgrade exists".** It briefly held
  `sqlite3`'s native build chain (`tar`, `node-gyp`, `cacache`,
  `make-fetch-happen`) on the unreachability argument alone, which was true and
  still the wrong answer — `sqlite3@6` cleared all five including the only
  critical in the tree. Every entry carries a reason and the condition that
  removes it, and **an entry whose advisory has gone fails the run**: that check
  is what forced the upgrade rather than letting the list sit there, and without
  it the gate quietly becomes decorative. Entries are keyed by package name, not
  advisory id, because node-tar accrues new GHSA ids faster than a list would
  stay current. **It fails closed**: `npm audit` answers a registry or proxy
  failure with a JSON error object and no `vulnerabilities` key, and reading
  that as an empty result made the gate report "no blocking advisories" and exit
  0 at the one moment it had checked nothing. A missing `vulnerabilities`/
  `metadata` pair is an error, never a clean tree. Reasoning and the full
  triage: `docs/reviews/2026-08-28-dependency-security-scanning.md`.

- **Never spawn `npm` by name from a build script.** npm is `npm.cmd` on
  Windows, a batch shim: `execFileSync('npm', …)` throws ENOENT, and naming
  `npm.cmd` explicitly is no better because Node refuses to `execFile` a `.cmd`
  at all since the fix for CVE-2024-27980 and throws EINVAL. The audit gate did
  the first of those and so exited 1 before auditing anything, printing
  "Dependency audit could not be completed" — which reads like a real finding —
  for every Windows contributor, while Linux CI stayed green.

  `npmInvocation()` in `scripts/audit-dependencies.js` is the pattern: run npm's
  own `npm-cli.js` with `process.execPath`, taking the path from `npm_execpath`
  (which `npm run` sets) and falling back to the copy bundled beside the node
  binary. **Not `shell: true`** — the argv is fixed today, but a shell turns any
  later interpolation into an injection, and a security gate is the wrong place
  for that. `audit-dependencies.test.js` asserts the invocation is spawnable on
  the machine running it, which is the check that would have caught this
  originally.

- **A path computed _for_ a platform must use that platform's path module** —
  `path.win32` or `path.posix`, never the ambient `path`. On Linux `path` is
  `path.posix`, which does not treat a backslash as a separator, so
  `path.dirname('C:\\a\\b')` is `'.'` there. `bundledNpmCli` got this wrong and
  took CI red: its Windows branch returned a bare relative path on Linux. A test
  that builds its expected value with the host's `path.join` agrees with the bug
  on Windows and fails on CI, so **expectations for another platform are written
  as literal strings**, not composed with `path.join`.

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
