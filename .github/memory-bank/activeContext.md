# Active Context

**Date:** 2026-08-10

## Current Task: The Accelerated Dragon page had the wrong videos, four ways

Reported: the page led with Alapin, Scheveningen and Prins lectures while the
obvious YouTube results for "accelerated dragon" (Naroditsky, Seirawan, six
figures of views each) were nowhere. Four causes, each confirmed against the
real corpus before anything changed.

**A description is not a subject.** Series descriptions cross-link their sibling
episodes ("The theory of the Accelerated Dragon: https://youtu.be/…"), so every
Hanging Pawns Sicilian lecture name-matched every other Sicilian page at
`content_exact` +60 — above a family match, and past the intra-family guard,
which only fires for `matchType === 'family'`. Five of that page's ten videos
came from one link. A description hit now counts on a variation page only when
the **title** names it too. "Variation page" is the colon in the name, not
whether `analyzeVariationMatch` found segments — a one-short-word variation
("Kan") yields none, and calling that a family page let the cross-links back in.

**An alias can be the page's own family name.** `parseAliases` splits on commas,
so `"Sicilian Defense, O'Kelly Variation"` gave the Kan page a bare
`"Sicilian Defense"` alias — a title match worth 80 on every generic Sicilian
video, past both guards. The Kan page led with a Najdorf lecture at 165.

**The corpus was a ratchet.** Matching writes back only the top 10 per opening,
so `videos` held 1,733 of the 10,190 ever fetched and `pipeline:rematch`
re-scored that table — a better scorer could only reshuffle a worse one's
survivors. `lib/enrichment-corpus.js` reads the cache back as matcher input:
1,733 → 6,903 videos, zero API calls. Tiers go through `lib/channel-tiers.js`,
normalised to letters and digits — the config says "Chess Network", the channel
is `ChessNetwork`, and a raw compare cost it 60 points and 183 videos.

**Ties fell to view count.** Short variation names get no specificity swing, so
their candidates all tie and a Maróczy Bind lecture led the Smith-Morra page.
Ties now break on how much of the variation the title names — persisted as
`opening_videos.variation_rank`, because `getTopVideosForOpening` re-derives the
displayed order in SQL and fixing only the JS sort changed nothing at all.

6,010 of 12,377 pages changed; #1 names the variation on 47.7% → **54.2%** of
sub-variation pages, top-3 49.5% → 55.7%, contamination 0%, median
pages-per-video 11 → 6. Coverage 72.7% → 72.1%, top-200 183 → 178 — pages no
longer seated on a cross-link or a family-name alias fall back to a labelled
family shelf.

## Previous Task: Google deindexed the opening pages — put content in the HTML

All 12,377 pages advertised one template sentence over an empty `#root`, so
Google purged them on quality (impressions 111 → 4). `middleware.ts` now renders
h1, ECO, moves, description and real win rates into `#root` from 64 `seo-lookup`
shards; canonicals fold only the 271 same-board FENs. Detail in `archive.md`.
