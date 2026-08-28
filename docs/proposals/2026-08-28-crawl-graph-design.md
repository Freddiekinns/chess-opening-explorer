# Design — Give the corpus a crawl graph

**Status:** approved for implementation, 2026-08-28 · Owner: Fred **Scope:**
internal links in the pre-render, a real 404 for unknown paths, per-URL
`lastmod`. **Explicitly not in scope:** slug URLs, hub pages — see §7.

---

## 1. The problem this solves

The July de-indexing fix worked. Verified live against production on 2026-08-28:
an opening page returns its own `<h1>`, ECO and move list, its own written
description, win rates, valid JSON-LD, exactly one `<title>`, and the right
canonical — all before a line of JavaScript runs. Descriptions are real for
12,377 of 12,377 openings (median 471 characters). The redirects, robots,
sitemaps and Vercel domain config are all correct.

It did not bring the traffic back. Search Console, 90 days to 2026-08-26:

| Metric                             | Value      |
| ---------------------------------- | ---------- |
| Indexed                            | 5,750      |
| Discovered – currently not indexed | **3,615**  |
| Crawled – currently not indexed    | 294        |
| Soft 404                           | 42         |
| Clicks / impressions               | 69 / 4,810 |
| Average position                   | 12         |

The shape of that table is the diagnosis. **The pages are indexed and not
served.** 5,750 pages in the index earned 4,810 impressions in three months.
This is not an indexing failure — Google has the pages, has re-crawled them
since the fix, and declines to show them.

The cause is that nothing links into the corpus. `OpeningNavigator` and
`OpeningTree` do link opening pages to their ancestors and siblings, and the
structure is good — but it exists only in the React render. The middleware's
pre-hydration `#root` contains a heading, a description, a win-rate list, and
**no links at all**. The landing page navigates via `navigate()` calls rather
than anchors, so even the rendered homepage has almost no crawlable route into
the 12,106 opening pages.

That leaves the sitemap as Google's only reliable way in. A sitemap is a
discovery hint, not an endorsement; authority flows through links, and none
flows into any opening page unless Google spends render budget on it. 3,615
pages sitting in "Discovered – currently not indexed" is precisely what that
looks like from the outside: found, judged not worth the crawl.

---

## 2. Shared route constant

New export in `packages/web/src/lib/siteConfig.ts`:

```ts
export const STATIC_ROUTES = [
  '/',
  '/analyse',
  '/personal-explorer',
  '/repertoire',
] as const;
export type StaticRoute = (typeof STATIC_ROUTES)[number];
```

`App.tsx` builds its routes from a `Record<StaticRoute, ReactElement>` map and
renders `STATIC_ROUTES.map(...)`. The `Record` typing is the guard: adding a
route without listing it, or listing one with no element, is a **compile error**
under `npm run build`. No drift test is needed for that half.

`middleware.ts` imports the same constant. A case in
`tests/unit/repo-invariants.test.js` asserts the middleware actually consumes
it, so the constant cannot quietly stop being the source of truth.

This mirrors `buildOpeningDescription`, which exists for the same reason: two
places had to agree about one fact, and prose was not enough to keep them
agreeing.

---

## 3. A real 404 for unknown paths

`curl https://openingbook.xyz/some-random-page` returns **200** with the landing
page behind it. `App.tsx`'s `<Route path="*">` renders `LandingPage`, and the
middleware early-returns `fetch(request)` for anything outside `/opening/`, so
every typo and stale URL is a soft 404. Search Console reports 42.

The middleware stops early-returning. New order:

1. `/opening/*` — existing `found` / `missing` / `unavailable` logic, unchanged.
2. pathname in `STATIC_ROUTES` — 200, as now.
3. pathname contains a `.` — `fetch(request)` passthrough.
4. otherwise — 404, reusing the existing not-found body with generalised copy.

Step 3 is deliberate belt-and-braces. The matcher already excludes every static
file the build emits, and `repo-invariants.test.js` guards those exclusions, but
a 404 served over a real asset is a worse failure than a soft 404, so the
extension check earns its line.

The app still renders client-side behind the 404 status. Google reads the
status; a human who mistyped a URL sees the not-found body first and the landing
page after hydration. That is a strict improvement on today and does not need a
new route.

### 3.1 `/personal-explorer` should be a real redirect

`/personal-explorer` renders `AnalyseRedirect`, so it answers 200 and then
redirects in the browser. That is the same bug class as §3 wearing different
clothes: a URL that is not a page, returning a status that says it is. Google
treats a 200-then-client-redirect as a weak and ambiguous signal where a 301
would be unambiguous.

It moves to the `redirects` array in `vercel.json` with `"permanent": true`,
matching the www rule already there, and drops out of `STATIC_ROUTES` and
`App.tsx` with `AnalyseRedirect` deleted. Vercel resolves redirects before
middleware, so the route never reaches the function.

Two lines of config and a deletion, on exactly the theme of this change — but it
is scope Fred did not ask for, so it is called out here rather than folded in
silently.

---

## 4. Links in the pre-render

### Data

`scripts/generate-seo-lookup.js` requires the existing `TreeService` rather than
reimplementing the walk. `getTreeContext` is pure over `api/data/eco` and
`popularity_stats.json` — the two files the generator already reads — so the
build can compute the same ancestors, siblings and children the React navigator
shows at runtime.

Two slots are appended to the `SeoEntry` tuple, trailing-null-trimmed like the
rest:

- `[10] ancestors` — `[fen, name]` pairs, deduplicated, root first.
- `[11] related` — siblings and children merged into **one** list of
  `[fen, name]`, ordered by `games_analyzed` descending, then truncated to 8.
  One list, one sort, one cap: the row renders as a single sentence, so ranking
  siblings above children regardless of popularity would put a line nobody plays
  ahead of one they do.

### Rendering

`buildOpeningBody` appends two compact rows below the win rates, in
`--color-text-secondary` with links in `--color-brand-orange`:

```
Part of: Indian Defence › King's Indian Defence › Fianchetto Variation
Related lines: Classical Variation · Sämisch Variation · Four Pawns Attack
```

Quiet prose rows rather than a `<nav>` landmark and an `<h2>`. The pre-render is
the page's pre-hydration state and a real reader's first paint on a slow
connection; it should read as part of the article, not as chrome that is about
to be replaced.

Hrefs use `/opening/${encodeURIComponent(fen)}` — the same URL form as the
sitemap and the app.

### Measured cost

Sampled over 300 openings on 2026-08-28: mean 2.6 ancestors, 2.0 siblings, 0.7
children. Most positions are leaves, so siblings carry the lateral discovery and
ancestors carry the hierarchy.

|                                    | Before | After    |
| ---------------------------------- | ------ | -------- |
| Shard, mean                        | 138 KB | ~194 KB  |
| Shard, largest                     | 179 KB | ~235 KB  |
| Full 64-shard sweep in one isolate | 8.8 MB | ~12.5 MB |
| `build:vercel`                     | —      | +~18s    |

The 64-shard ceiling AGENTS.md describes is unchanged and ~12.5 MB remains well
inside the edge memory limit.

---

## 5. Per-URL `lastmod`

`scripts/generate-sitemaps.js` emits `<lastmod>` per URL rather than only on the
index, and never the build date. One date covers every opening URL, since the
data files are rewritten wholesale by their pipelines rather than per opening.

**This section was written against mtime and shipped against neither mtime nor
git.** Both were wrong; see §9.

Stamping today's date on 12,106 URLs on every deploy is a claim that is false
for almost all of them, and Google learns to discount a `lastmod` that always
says now. The date the openings last actually changed is the one worth sending.

---

## 6. Testing

Test-first throughout, per the rule added in #69: reproduce as a failing test,
confirm it fails for the reason expected, commit the test, then write the code.

- `seo-lookup-shards.test.js` — the existing golden values pin the djb2 hash and
  the shard distribution, not the tuple, so nothing there changes. New cases for
  the two slots: ancestor ordering (root first, deduplicated), the 8-item cap on
  `related`, and trailing-null trimming still applying to an opening with
  neither.
- `seo-middleware.test.js` — a fresh middleware instance per test, per the
  existing rule about `seoShardCache` at module scope. New cases: an unknown
  path 404s; every `STATIC_ROUTES` entry 200s; a path with an extension passes
  through; an opening body contains both link rows with correctly encoded hrefs.
- `repo-invariants.test.js` — middleware consumes `STATIC_ROUTES`.
- `npm run build` covers the `Record<StaticRoute, ReactElement>` guard.

Per the repo rule, each branch gets mutated to confirm the suite goes red before
it counts as covered.

---

## 7. What this is not

**Slug URLs are out of scope.** Every competitor ranking for chess opening names
uses a name slug; the site uses a 90-character FEN. That is real and it is the
larger ceiling. It is also not a fix: 696 name-slugs are claimed by more than
one opening, covering 2,142 pages, so there is no clean name→slug map. It needs
a disambiguation scheme, a persistent redirect map, sitemap regeneration, and
middleware and app routing changes. It is a project and it gets its own spec.

Nothing here blocks it. The links are built at one point from `[fen, name]`
pairs, so the migration changes how one href is constructed. The shard already
carries `name` — what a slug derives from — and `sharesName` already flags the
colliding pages, so the disambiguation scheme can reuse that flag rather than
recomputing it. `STATIC_ROUTES` is what slug routing plugs into.

**Hub pages are out of scope.** Family and ECO landing pages solve the same root
cause as §4 more thoroughly, and are the next lever if this one moves. Doing the
cheap version first is what makes that a decision rather than a guess.

**The landing page is out of scope.** §1 names it as half the linking problem —
it navigates with `navigate()` rather than anchors, and the middleware does not
pre-render it at all, so a crawler without JavaScript gets a spinner. This
design does not touch it. Opening pages linking to each other builds the graph
from the inside; giving the homepage crawlable links into it is a separate
change and overlaps heavily with hub pages, so it belongs with them.

---

## 8. How we know it worked

The metric is **"Discovered – currently not indexed" (3,615 on 2026-08-28)**,
watched over four to eight weeks. Not impressions: indexing moves first and
traffic follows it or does not.

If that number does not fall, the hypothesis was wrong and hub pages are the
next lever — not more of this.

---

## 9. What implementation changed

Recorded because the design was wrong in ways only running it exposed. Anyone
reading this for the reasoning should read this section too.

**Ancestor depth was measured on a biased sample.** §4 claimed 2.6 ancestors per
opening, from the first 300 rows of `ecoA` — all shallow root positions. Across
the corpus the raw chains average **9.7** and run to 33, which is not a
breadcrumb and made the largest shard 485 KB. Deduplicating by FEN barely helped
(9.7 → 8.5) because chains repeat names, not positions. The generator now
applies the same consecutive-name rule as `deduplicateAncestors`, then keeps the
family root plus the two nearest, with slot `[12]` flagging a cut trail so the
row can draw an ellipsis. `SHARD_COUNT` went 64 → 96 to hold the mean at 162 KB.

**`lastmod` was wrong twice.** mtime does not survive CI — a fresh clone stamps
every file with the checkout time and `vercel:prepare` rewrites the data files
before the generator runs, so it reported the build date on every deploy while
passing its own unit tests. Switching to `git log` then shipped a _different_
wrong date: a shallow clone's oldest commit appears to introduce every file, so
git returns the graft boundary. Vercel clones ~10 deep, and production served
`2026-07-27` on all 12,108 URLs where the truth is `2026-06-06`, drifting
forward with every deploy. `lastmodFromGit` now checks the commit against
`.git/shallow` and **omits the tag** when it matches. Consequence: production
carries no `lastmod` at all until a build has full history. No date beats a
wrong one.

**Two defects found by reviewing the branch.** The `STATIC_ROUTES` comparison
was a string equality, so `/analyse/` and `/repertoire/` went from 200 to a hard
404 — live pages, broken by the change meant to improve indexing. Trailing
slashes now 308 to the canonical form. And 1,385 of 64,853 generated links
pointed at pages that canonicalise elsewhere, contradicting the sitemap's own
exclusion rule; link targets now map through the canonical.

**Out of scope §7 stands unchanged.** Slug URLs and hub pages are still the
larger levers, and still deferred.
