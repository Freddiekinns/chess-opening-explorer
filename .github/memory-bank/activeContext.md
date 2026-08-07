# Active Context

**Date:** 2026-08-07

## Current Task: Google deindexed the opening pages — put content in the HTML

Impressions fell 111 → 4 between 30 and 31 July and did not recover. No deploy
that day: production ran one docs-only commit (`8dcf63bf`) from 27 July to 2
August. Site verified healthy end to end — robots, sitemaps, canonicals, meta,
DNS, content API all correct. No manual action in Search Console.

**It was a quality purge, not a break.** Search Console still lists 5.01k
indexed but URL Inspection says otherwise on the same URLs — the Pages report
lags (examples read "Last crawled 25 Jul"), so those pages were dropped after
its last data point. Google had already refused 3,074 more (2,807 "Discovered –
currently not indexed", 267 crawled-and-declined). Post-drop only brand queries
survive.

The cause is legible in the CTR: 0.5–2.9% at position ~11 for a month, against
2–3% expected. Every one of 12,377 pages advertised itself with the same
sentence — "Explore the {name} ({eco}). Played after {moves}. Learn key ideas…"
— over an empty `#root`. The real asset (a ~470-char description, win rates over
millions of Lichess games) existed only after JS ran.

TASK009 predicted this exact escalation: "if indexing remains poor 4–6 weeks
after deploying Option B, pre-render". Done for all 12,377 via middleware rather
than the top 200, because the payload is small text.

- `seo-lookup` shards carry description + win rates + canonical FEN; 16 → 64
  shards, ~180 KB each.
- `middleware.ts` renders `<h1>`, ECO, moves, description and real win rates
  into `#root` — React replaces it on mount, so it is the page's pre-hydration
  state. Meta description is now the opening's own, truncated on a sentence
  boundary.
- Unknown FEN → **404**, not the landing page at 200 (30 soft 404s reported).
- 1,677 duplicate-name and "<parent>, <move>" pages canonicalise to the page
  that owns the name; sitemaps carry the 10,700 canonical pages, ordered by game
  volume so crawl budget lands on the openings people search for.
- `scripts/generate-sitemaps.js` is new — sitemaps had no generator and had said
  `lastmod 2026-06-02` since June. The redundant flat `sitemap.xml` is gone.

858 backend + 590 frontend tests pass; type-check and `build:vercel` clean.

## Previous Task: Search that answers in milliseconds, on all three surfaces

Fuse over 12,377 descriptions cost 1–2.8s and matched a third of the corpus;
`search/NameIndex.js` matches names literally in 2–6ms, banded and ordered by
`games_analyzed`. One shared index slice for all three surfaces, fetched on the
first keystroke rather than on mount. Detail in `archive.md`.
