---
name: video-pipeline
description:
  Run or modify the YouTube video discovery pipeline that matches chess videos
  to openings. Use when refreshing the video index, changing matcher scoring or
  channel config, debugging why a video ranks on the wrong opening, or auditing
  video coverage and contamination.
---

# Video pipeline

Discovers YouTube videos from trusted channels and matches them to openings.
Output is `api/data/video-index.json` — written directly by the pipeline, no
copy step. Database is `tools/data/videos.sqlite`.

## Modes

```bash
npm run pipeline          # incremental: RSS discovery, free, the default
npm run pipeline:full     # full catalogue rebuild via YouTube API, needs key
npm run pipeline:rematch   # re-score existing videos, zero API cost
```

Legacy standalone steps (`pipeline:complete`, `pipeline:discover`,
`pipeline:prefilter`, `pipeline:enrich`, `pipeline:match`) still work but are
superseded by the modes above.

`YOUTUBE_API_KEY` in `.env` is required for `full`. YouTube allows 10,000 quota
units/day; RSS is free.

## The corpus is the cache, not the database

`pipeline:rematch` scores the `videos` table **plus every other video in
`tools/data/video_enrichment_cache.json`** (`lib/enrichment-corpus.js`).

The table only holds past winners — matching writes back the top 10 per opening
and nothing else, so it carries ~1,700 of the ~10,200 videos ever fetched.
Scoring it alone is a ratchet: a better scorer can only reshuffle the previous
one's survivors. Never "simplify" rematch back to a DB-only read.

## Three things the scorer deliberately distrusts

- **A description mention is not a subject.** Series descriptions cross-link
  their sibling episodes, so on a sub-variation page a description/tags hit only
  counts when the title names the variation as well.
- **A score tie is not a coin toss.** Short variation names (Smith-Morra, Prins,
  O'Kelly) get no specificity swing by design, so their candidates all tie;
  `compareMatches` breaks that on how much of the variation the title names,
  before view count. Do not reduce it to popularity again.
- **An opening's alias list can contain its own family name.** `parseAliases`
  splits ECO alias strings on commas, so `"Sicilian Defense, O'Kelly Variation"`
  gives the **Kan** page a bare `"Sicilian Defense"` alias. Matched as a name,
  that scored every generic Sicilian video 80 on a specific sub-variation page —
  above any real variation match, and past both guards, because the intra-family
  guard only fires for family matches and the corroboration rule only for
  content matches. Aliases equal to the page's family prefix are skipped; the
  video can still qualify through the family path, which is policed.

## A page's family comes from its ECO code, not its name

`lib/opening-families.js` gives the page's family (ECO) and the title's
(`getFamiliesFromTitle`). When they agree the video is a family match, and a
name match on the family's own root page. Never add a family to a list inside
the matcher: the two lists this replaced compared `kings indian` and `caro kann`
with names carrying an apostrophe or hyphen and had no "QGD", so "QGD: …" pages
were 5% covered beside "Sicilian: …" at 99%.

The title's family now admits videos as well as vetoing them, so a family word
that means something else needs a detector of its own ("King's Indian Attack")
or masking ("\<word\> Variation", "Stonewall Attack"). Check `audit`'s "worst
prefixes" lines after any change here.

A word can be a variation keyword and a family ("Grünfeld", "Benoni"), and a
page name can spell an umlaut out ("Saemisch", "Gruenfeld"). Both hid whole
prefixes from the titles naming them; `namesSpecificVariation` takes the page's
family and `normalizeForMatch` folds the listed spellings.

## A video is an overview or a variation video, once

`applyVideoLevels` sets `videos.level` per run: `variation` when the title names
a line, else `overview`. Root pages demote variation videos (-40, unless the
page's own name covers the line) and lift introductions (+30, speedruns
excluded); variation pages drop a video that names only other lines; index
entries carry `level: "variation"`; the API's family shelf ranks overviews
first. Do not re-derive the level anywhere else. Before it existed the Sicilian
root page led with ten sub-variation lectures.

A segment made only of the title's own family words is not a named line ("King's
Indian Attack: Sicilian Variation" exists, and would mark every Sicilian
introduction a variation video).

A bounded view-count bonus (0–20) is added only to scores already over the
threshold. Keep it under the ±65 specificity swing: views may reorder like for
like, never outrank a video that names the variation, never create a match, and
never keep a demoted one (the root-page test subtracts it).

## A creator's third video on a page gives way

`spreadCreators` takes 20 off a creator's third and later videos on one page
(36% of pages showed three or more of their four visible videos from one
channel). It changes `match_score` because the SQL order is derived from it, and
it stops above any video naming less of the variation. Do not turn it into a
re-ordering that leaves scores alone: the SQL would undo it.

## Per-opening order is decided twice

`compareMatches` (`lib/video-matcher.js`) picks the top 10;
`getTopVideosForOpening` (`database/schema-manager.js`) re-derives the
**displayed** order in SQL. They must break ties identically, which is why
`variation_rank` is persisted on `opening_videos` rather than kept in memory.
Adding the tie-break to the JS half alone changed nothing — the SQL re-sorted by
view count on the way to the JSON, and the symptom looked exactly like the fix
not working.

## Before a rematch, backfill

Rematch does not re-fetch from YouTube. So `view_count` and `thumbnail_url` go
stale (recovered cache videos most of all), and on databases created before the
`description`/`tags` columns existed, content matches are scored from titles
alone.

```bash
node tools/video-pipeline/scripts/backfill-views.js   # ~35 API calls for ~1700 videos
npm run pipeline:rematch
```

Run the backfill **once before** a rematch to populate views, thumbnails,
descriptions and tags.

## After any scorer or data change, audit

```bash
node scripts/audit-video-matches.js
```

Checks coverage (with the worst-covered name prefixes), root pages led by a
variation video, creator share of #1 slots, variation specificity, cross-family
contamination, and ranking ties. Treat a rise in contamination or a fall in
top-200 coverage as a regression.

## Jev filters the index after the scorer

Every mode ends with `scripts/apply-jev-filter.js`, which removes a pair from
`video-index.json` when Jev says the video is `mentioned_only` or `not_about`
that page with P(good) < 0.4. The scorer's output in SQLite is untouched, so **a
video the matcher kept can still be missing from the page** — check
`tools/data/jev-relation-cache.json` before debugging the scorer.

- Only confident rejections act. Jev's acceptances are unreliable on sibling
  variations, so never use them to rank.
- Answers are cached per video and named opening and committed; only new pairs
  are paid for. It fails open without `JEV_API_KEY`. The key comes from
  console.typesafe.ai; `jevtypesafeai.com` is an unaffiliated reseller.
- `video-index.json` therefore holds fewer videos than SQLite's
  `opening_videos`, and a page the filter empties shows its family shelf.
- Then `config/video_pins.json` puts hand-verified videos first on their named
  opening's pages (`lib/video-pins.js`). A video on a page that the scorer never
  matched is probably a pin. Pin only what Jev and the judge agree on, never on
  Jev's word alone.
- After a scorer change, the audit's "#1 names the variation" dips slightly
  under the filter. That metric is a keyword test, and most of what Jev removes
  there is a keyword false positive. Sample the changed pages before treating it
  as a regression.

## Configuration

- `config/video_matching.json` — scoring weights, `variation_modifiers`
  (accelerated/semi/anti/…), `specific_variation_keywords`
- `config/youtube_channels.json` — the 16 trusted channels and their tiers. This
  is the single source of truth; never hardcode channel lists in matcher code.

Resolve channel tiers through `lib/channel-tiers.js`, which normalises titles to
letters and digits before comparing: the config's display name is not the
YouTube channel title ("Chess Network" vs `ChessNetwork`), and a raw string
compare silently demoted that premium channel to the unknown tier — 60 scoring
points and a stricter duration gate that withheld 183 of its videos from the
corpus. `repo-invariants.test.js` fails on a channel name or ID literal in
`lib/`.

Never guess a YouTube channel ID. Verify with the user, or test the RSS feed at
`https://www.youtube.com/feeds/videos.xml?channel_id={ID}`.

## Automation

`.github/workflows/video-refresh.yml` runs the incremental pipeline monthly,
audits before and after, and opens a PR with the metric diff. It fails fast at
guard steps until `tools/data/videos.sqlite` is committed and the
`YOUTUBE_API_KEY` repo secret is set. The `JEV_API_KEY` secret is optional:
without it, new pairs go unfiltered.

Full architecture, matcher internals and troubleshooting:
`tools/video-pipeline/README.md`.
