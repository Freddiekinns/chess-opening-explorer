# Active Context

**Date:** 2026-08-10

## Current Task: The Accelerated Dragon page had the wrong videos, twice over

Reported: the page led with a Naroditsky speedrun that does cover it, then
Alapin, Scheveningen, Prins and a Yugoslav Attack Dragon — while the obvious
YouTube results for "accelerated dragon" (Naroditsky, six figures of views each)
were nowhere. Two independent causes, both confirmed against the real corpus
before anything changed.

**Over-matching: a description is not a subject.** Series descriptions
cross-link their sibling episodes ("The theory of the Accelerated Dragon:
https://youtu.be/…"), so every Hanging Pawns Sicilian lecture name-matched every
other Sicilian page at `content_exact` +60 — above a family match, and it
bypassed the intra-family variation guard, which only fired for
`matchType === 'family'`. Five of the page's ten videos came from that one link.
A description hit now counts on a sub-variation page only when the **title**
names the variation too; otherwise the video must earn its place on the family
path, where the guard applies.

**Under-matching: the corpus was a ratchet.** Matching writes back only the top
10 per opening, so `videos` held 1,733 of the 10,190 videos ever fetched, and
`pipeline:rematch` re-scored that table — a better scorer could only reshuffle a
worse one's survivors. Seirawan's 455k-view lecture and two Naroditsky theory
speedruns score 155–175 today and had simply left the corpus.
`lib/enrichment-corpus.js` reads `video_enrichment_cache.json` back as matcher
input, taking the matching corpus from 1,733 videos to 6,834 at zero API cost.

**Ranking: ties fell to view count alone.** The ±65 specificity swing needs a
variation word of six characters or more, so short names (Smith-Morra, Prins,
O'Kelly) tie their whole candidate list — a Maróczy Bind lecture led the
Smith-Morra page. Ties now break on how much of the variation the title names.
The rule lives in two places — `compareMatches` picks the top 10, SQL re-derives
the displayed order — so the rank is persisted on `opening_videos`. Fixing only
the JS half changed nothing: the SQL re-sorted by views on the way to the JSON.

Not local to one opening: **6,010 of 12,377 pages** changed their list. #1 names
the variation on 47.7% → **52.7%** of sub-variation pages, top-3 49.5% → 53.2%,
contamination stays 0%, blanketing fell (median pages-per-video 11 → 6, distinct
videos 1,242 → 1,518). Coverage 72.7% → 71.3%, top-200 183 → 180: 195 pages lost
matches that were only ever a cross-link; the family fallback covers them.

## Previous Task: Google deindexed the opening pages — put content in the HTML

All 12,377 pages advertised one template sentence over an empty `#root`, so
Google purged them on quality (impressions 111 → 4). `middleware.ts` now renders
h1, ECO, moves, description and real win rates into `#root` from 64 `seo-lookup`
shards; canonicals fold only the 271 same-board FENs. Detail in `archive.md`.
