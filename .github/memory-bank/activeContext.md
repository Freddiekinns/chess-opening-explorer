# Active Context

**Date:** 2026-08-28

## Current Task: The corpus had no crawl graph

The July de-indexing fix worked — production serves real pre-hydration content
and all 12,377 openings have their own description — but impressions did not
recover. Search Console, 90 days to 2026-08-26: 5,750 pages indexed earning
4,810 impressions at average position 12. **Indexed and not served.** Nothing
linked into the corpus: the navigator links existed only in the React render, so
the sitemap was Google's sole route in and 3,615 pages sat in "Discovered —
currently not indexed".

**Shipped and verified live** (PRs #80, #81, #82): ancestor and related-opening
links in the pre-render (`SeoEntry` slots 10-12, built by `TreeService`);
unknown paths 404 via a shared `STATIC_ROUTES` constant `App.tsx` type-checks
against, with trailing slashes 308ing to the canonical form;
`/personal-explorer` a `vercel.json` 301; link targets mapped through
canonicals; `SHARD_COUNT` 64 → 96. The audit gate now runs on Windows.

**Four corrections the design missed, all found by running it, all recorded in
`docs/proposals/2026-08-28-crawl-graph-design.md` §9.** Ancestor chains average
9.7 not 2.6 (the sample was ecoA's shallow head), so the breadcrumb dedupes by
consecutive name like `deduplicateAncestors` and caps at root plus two.
`lastmod` was wrong twice — mtime does not survive CI, then `git log` returned
the shallow-clone graft boundary, shipping 2026-07-27 where the truth is
2026-06-06. **Production now emits no `lastmod` at all**, deliberately.

The recurring failure was verifying on the machine at hand: a Windows-only green
suite, a Linux-only wrong path, a shallow-clone-only wrong date. Both rules are
in `AGENTS.md` now.

**Success metric: "Discovered — currently not indexed", 3,615 on 2026-08-28,
re-checked in four to eight weeks. Not impressions.**

## Previous Task: The Accelerated Dragon page had the wrong videos, four ways

A description is not a subject (series cross-links scored +60 past the
intra-family guard); an alias can be the page's own family name; the matching
corpus was a ratchet until `lib/enrichment-corpus.js` read the cache back (1,733
→ 6,903 videos, zero API calls); ties fell to view count until `variation_rank`
was persisted, because the SQL re-derives the displayed order. 6,010 of 12,377
pages changed; specificity 47.7% → 54.2%. Detail in `archive.md`.
