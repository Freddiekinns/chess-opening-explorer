# Active Context

**Date:** 2026-08-07

## Current Task: Google deindexed the opening pages — put content in the HTML

Impressions fell 111 → 4 between 30 and 31 July and did not recover. No deploy
that day (production ran one docs-only commit, `8dcf63bf`, from 27 July to 2
August), no manual action, and the site verified healthy end to end — robots,
sitemaps, canonicals, meta, DNS and the content API are all correct.

**A quality purge, not a break.** Search Console still lists 5.01k indexed while
URL Inspection says otherwise on the same URLs — the Pages report lags ("Last
crawled 25 Jul"), so they went after its last data point. Google had already
refused 3,074 others (2,807 "Discovered – currently not indexed", 267
crawled-and-declined). Only brand queries survive. The cause is in the CTR:
0.5–2.9% at position ~11 for a month against 2–3% expected, because all 12,377
pages advertised themselves with one template sentence over an empty `#root`.
The asset that earns the click — a ~470-char description, win rates over
millions of games — existed only after JS ran.

TASK009 named this escalation itself ("if indexing remains poor 4–6 weeks after
Option B, pre-render"). Done for all 12,377 rather than the top 200.

- `seo-lookup` shards carry description + win rates + canonical FEN; 16 → 64
  shards, ~180 KB each.
- `middleware.ts` renders `<h1>`, ECO, moves, description and real win rates
  into `#root`; React replaces it on mount, so it is the pre-hydration state.
- Unknown FEN → **404**. A _failed_ shard fetch is a different answer and fails
  open at 200 — the review pass caught that collapsing the two would de-index
  every page on a CDN blip.
- `buildOpeningDescription` (`lib/siteConfig.ts`) is shared with
  `OpeningDetailPage`, whose `<meta>` React 19 hoists _beside_ the middleware's
  rather than replacing it. The page stopped rendering its own canonical and
  `og:url`, which contradicted the middleware on 1,677 pages.
- Those 1,677 duplicate-name and "<parent>, <move>" pages canonicalise to the
  page that owns the name; sitemaps carry the 10,700 canonical pages, ordered by
  game volume so crawl budget lands on what people search for.
- `scripts/generate-sitemaps.js` is new — there was no generator, hence
  `lastmod 2026-06-02`. The redundant flat `sitemap.xml` is gone.

865 backend + 590 frontend tests pass; type-check and `build:vercel` clean.

## Previous Task: Search that answers in milliseconds, on all three surfaces

Fuse over 12,377 descriptions cost 1–2.8s and matched a third of the corpus;
`search/NameIndex.js` matches names literally in 2–6ms, banded and ordered by
`games_analyzed`. One shared index slice for all three surfaces, fetched on the
first keystroke rather than on mount. Detail in `archive.md`.
