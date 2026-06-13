# Video Pipeline Assessment — Quality & Effectiveness (2026-06-13)

> **Status update (same day):** Tier 1 + Tier 2 fixes below are implemented on
> this branch, plus the audit harness (`scripts/audit-video-matches.js`). See
> "Implementation status" at the end of this document for verified before/after
> metrics. Deferred: scheduling (owner runs the pipeline manually), hub-page
> family fallbacks, channel expansion, LLM classification.

Assessment of `tools/video-pipeline/` against its aim: **make high-quality
educational YouTube content from trusted educators available to users, matched
to the opening they are viewing.** Method: code review of the current pipeline
(discovery → pre-filter → enrichment → matching → serving) plus quantitative
measurement of the **live output** (`api/data/video-index.json`, generated
2026-03-15) against the ECO dataset and `popularity_stats.json`. All numbers
below are reproducible with the snippets in each section; nothing is estimated.

Prior art: `tools/video-pipeline/REVIEW.md` (2026-02-03 code review). Several of
its findings have since been fixed (double educational bonus, abbreviation gaps,
matcher tests now exist) — this assessment measures what the pipeline actually
produces today rather than re-reviewing the code in isolation.

## Verdict

The architecture is sound and the **provenance guarantee is the pipeline's
biggest strength**: only 16 hand-curated educator channels can ever enter the
index, so the "high quality educational content from educators" half of the aim
is largely achieved by construction. The flagship pages look good — the
Najdorf's top 3 are exactly the videos a coach would pick.

The "**matched by the opening**" half is where quality degrades. Matching is
title-substring heuristics, and the measured output shows three systemic
symptoms: family-generic videos blanketing hundreds of sub-variation pages, ~6%
outright wrong-family matches via shared variation names, and a saturated scorer
that cannot rank its own top picks (85% of pages have ties inside the displayed
top 4). Plus the index is 3 months stale with no automation, and one pre-filter
regex bug silently rejects some of the best educational content.

| Dimension                             | Rating | Evidence                                         |
| ------------------------------------- | ------ | ------------------------------------------------ |
| Educator provenance / content quality | ★★★★★  | Closed allowlist; no random search results       |
| Architecture & cost efficiency        | ★★★★☆  | Clean stages, 3 modes, RSS-first (~0 quota)      |
| Family-level match accuracy           | ★★★★☆  | 94% of family-detectable matches agree           |
| Variation-level match relevance       | ★★☆☆☆  | 37% of sub-variation pages' #1 video is specific |
| Ranking discrimination                | ★★☆☆☆  | 50% of matches in one score bucket; mass ties    |
| Coverage of popular openings          | ★★★☆☆  | 75% of top-200 played positions; hub pages = 0   |
| Freshness / operations                | ★★☆☆☆  | Index 3 months old; no scheduled runs            |

## What works well

- **Closed channel allowlist** (`config/youtube_channels.json`, 16 channels:
  Naroditsky, Hanging Pawns, St. Louis Chess Club, John Bartholomew,
  ChessExplained, etc.). The pipeline never matches arbitrary YouTube search
  results, so junk content is structurally impossible, not just penalised.
- **Cheap, layered funnel**: RSS discovery (0 API units) → title pre-filter →
  batch enrichment (1 unit/video) → scoring. Incremental, full, and rematch
  modes are the right operational shapes.
- **Real anti-noise machinery in the scorer** (`lib/video-matcher.js`):
  ECO-derived family compatibility with severe-incompatibility rejection,
  game-analysis term penalties (−60), `Player vs Player` regex (−60),
  cross-opening title rejection for content-only matches, 2-word alias minimum,
  sub-variation penalty. The 2026-03-16 overindexing fix demonstrably helped at
  the family level: only 6% of family-detectable matches cross families.
- **Feb review follow-through**: the double educational bonus is gone, the
  abbreviation map now covers London/Najdorf/Dragon/Berlin/etc., the severe
  incompatibility list grew, and `video-matcher.test.js` exists (the Feb
  review's top action item).

## Measured findings

### 1. Family-generic videos blanket sub-variation pages (top issue)

Each opening page takes its top-10 by score, but the same family-level video
matches every sub-variation of that family:

- One Naroditsky **Alapin** video sits on **383 different Sicilian pages**; 55
  videos each appear on >100 pages; median spread is 8 pages per video.
- On **sub-variation pages** (name contains `:`), the **#1 video mentions the
  variation only 36.9%** of the time (1,096/2,970); within the whole top-3 it is
  still only 42.1%. The user on "Sicilian Defense: Najdorf Variation" sees
  Alapin, Tal Gambit, Closed Sicilian, and even "Reversed Sicilian (1.c4 e5) ·
  English Opening Theory" videos in their top 10.

Root cause: family match (+50) or content match (+60) plus channel (+40) and
educational (+30) bonuses easily clear the 60 threshold, while the sub-variation
penalty is only **−15**. A variation-specific video has no reliable scoring
advantage over a family-generic one.

### 2. Shared variation names cause wrong-family matches at high scores

Of 13,874 match rows whose video title names a detectable family, **831 (6.0%)
sit on a page from a different family**. The driver is variation-name collisions
matching through the alias/partial paths:

- "Caro-Kann, Exchange Variation" (NM video) on **Queen's Gambit Declined:
  Chigorin, Exchange Variation** at score 135.
- "Nimzo-Indian, Classical Variation" on **Scotch Game: Classical Variation**
  pages at 135.
- "French, Steinitz Variation" (Naroditsky) on **Scotch Game: Steinitz
  Variation** at 130; "French, Rubinstein" on **Four Knights: Rubinstein**.

The severe-incompatibility list is an enumerated pair list and inherently
incomplete (`caro_kann`↔`queens_gambit` missing; Alekhine, Scotch, Benoni, Four
Knights aren't detectable families at all). The data to do this properly already
exists: every ECO record has a `moves` field, so family compatibility could be
derived from move-sequence prefixes instead of name heuristics.

### 3. Score saturation: the scorer cannot rank its own top picks

- Score distribution across all 22,145 match rows: **50% land in the 160–179
  bucket** (typical max: 80 title + 30 educational + 40 premium + 15 duration =
  165).
- **2,360 of 2,789 pages (85%) with ≥2 videos have score ties inside the top-4**
  — exactly the slots `VideoGallery` displays (`INITIAL_DISPLAY_COUNT = 4`).
  Order among ties is array order, i.e. arbitrary.
- View count, recency, and the config's `boost_factor`/`priority` fields are
  **never used in ranking** (`boost_factor` is dead config). A 693k-view St.
  Louis lecture and a 420-view upload tie or near-tie.

### 4. Pre-filter regexes lack word boundaries and reject prime content

`lib/candidate-filter.js` exclusion patterns match substrings (verified):

- `fun` rejects **"Chess Opening Fundamentals"** — while `fundamentals` is in
  the matcher's own `strongEducationalTerms` list. One module's strongest
  positive signal is another module's rejection.
- `live` rejects "…**deliver**s a masterclass"; `round` rejects "Back**ground**
  of the Najdorf" / "a **ground**ed repertoire".
- `blitz|bullet|rapid` reject legitimate "Blitz Repertoire" teaching videos
  (flagged in Feb review, still present).

These videos are dropped at discovery time and can never be recovered by the
scorer. Same class of bug exists in the matcher's own `preFilterVideo`
(`'match'`, `'round'` as substrings) and in 2-char auto-generated initials
matched with `title.includes()` (e.g. `kid` matching "kidding").

### 5. Coverage: good for variations, zero for the highest-traffic hubs

- **3,490 of 12,373 pages (28.2%)** have ≥1 video; 917 unique videos total.
- **150 of the top-200 most-played positions (75%)** have videos. The 50 misses
  are systematic, not random:
  - **Hub pages with the most traffic have nothing**: King's Pawn Game (3.8B
    games), King's Knight Opening, Hungarian Opening, Queen's Pawn Game.
  - **Openings whose canonical name contains move notation can never match a
    title**: "Scandinavian: 2.exd5", "Caro-Kann: 2.Nf3", "Pirc: 2.Nf3", "Indian:
    2.Bf4" — `title.includes("scandinavian: 2.exd5")` is structurally false, and
    the alias/abbreviation paths don't rescue most of them.

### 6. Rematch is lossy: descriptions and tags are never persisted

The `videos` table stores no `description`/`tags`. `full` and `rematch` modes
rebuild matches from DB rows with `description: ''`, `tags: []` — so every
**content-based match (+60) silently disappears on the next rematch**, and the
cross-opening title check loses its inputs. The CLAUDE.md gotcha documents the
view-count/thumbnail loss, but the match-evidence loss is worse: rematch is
advertised as "re-score with updated scorer", yet it actually re-scores with
**less information** than the original run.

### 7. Staleness: 3 months old, structurally unrecoverable via RSS

Index generated **2026-03-15**; newest video published 2026-03-15. There is no
scheduled workflow (`.github/workflows/` has only CI + coverage). YouTube RSS
feeds expose only the ~15 most recent uploads per channel, so any gap longer
than a channel's 15-video window is a **permanent** miss for incremental mode —
recovery requires the API-expensive `full` mode. Three months of Naroditsky,
Hanging Pawns, and St. Louis uploads are currently absent.

### 8. Smaller defects

- **FEN sanitisation collisions**: static filenames lowercase the FEN,
  destroying piece-colour case. 12,377 ECO positions → 12,373 index entries; 4
  position pairs merge (e.g. `…3pPP2…` vs `…3PPp2…`), one opening of each pair
  silently loses its video file.
- **Config drift, three sources of truth**: channel tiers live in
  `config/youtube_channels.json`, but the scorer hardcodes its own
  `premiumEducators`/`goodEducators` arrays that disagree (config: Hanging
  Pawns + GingerGM = `standard`; code: premium).
  `config/video_quality_filters.json` is a stale near-duplicate (4 channels,
  different parameters) referenced only by the legacy API-side
  `packages/api/src/services/video-processor.js`, not by the pipeline.
- **Threshold and weights are magic numbers** in code (`score >= 60`, all
  bonuses), so tuning requires code changes and a rematch (which is lossy, see
  #6).

## Recommendations (prioritised)

### Tier 1 — Serving-side fixes, no new data needed (days)

1. **Add tiebreakers + demote family-generic videos.** Rank by (a) variation
   specificity — does the title mention the variation tokens of this exact page;
   (b) log-scaled view count; (c) recency. Alternatively raise the sub-variation
   penalty from −15 to something that actually reorders (−40+) and add
   `ORDER BY match_score DESC, view_count DESC`. This alone fixes the 85%-ties
   problem and most of finding 1 without touching discovery.
2. **Fix the pre-filter word boundaries** (`\b(?:blitz|bullet|…)\b`), remove
   `fun`, and exempt titles containing strong educational terms from casual
   exclusions. Cheap, recovers a class of excellent videos.
3. **Fix FEN-case collisions** in `static-file-generator`/consolidator (encode
   case, e.g. uppercase→prefix, instead of lowercasing).
4. **Persist `description` and `tags`** in the videos table so rematch re-scores
   with full evidence.

### Tier 2 — Matching correctness (1–2 weeks)

5. **Derive family compatibility from moves, not names.** ECO records carry
   `moves`; compute each opening's first 2–3 moves and require the video's
   detected family (or its known move prefix) to be compatible. Retires the
   incomplete pair list and fixes the Tartakower/Rubinstein/Steinitz/Exchange
   collisions (finding 2) generically: a "Caro-Kann Exchange" video can never
   reach a 1.d4 d5 page.
6. **Handle move-notation opening names** ("Scandinavian: 2.exd5"): match on the
   family display name (`family_display_name` already exists in ECO data) plus
   move-prefix containment, instead of full-name substring.
7. **Externalise weights/threshold** into config so tuning doesn't require code
   edits; collapse the three channel-config sources into one.

### Tier 3 — Coverage, freshness, operations (ongoing)

8. **Schedule `npm run pipeline` weekly** (GitHub Action committing the
   regenerated index, or a documented manual cadence). RSS's 15-video window
   makes frequency a correctness requirement, not a nicety.
9. **Deliberate family-level fallback for hub pages**: King's Pawn Game and
   friends are the highest-traffic pages with zero videos. Serve clearly
   labelled family-level videos ("About the Sicilian in general") rather than
   nothing — mirrors Option C of the common-plans proposal (PR #40): make
   family-level content a deliberate, labelled choice instead of an accident.
10. **Expand the educator allowlist** (channel IDs must be user-verified per
    CLAUDE.md — candidates to consider: ChessDojo, Chess Vibes, Daniel King's
    PowerPlayChess is already in; review which current channels actually produce
    opening content).

### Tier 4 — Step change: classify videos once with an LLM

The corpus is tiny (917 videos; ~50–100 new/month) and the project already has
Gemini enrichment infrastructure (`tools/llm-enrichment/`). A one-time
classification per video — opening family + specific variations covered (as ECO
ranges/move prefixes), educational-vs-entertainment, target level — cached in
the DB would replace the entire title-heuristic stack for matching, while the
allowlist keeps provenance. Title heuristics remain as the zero-cost fallback.
This is the only path that meaningfully fixes variation-level relevance
(finding 1) for videos whose titles don't name the variation.

### Evaluation harness (do this alongside any fix)

Repo precedent: `scripts/audit-common-plans.js` (PR #40). Add
`scripts/audit-video-matches.js` computing, from `video-index.json` + ECO +
popularity data, the four regression metrics measured here:

| Metric                                         | Today | Target |
| ---------------------------------------------- | ----- | ------ |
| Cross-family matches (of family-detectable)    | 6.0%  | <1%    |
| Sub-variation pages whose #1 video is specific | 36.9% | >60%   |
| Pages with score ties inside displayed top-4   | 85%   | <20%   |
| Top-200 played positions with ≥1 video         | 75%   | >90%   |

Plus index age in days (alert >14). Any scorer change should be validated
against these numbers before a rematch is committed — today there is no way to
tell whether a "fix" helped or hurt.

## Implementation status (2026-06-13, same branch)

Tier 1 + Tier 2 implemented and verified end-to-end by rebuilding a database
from the 917 videos in the live index and running the new matcher — i.e. a
faithful simulation of `pipeline:rematch` (titles only; content matches will add
more once descriptions are backfilled). Metrics from
`scripts/audit-video-matches.js`, identical logic on both indexes:

| Metric                                 | Before | After | Target  |
| -------------------------------------- | ------ | ----- | ------- |
| Cross-family matches                   | 7.9%¹  | 0%    | <1% ✅  |
| Sub-variation pages with specific #1   | 36.9%  | 57.6% | >60% △  |
| Ambiguous ordering in displayed top-4  | 85%²   | 0%    | <20% ✅ |
| Top-200 played positions with ≥1 video | 75%    | 81.5% | >90% △  |
| Openings with ≥1 video                 | 28.2%  | 71%   | —       |

¹ 7.9% as measured by the final (finer-grained) family detector; 6.0% with the
coarse 10-family detector quoted in finding 2. ² Score ties; ordering is now
deterministic (score → views → recency), so ambiguity is 0 by construction.

The two △ metrics are bounded by deferred work: the top-200 misses are almost
entirely generic hub pages (King's Pawn Game, King's Knight Opening) that need
the deliberate family-fallback (recommendation 9), and #1-specificity is limited
by openings whose variations simply have no dedicated videos — the LLM
classification (Tier 4) is the lever there.

**What shipped** (see `tools/video-pipeline/README.md` for usage):

- `lib/opening-families.js` — move-prefix family compatibility replacing the
  enumerated pair list; multi-opening titles reject only when every named family
  conflicts; compound detectors (Reversed Sicilian → English, Anglo-X → English)
  mask their components.
- Variation specificity ±65-point swing (+25 specific / −40 miss); generic
  shared-variation aliases ("Exchange Variation") skipped outright.
- Move-notation names ("Scandinavian: 2.exd5") match via their family part.
- View-count → recency tiebreakers in the matcher and `getTopVideosForOpening`.
- Pre-filter word boundaries + educational exemption ("Blitz Repertoire" now
  passes; "Fundamentals"/"delivers"/"background" no longer rejected).
- Weights/threshold in `config/video_matching.json`; channel tiers read from
  `config/youtube_channels.json` (hardcoded code lists removed).
- `videos` table persists `description`/`tags` (auto-migration);
  `backfill-views.js` populates them — run it before the next rematch.
- Case-preserving FEN keys via shared `packages/api/src/utils/fen-sanitizer.js`
  with legacy-key fallback in `video-access-service` (no breakage before the
  index is regenerated).

**To ship the new index** (on a machine with the SQLite DB + API key):

```bash
node tools/video-pipeline/scripts/backfill-views.js   # views + descriptions/tags
npm run pipeline:rematch                              # re-score, regenerate index
node scripts/audit-video-matches.js                   # verify the metrics above
```
