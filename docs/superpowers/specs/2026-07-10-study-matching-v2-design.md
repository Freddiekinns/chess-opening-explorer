# Study Matching V2 — Design

**Date:** 2026-07-10 **Status:** Draft for review **Goal:** Improve the rate and
quality of Lichess study → opening-page matching by applying the lessons from
the video-pipeline overhaul (cache → offline rematch, family guards,
config-driven scoring, audit harness), then rerun matching and demonstrate
old-vs-new quality with numbers.

## 1. Baseline (measured 2026-07-10 against live `api/data/courses.json`)

| Metric                                     | Current                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| Studies in index / in curated list         | 431 / 630 (+294 discovered, never imported)                   |
| Chapter entries / FENs covered             | 6,142 / 2,255                                                 |
| Exact coverage — all 12,377 pages          | 18.2%                                                         |
| Exact coverage — top-200 most-played pages | 62.5%                                                         |
| Exact coverage — top-1000                  | 45.2%                                                         |
| Cross-family contamination (title vs page) | 355 entries (5.8%)                                            |
| Redundant same-study-same-page entries     | 1,329 (worst page: 103 cards)                                 |
| Titles with "Study – Study: Chapter" dupe  | 3,245                                                         |
| Raw-PGN cache for offline rematch          | none — every rerun re-fetches                                 |
| Import tool default output path            | `packages/api/src/data/` — **removed 2026-07-06 (dead path)** |

Root causes: each chapter anchors to only the **deepest** ECO FEN its moves pass
through (model games / transpositions anchor in foreign families — London System
chapters on the Caro-Kann Advance page); no family sanity check; no scoring or
ranking beyond likes; no study-level aggregation (every chapter is its own
card); `course_title` concatenates study + chapter names.

## 2. Chosen approach

Mirror the video-pipeline architecture (approach A of three considered): cached
fetch → pure offline matcher with config-driven weights → audit harness → schema
v2 → UI study cards. Reuse `tools/video-pipeline/lib/opening-families.js` as-is
(it is dependency-free) for ECO→family, title→family, and move-prefix
compatibility.

Decisions confirmed with the user:

1. **Multi-anchor**: a chapter anchors to _every_ ECO position along its move
   path, not just the deepest — a Najdorf chapter also appears on Sicilian and
   intermediate pages, ranked by specificity.
2. **Schema + UI change approved**: one card per study per page (chapter count,
   best-chapter link), study/chapter titles stored separately.
3. **Catalogue**: re-match all 630 curated + import the 294 previously
   discovered studies (~924 total).

## 3. Components

### 3.1 Fetch + cache (`tools/course-discovery/`)

- `lib/study-cache.js`: stores one JSON per study under
  `tools/data/study-cache/` (`{studyId}.json`: metadata + raw PGN + fetched_at).
  Gitignored for now (no automation depends on it yet).
- `add-studies.js` writes to the cache on fetch and gains `--fromCache`: rebuild
  `courses.json` entirely offline, zero API calls (the `pipeline:rematch`
  lesson). New npm script `course:rematch`.
- Default output path fixed to `api/data/courses.json`.

### 3.2 Matcher (`lib/study-matcher.js`, new — replaces deepest-only logic)

Pipeline per study:

1. Split chapters, replay moves → FEN path (existing `pgn-matcher.js` utils).
2. **Candidate anchors**: every ECO position on the path, with its move depth.
3. **Study family inference**: title detectors from `opening-families.js`; when
   the title names no family (1,649 current titles), fall back to the majority
   family of the study's chapter matches.
4. **Family guard**: drop anchors whose page family _conflicts_ (move-prefix
   divergence) with the study family. Prefix-compatible families pass (Najdorf
   study → Sicilian page OK; London study → Caro-Kann page rejected).
5. **Score per (study, page)** with weights from `config/study_matching.json`:
   - specificity: anchor depth relative to the chapter's final depth and the
     page position's depth (exact/deep coverage > drive-by prefix)
   - family agreement: same > compatible > unknown
   - log-scaled likes
   - number of chapters matching the page
   - deterministic tiebreakers: score → likes → studyId (no ranking ties)
6. **Aggregate**: one entry per (study, page); best-matching chapter becomes the
   link target; `chapters_matched` recorded.

### 3.3 Schema v2 (`api/data/courses.json`, still FEN-keyed)

```json
{
  "<fen>": [
    {
      "study_title": "The Complete Najdorf",
      "chapter_title": "6.Be2 Main Line",
      "study_url": "https://lichess.org/study/abc123",
      "chapter_url": "https://lichess.org/study/abc123/def456",
      "author": "...",
      "platform": "Lichess",
      "likes": 1234,
      "chapters_matched": 7,
      "curated": true,
      "match": { "score": 78, "depth": 12, "reason": "covers-position" },
      "discovered_at": "..."
    }
  ]
}
```

`reason` ∈ `covers-position` (anchor at/near chapter's deepest content) |
`line-context` (page is an ancestor position of the chapter's line) — powers
match-reason badges like videos V2.

### 3.4 API + UI

- `course-service.js`: pass-through (arrays already sorted best-first by the
  pipeline).
- `family-resource-service.js`: dedupe by `study_url`, rank by `match.score`
  then `likes`.
- `StudiesGallery.tsx`: one card per study — `study_title` (clean, no dupe),
  author, likes, "N chapters" chip, match-reason badge; card links to the best
  chapter. CSS module updated in lockstep with the design-system bundle if any
  new visual token/pattern is introduced.

### 3.5 Audit harness (`scripts/audit-study-matches.js`)

Shares `opening-families.js` with the video audit. Reports: exact coverage (all
/ top-200 / top-1000 by popularity), contamination %, same-study-per-page
duplication, title duplication, ranking ties, studies-per-page distribution.
Reads both v1 and v2 schemas so the same script produces the before/after
comparison.

## 4. Execution & evidence

1. Build matcher + tests (TDD), audit script, schema/UI changes.
2. Fetch all ~924 studies into the cache (~25 min, Lichess rate limits).
3. Run matcher → new `courses.json`.
4. Run audit against old (committed) and new index; write the comparison table
   into `docs/reviews/2026-07-10-study-matching-v2.md`.

**Success targets** (vs baseline): contamination < 1% (from 5.8%); same-study
duplication = 0 (from 1,329); title duplication = 0 (from 3,245); top-200 exact
coverage meaningfully above 62.5%; zero ranking ties; all ~924 catalogue studies
considered.

## 5. Testing

- Unit (Jest, `tests/unit/`): study-matcher scoring, family guard, anchor
  collection, aggregation, cache round-trip, v1→v2 audit dual-read.
- Existing suites updated: `add-studies`, `course-merger`, `course-service`,
  `family-resource-service` fixtures to v2 schema.
- Frontend (Vitest): `StudiesGallery` card rendering, chapter chip, badge,
  show-more behaviour.

## 6. Out of scope

- Fresh Lichess discovery run (`course:discover`) — catalogue growth beyond the
  924 known studies.
- Chessable or non-Lichess platforms.
- Monthly automation for studies (mirror of `video-refresh.yml`) — noted as a
  natural follow-up once the cache exists.
- Video V4/V6 work.
