# Chess Opening Explorer — agent guide

Chess learning platform at [openingbook.xyz](https://openingbook.xyz). React
19 + TypeScript frontend, Express API, JSON files as the production database,
and four data pipelines (video, study, LLM enrichment, popularity stats).

Commands live in `package.json`; the ones that verify your work are under
**Working here** below. Architecture and current state live in
`.github/memory-bank/` — read `activeContext.md` first; `progress.md` and
`archive.md` are history, read on demand. `REVIEW.md` is the review policy: what
a pass over a diff looks for here, and what to leave alone because CI already
covers it.

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
| a page's markup or copy | `npm run test:e2e`       |
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

Recorded because ~14 unsolicited turns on PR #67 (five of them hourly polls of a
green PR) and 14+ on PR #63 happened before this rule existed.

## Gotchas

Non-obvious things that have caused real regressions. Every entry here is
load-bearing. Rules that only matter inside one package or subsystem live with
it: the scoped `AGENTS.md` files (PostHog analytics, the Lichess explorer proxy,
search payloads) and the skills (pipelines, dependencies and tooling).

### Data and API

- **`api/data/` is the single canonical data location** in every environment.
  The `packages/api/src/data/` mirror and its copy step were removed 2026-07-06;
  pipelines write to `api/data/` directly.

- **Never fetch large payloads on mount.** `/api/openings/all` (24.8 MB) returns
  a cacheable 410. Use `/api/openings/search-index` for client-side search data
  (fetched on the first keystroke, never on load),
  `/api/openings/semantic-search` for server-side queries, and the aggregate
  `/api/openings/page/:fen` for the detail page. Crawlers index 12,000+ pages
  and will amplify any unbounded payload into a large origin-transfer bill. **Do
  not return raw service results from a search route** — see
  `packages/api/AGENTS.md`.

- **Never call Lichess from the client or bypass `/api/explorer`.** The explorer
  needs a token limited to 25 requests/min, so the proxy's CDN caching is
  load-bearing, and the route owns its Cache-Control headers — no
  `/api/explorer` entry in `vercel.json`. Detail in `packages/api/AGENTS.md`.

- **Search ranking is one rule implemented twice, and both halves must agree.**
  The client paints from a held index slice on the keystroke; the server
  replaces that list a moment later. **Read the `search-ranking` skill before
  changing search behaviour or ranking, or adding a query shape** (ECO codes,
  moves, abbreviations). It carries the band order, the score shape, the Fuse
  rules, and why a debounce alone does not cancel a request.
- **Popularity stats cover all rated Lichess players, not master games.** Label
  UI surfaces accordingly.

- **Style tags come from `api/data/style-tags.json`, not `analysis_json`.** The
  old LLM fields (`style_tags`, `complexity`, `tactical_tags`…) are still in
  every ECO record and are wrong in ways that were measured (61% "Advanced",
  "defensive" on 99% of openings). Read tags through
  `services/style-tags-service.js`; pages receive them as `style_profile`.
  `tools/style-tags/export.js` writes the file, and a position it leaves out (a
  hub such as 1.e4, or a variation not yet classified) shows no tags.

- **Analytics: page views are Vercel's, events are PostHog's**, sent only from
  the `openingbook.xyz` host, never with PII or search text. Read
  `packages/web/AGENTS.md` before touching `trackEvent` or concluding an event
  was lost.

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

- **A family is a video shelf, not just a label.** A page with no videos of its
  own shows its family's best videos, pooled from every position in the family
  (`family-resource-service.js`). So moving positions into a family also pours
  their videos into its shelf: filing the Danish under `scotch` would have put
  five Danish and Latvian videos in the Scotch top 8. Families come from
  `data/family-overrides.json` by name prefix, **first match wins**. A bare
  `Nimzowitsch` rule above `Nimzowitsch-Larsen` takes the 1.b3 lines with it.
  After any rule change, run `node tools/family-taxonomy/build-family-index.js`
  and commit the rewritten ECO files: the deploy re-resolves anyway, so a
  skipped rebuild leaves dev and tests on the old taxonomy, and
  `family-taxonomy-data.test.js` fails on that drift. Runbook:
  `tools/family-taxonomy/README.md`.

### Deployment and SEO

The crawl graph is a subsystem with its own invariants — the middleware
pre-render, the `seo-lookup` shards, canonicals, sitemaps and the internal link
graph. **Read the `seo-crawl-graph` skill before touching `middleware.ts`,
`scripts/generate-sitemaps.js`, the shards, `STATIC_ROUTES` or `robots.txt`.**
Google de-indexed 5,010 pages once already, after a change that looked safe.

### Pipelines

Read the pipeline's skill before changing or running it — `video-pipeline`,
`course-discovery`, `popularity-stats` — and `tools/*/README.md` for the deep
detail. The video skill carries the scorer's regressions (the corpus ratchet,
description and alias traps, the order decided twice, the Jev filter). Two rules
that reach beyond any one pipeline:

- **Never guess YouTube channel IDs.** Verify with the user or test via the RSS
  feed (`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`).
- **`courses.json` and `video-index.json` are full rebuilds.** Never hand-edit
  them.

### Tooling

Read the `dependencies-tooling` skill before touching a dependency, the
lockfile, a Dependabot PR, the audit gate, ESLint config, or a script that
spawns a process. Every rule in it broke CI or a deploy once. Three that any
session can trip:

- **A failing test comes first, and a hook stops it being unwritten.**
  `.claude/hooks/test-integrity.js` blocks adding `.skip` / `.only` / `xit` and
  shell commands that remove or disable a test. The deliberate exception,
  `ALLOW_TEST_SKIP=1`, belongs in the commit message; the skill covers how it
  binds and the heredoc false positive.
- **A fresh remote session commits with no git hooks** until `npm ci` has run,
  because `prepare: husky` is what sets `core.hooksPath`. Install before
  committing, or rely on CI, which runs lint and `format:check` on every PR.
- **Never `npm install --package-lock-only`, and regenerate the lockfile only
  with the npm CI runs (11).** Each has dropped nested entries and failed every
  CI job at `npm ci`.

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
