# Chess Opening Explorer — agent guide

Chess learning platform at [openingbook.xyz](https://openingbook.xyz). React
19 + TypeScript frontend, Express API, JSON files as the production database,
and four data pipelines (video, study, LLM enrichment, popularity stats).

Commands live in `package.json`; the ones that verify your work are under
**Working here** below. Architecture and current state live in
`.github/memory-bank/` — read `activeContext.md` and `progress.md` first.
`REVIEW.md` is the review policy: what a pass over a diff looks for here, and
what to leave alone because CI already covers it.

Scoped rules load automatically when you work in these directories:

- `packages/web/AGENTS.md` — React, CSS Modules, SPA behaviour
- `packages/api/AGENTS.md` — routes, caching, data paths, tests
- `tools/analysis/AGENTS.md` — Python

Two subsystems carry enough invariants to live in skills rather than here —
`seo-crawl-graph` (middleware, shards, sitemaps, canonicals) and
`search-ranking` (bands, scoring, query shapes). Read the skill before changing
either. Deep pipeline documentation is in each `tools/*/README.md`.

## Working here

`npm run test:all` is the check that matters — `test` and `test:backend` are
both bare `jest` and cover only the backend half. Type errors surface from
`npm run build`, not from either test suite.

| After changing…         | Run                      |
| ----------------------- | ------------------------ |
| anything                | `npm run test:all`       |
| TypeScript              | `npm run build`          |
| a dependency            | `npm run security:audit` |
| the build or SEO output | `npm run build:vercel`   |
| before committing       | `npm run format`         |

That fourth row is not belt-and-braces: the sitemap `lastmod` bug passed its own
unit tests and was only exposed by a real `build:vercel` run.

Four habits, each of which has already cost this repo a regression or a wasted
session:

- **Fix a bug by writing the failing test first.** Reproduce it, confirm it
  fails for the reason you expect, commit that test, then fix the code without
  touching it. A hook enforces the fence — see Tooling.
- **State assumptions before implementing; don't pick a reading silently.** If a
  request has two interpretations, name both. Canonicalising on opening name was
  a confident guess that de-indexed 1,677 live pages before review caught it.
- **Change only what was asked.** Don't improve adjacent code, reformat, or
  refactor what isn't broken. Every changed line should trace to the request.
- **Prefer the smallest thing that works.** No abstraction for a single caller,
  no configurability nobody asked for.

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

- **Search ranking is one rule implemented twice, and both halves must agree.**
  The client paints from a held index slice on the keystroke; the server
  replaces that list a moment later. **Read the `search-ranking` skill before
  changing search behaviour or ranking, or adding a query shape** (ECO codes,
  moves, abbreviations). It carries the band order, the score shape, the Fuse
  rules, and why a debounce alone does not cancel a request.
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

The crawl graph is a subsystem with its own invariants — the middleware
pre-render, the `seo-lookup` shards, canonicals, sitemaps and the internal link
graph. **Read the `seo-crawl-graph` skill before touching `middleware.ts`,
`scripts/generate-sitemaps.js`, the shards, `STATIC_ROUTES` or `robots.txt`.**
Google de-indexed 5,010 pages once already, after a change that looked safe.

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

- **ESLint is flat config, and the file set lives in the config, not the CLI.**
  Each package has an `eslint.config.js` — CommonJS in `packages/api`, ESM in
  `packages/web` and `packages/shared`, matching each package's `type`. There is
  no `--ext` flag in ESLint 9+, so `files:` and `ignores:` decide what gets
  linted; `eslint .` in `packages/web` will otherwise reach `coverage/` and
  report its generated disable directives. `packages/shared`'s config was
  unreadable for months — `module.exports` under `"type": "module"` — because CI
  linted only api and web. It lints all three now; keep it that way.

- **react-hooks 7 is installed but its `recommended` preset is not.** The
  package enables the React Compiler rules through that preset, and the codebase
  violates them in ~20 places. `packages/web` enables `rules-of-hooks` and
  `exhaustive-deps` explicitly instead, which is what it has always enforced.
  Adopting the preset is #86's remaining half: land the rules at `warn`, clear
  the sites in batches, then promote to `error`. Do not add the preset without
  doing that work.

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

- **Regenerate `package-lock.json` with npm 10, not whatever npm you have.** CI
  pins Node 20, so the lockfile has to satisfy that npm. A local npm 11 drops
  nested `node_modules/<pkg>/node_modules/*` entries when it rewrites the file,
  and CI's `npm ci` then refuses it outright —
  `Missing: picomatch@4.0.7 from lock file`, every job dead at install in about
  sixteen seconds. The local tree is wrong too, not just the lockfile:
  `npm ls picomatch --all` says `invalid: picomatch@2.3.2` against tinyglobby's
  `^4.0.4`, which reaches the tree through `sqlite3` → `node-gyp`.

  Restore the lockfile from `origin/main` first, then
  `npx -y npm@10.8.2 install`, and confirm with `npx -y npm@10.8.2 ci` before
  pushing. **Never `npm install --package-lock-only`** — it drops nested entries
  even on npm 10, which is what caused this in the first place. If you install
  with `--ignore-scripts`, follow it with `npm rebuild sqlite3` or the native
  binding is missing and `tools/video-pipeline` tests fail to run.

- **A Dependabot PR is tested against the `main` of the day it opened.** Run
  `gh pr update-branch` before believing its CI. #75 went green having silently
  lost two tests — its branch predated the commit that added them, and a test
  that vanishes is not a test that fails. Compare per-file test counts against
  `main`, not the total. Full triage:
  `docs/reviews/2026-08-29-dependabot-triage.md`.

- **Closing a Dependabot PR suppresses only the version you closed**, so a
  package blocked on tracked work returns on its next release — #76 came back as
  #89 twenty-two minutes later. Worse, a `0.x` minor is grouped rather than
  filed as a major, so it rides along with every future batch and takes the
  group red. That is why `.github/dependabot.yml` carries exactly one `ignore`
  entry (`eslint-plugin-react-refresh >=0.5.0`, removed when #86 lands). Like
  the `security:audit` allowlist, every entry states its reason and the
  condition that deletes it.

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
| `user-journeys.md` | 150 lines | The flows the product promises      |

Never append to `activeContext.md` — replace the current task section. Move
completed detail to `archive.md`.
