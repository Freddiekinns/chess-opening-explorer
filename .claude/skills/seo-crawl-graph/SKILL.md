---
name: seo-crawl-graph
description:
  How openingbook.xyz gets crawled and indexed — the edge middleware pre-render,
  seo-lookup shards, canonicals, sitemaps and the internal link graph. Use when
  touching middleware.ts, scripts/generate-sitemaps.js, the seo-lookup shards,
  STATIC_ROUTES, robots.txt, or any change to what a crawler sees before the JS
  runs.
---

# SEO and the crawl graph

Google indexed 5,010 opening pages over June–July 2026 and dropped them all on
30/31 July — a quality purge, not a bug. Everything below is what was learned
putting them back. The moving parts are `middleware.ts` (repo root),
`scripts/generate-sitemaps.js`, the `seo-lookup` shards, and the tests in
`tests/unit/` (`seo-middleware.test.js`, `seo-lookup-shards.test.js`,
`repo-invariants.test.js`).

## Invariants

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

- **Sitemap `lastmod` comes from git, not from mtime and not from the clock.**
  `dataLastModified()` reads the commit date of `api/data/eco` and
  `popularity_stats.json`. Stamping the deploy date on 12,106 URLs every push is
  false for almost all of them, and a `lastmod` that always says now is one
  Google stops reading. **Do not switch this back to `statSync().mtime`**: a
  fresh clone stamps every file with the checkout time and `vercel:prepare`
  rewrites the data files before the generator runs, so the mtime version
  reported the build date on every deploy while passing its own unit tests —
  only running `npm run build:vercel` exposed it. When git cannot answer (a
  shallow clone with no commit touching those paths in its window) the tag is
  **omitted**, never guessed. `popularity_stats.json`'s embedded
  `metadata.analysis_timestamp` is not an alternative: it reads 2025-07-15 and
  nothing maintains it.

  **A shallow clone does not say "I don't know" — it lies plausibly.** Its
  oldest commit appears to introduce every file, so `git log -1 -- api/data`
  returns that graft boundary. Vercel clones ~10 deep, and the first version of
  this shipped 2026-07-27 on all 12,108 URLs where the truth was 2026-06-06 — a
  believable date that slides forward on every deploy, which is the drifting
  `lastmod` the function exists to prevent. `lastmodFromGit` therefore checks
  the commit against `.git/shallow` and omits the tag when it matches.
  Consequence worth knowing: **production emits no `lastmod` at all** until the
  build gets full history. That is the intended trade — no date beats a wrong
  one.

- **`STATIC_ROUTES` is the one list of what is a page.** `App.tsx` builds its
  route table from it as a `Record<StaticRoute, ReactElement>`, so adding a
  route without listing it does not compile; `middleware.ts` decides what to 404
  from the same constant, and `repo-invariants.test.js` asserts it still reads
  it. Before this, the middleware passed everything it did not recognise through
  to `index.html` and `<Route path="*">` rendered the landing page at 200 — 42
  soft 404s in Search Console. A path containing `.` is handed to the origin
  untouched: the matcher already excludes the build's static files, but a 404
  over a real asset is worse than the bug this fixes.

- **The pre-render carries links, and that is the point.** Slots `[10]`–`[12]`
  of the `SeoEntry` tuple hold ancestor links, related-opening links, and a flag
  saying the breadcrumb was cut — computed at build time by `TreeService` and
  rendered into `#root` by `buildOpeningBody`. `OpeningNavigator` and
  `OpeningTree` draw the same links after hydration; before 2026-08-28 that was
  the **only** place they existed, so a crawler that did not run the JS found
  12,106 dead ends and the sitemap was Google's sole route in — 3,615 pages sat
  in "Discovered — currently not indexed" while 5,750 indexed pages earned 4,810
  impressions in 90 days. **Do not take the links back out.** Empty arrays are
  trimmed like trailing nulls, so read all three slots defensively.

- **The breadcrumb is deduplicated by consecutive _name_, then capped at
  three.** `deduplicateAncestors` in `lib/openingBook.ts` is the rule React
  applies and the generator now matches it, because the two have to show the
  same trail. Deduplicating by FEN instead removes almost nothing — a chain
  repeats names, not positions — and leaves an 8.5-entry average with a 33-deep
  worst case, which is not a breadcrumb and made the largest shard 485 KB. Root
  plus the two nearest, and slot `[12]` tells the middleware to draw an ellipsis
  rather than imply the trail is whole.

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
