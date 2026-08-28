# Review instructions

What a review pass over this repository is looking for. Most of the code here is
agent-authored, so the review bar has to be written down rather than held in one
person's head.

The passes below are drawn from `AGENTS.md`. That file explains _why_ each rule
exists, with the incident attached; this one says what to do about a change that
breaks one. When the two disagree, `AGENTS.md` is right and this file needs
updating.

## Passes

Run all five and tag each finding with its pass.

### 1. Correctness

- Logic errors, broken edge cases, subtle regressions.
- **Anything decided in two places.** Per-opening video order is picked by
  `compareMatches` in JS and re-derived by `getTopVideosForOpening` in SQL;
  client and server search rank by the same bands in `lib/localSearch.ts` and
  `search/NameIndex.js`. A change to one half that skips the other looks exactly
  like the fix not working.
- **Anything that fetches per keystroke** needs a monotonic request id checked
  before every `setState`, and clearing the field must bump it. A cleared
  debounce timer does not cancel a request that already left.

### 2. Data integrity

The project's signature failure, and the one a generic reviewer will not look
for.

- **Never render fabricated data.** If real stats are missing, omit the element
  or show an explicit "no stats" state. Synthesising numbers that look like
  statistics is always Important.
- **Missing stats are `null`, not `undefined`** — guard with `!= null`.
  `Math.round(null * 100)` is `0`, which draws "White 0% · Draw 0% · Black 0%"
  for a position with no data.
- **Pipelines must not ratchet.** A matcher that reads back only its own
  survivors can reshuffle a worse scorer's output but never recover from it.
  Re-scoring reads the enrichment cache.
- Labels must match what the data is: popularity stats cover all rated Lichess
  players, not master games.

### 3. Payload and caching

- No unbounded fetch on mount. The search index slice is earned by a keystroke;
  the full index has one caller.
- Search routes project through `toSearchResult`. Returning raw service results
  ships `analysis_json` to draw a name and an ECO code.
- Cache headers set by a route stay owned by the route. A `vercel.json` headers
  entry overrides what the function sends.

### 4. SEO and the middleware

- `middleware.ts` and `OpeningDetailPage` must agree on the description — React
  19 hoists the page's `<meta>` beside the middleware's rather than replacing
  it, so divergence leaves the crawler holding both.
- Opening-page content stays in the HTML the middleware returns, not behind the
  JS render.
- A shared opening **name** is not a duplicate page; a shared **board** is. Only
  the same-position FENs get a canonical.
- A failed shard lookup must fail open. Only a genuinely missing entry 404s.

### 5. Plan compliance and docs currency

- Does the diff match the plan it came from (`docs/superpowers/plans/`) and the
  spec above it? Where it departs, is the plan updated in the same commit?
- Does the change make `AGENTS.md`, a scoped `AGENTS.md`, a skill, the memory
  bank or a `tools/*/README.md` wrong? Say so — an out-of-date rule is worse
  than an absent one, because it is still being followed.

## What Important means here

Reserve **Important** for a finding that would break behaviour, put invented
numbers in front of a user, cost real money in origin transfer, or de-index
pages. Everything else is a nit — including naming, file layout, and anything
you would phrase as a preference.

## Cap the nits

At most five nits per review; summarise the rest as a count. A review that
returns thirty style notes and one real bug has buried the bug.

## Do not report

- **Anything CI already enforces.** Prettier formatting, ESLint, TypeScript
  errors, and the invariants pinned in `tests/unit/repo-invariants.test.js`,
  `tests/unit/search-route-projection.test.js`,
  `tests/unit/test-integrity-hook.test.js`, `local-server-parity.test.ts` and
  `seo-lookup-shards.test.js`. If one of those is wrong, the finding is about
  the test, not the line.
- **Generated files.** `api/data/**` (pipeline output; `courses.json` is a full
  rebuild each run), `packages/web/public/seo-lookup/`, the sitemaps,
  `tools/data/*.sqlite` and the enrichment cache, and any build output.
- The 78 pre-existing `no-console` warnings in `packages/api`. They are
  warnings, not errors, and were there before your diff.
- Stylistic rules that fight Prettier — indentation, quotes, semicolons, line
  endings. ESLint here is code quality only, deliberately.

## Feeding findings back

- **A mistake flagged twice becomes a rule.** The second time a review raises
  the same thing, the correction goes into `AGENTS.md` as part of that review.
  That is how every entry in its Gotchas section got there.
- **A rule flagged twice becomes a test.** If a written rule keeps being broken,
  the review has proved that prose is not enough for it — move it into a guard
  test and take it off this list.
- Retune monthly: rate the findings that were useful, drop passes that stop
  earning their place, and re-check that the skip list still matches what CI
  actually enforces.
