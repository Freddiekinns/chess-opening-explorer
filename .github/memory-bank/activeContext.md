# Active Context

**Date:** 2026-08-28

## Current Task: The corpus had no crawl graph

The July de-indexing fix worked — production serves real pre-hydration content
and all 12,377 openings have their own description — but impressions did not
recover. Search Console, 90 days to 2026-08-26: 5,750 pages indexed earning
4,810 impressions at average position 12. **Indexed and not served.**

Nothing linked into the corpus. `OpeningNavigator` and `OpeningTree` do link
openings to their ancestors and siblings, but only in the React render, so the
pre-hydration body was a dead end and the sitemap was Google's sole route in.
3,615 pages sat in "Discovered — currently not indexed".

Shipped: ancestor and related-opening links in the pre-render (`SeoEntry` slots
10-12, built by `TreeService` at build time); unknown paths 404 rather than
serving the landing page at 200, driven by a shared `STATIC_ROUTES` constant
that `App.tsx` type-checks against; `/personal-explorer` moved to a
`vercel.json` 301; sitemap `lastmod` from the data's mtime, not the deploy.

Two corrections found by running it. Ancestor chains average 9.7, not the 2.6 a
300-row sample of ecoA's head suggested — the design was measured on shallow
root positions. And deduplicating by FEN barely helps because chains repeat
names, not positions: the generator now matches `deduplicateAncestors` and caps
at root plus the two nearest. `SHARD_COUNT` 64 → 96 to keep shards at 162 KB
mean, 224 KB largest.

Deferred with reasons in `docs/proposals/2026-08-28-crawl-graph-design.md` §7:
slug URLs (696 slugs collide across 2,142 pages) and family/ECO hub pages.

**Success metric: "Discovered — currently not indexed", 3,615 on 2026-08-28,
re-checked in four to eight weeks. Not impressions.**

## Previous Task: The Accelerated Dragon page had the wrong videos, four ways

A description is not a subject (series cross-links scored +60 past the
intra-family guard); an alias can be the page's own family name; the matching
corpus was a ratchet until `lib/enrichment-corpus.js` read the cache back (1,733
→ 6,903 videos, zero API calls); ties fell to view count until `variation_rank`
was persisted, because the SQL re-derives the displayed order. 6,010 of 12,377
pages changed; specificity 47.7% → 54.2%. Detail in `archive.md`.
