# Study Matching V2 — Before/After Quality Report

**Date:** 2026-07-10 **Spec:**
`docs/superpowers/specs/2026-07-10-study-matching-v2-design.md` **Audit tool:**
`node scripts/audit-study-matches.js` (dual-schema; both columns below were
produced by the same script with the same family detectors)

## What changed

The Lichess study → opening-page matching was rebuilt end-to-end, applying the
lessons from the June video-pipeline overhaul:

1. **Fetch once, re-match freely.** Raw study PGN + metadata are cached in
   `tools/data/study-cache/` (one JSON per study, gitignored). A new
   `npm run course:rematch` rebuilds `api/data/courses.json` offline in seconds
   — the `videos.sqlite` → `pipeline:rematch` model.
2. **Multi-anchor matching** (`tools/course-discovery/lib/study-matcher.js`).
   Previously each chapter anchored only to the _deepest_ ECO position its moves
   reached; now it anchors to **every** ECO position along its move path, so a
   Najdorf chapter is also findable from the Sicilian Defense page and every
   intermediate position.
3. **Family guard.** A study's families (title detectors, else the majority
   family of its chapters' deepest matches) must be move-prefix-compatible with
   the page's family — the same `opening-families.js` logic the video matcher
   uses. This kills the London-System-on-Caro-Kann class of bug.
4. **Scoring + aggregation** (`config/study_matching.json`). One entry per
   (study, page), scored by specificity (how deep the anchor sits in the
   chapter's line), family agreement, log-scaled likes and chapter count, with
   deterministic tiebreakers and a 20-entries-per-page cap.
5. **Schema v2 + study cards.** `study_title`/`chapter_title` stored separately
   (no more "Study – Study: Chapter" strings), cards render one study each with
   author, chapter count and a match-reason badge ("Covers this variation" /
   "Explores deeper lines"), linking to the best-matching chapter.

## Results

Catalogue: 630 curated studies attempted; 440 fetched (190 are now private or
deleted on Lichess); 431 produced at least one match.

| Metric                            | Old (v1, live until today) | New (v2)              |
| --------------------------------- | -------------------------- | --------------------- |
| Studies matched                   | 431                        | 431                   |
| Entries / pages covered           | 6,142 / 2,255              | 16,503 / 4,424        |
| Coverage — all 12,377 pages       | 18.2%                      | **35.7%**             |
| Coverage — top-200 most-played    | 62.5%                      | **91.5%**             |
| Coverage — top-1000 most-played   | 45.2%                      | **80.3%**             |
| Cross-family contamination        | 358 entries (5.8%)         | **0**                 |
| Same-study duplicates on one page | 1,329                      | **0**                 |
| Title duplication                 | 4,459                      | **0**                 |
| Pages with ranking ties in top-5  | 405                        | 1                     |
| Worst page (cards shown)          | 103                        | 20 (cap)              |
| Index size                        | 3.0 MB                     | 6.9 MB (compact JSON) |

All success targets from the spec are met: contamination < 1% (achieved 0),
duplication 0, title duplication 0, top-200 coverage well above 62.5% (achieved
91.5%, matching the video shelf's 91.5%).

### Concrete page examples (verified in the running app)

- **Sicilian Defense (B20)** — top cards are now the five most-liked genuine
  Sicilian studies, each shown once with "Covers this variation" and a chapter
  count (previously the same studies appeared as dozens of separate chapter
  cards).
- **Caro-Kann Advance (B12)** — previously listed 🍄 _Ideas in the London
  System_ 🍄 and ⭐ _The London System_ ⭐ chapters; now 100% Caro-Kann
  repertoires.
- **Colle-Zukertort on Caro-Kann Exchange (B13)** — gone (family guard).
- Pages that previously had nothing exact (e.g. deep Najdorf positions'
  ancestors) now inherit deep studies as "Explores deeper lines".

### Residual notes

- **The one remaining "tie"** (Sicilian Wing Gambit page) is two studies with
  genuinely identical evidence (score 116, 546 likes each); display order is
  still deterministic (study URL tiebreak).
- **True transpositions are kept by design.** A handful of studies whose titles
  name another opening genuinely culminate at a position on the page (e.g. an
  anti-London repertoire whose line transposes into an ECO-B12 position). The
  match is positionally exact (`covers-position`), so it is kept; the
  title-based audit no longer counts these because the detector and matcher use
  the same rules.
- 190 curated studies were 403/404 on Lichess; pruned from `curated-studies.txt`
  on 2026-07-11 (440 remain, matching the cache). A fresh `course:discover` run
  to replace them and grow the catalogue is still a follow-up.

## Reproducing

```bash
npm run course:import -- --verbose   # fetch any new/uncached studies + rebuild
npm run course:rematch               # offline rebuild only
node scripts/audit-study-matches.js  # metrics for the live index
node scripts/audit-study-matches.js path/to/old-courses.json  # compare
```

## Follow-ups (not in this change)

- Monthly refresh Action mirroring `video-refresh.yml` (fetch new/changed
  studies, rematch, audited auto-PR) — the cache and offline rematch make this
  straightforward.
- Likes staleness: `course:rematch` reuses cached likes; a periodic `--refetch`
  pass would refresh them (documented in CLAUDE.md gotchas).

## Addendum: discovery run (2026-07-11)

Ran `npm run course:discover` (46 search terms against the Lichess study search
API, 500+ likes threshold) to grow the catalogue back up after the dead-study
prune. 75 new studies found not already in `curated-studies.txt`; appended and
fetched via `npm run course:import -- --includeDiscovered --append`. 61 had no
public PGN (private/unlisted), leaving **14 usable new studies** (cache: 440 →
454).

| Metric                          | Before discovery | After discovery |
| ------------------------------- | ---------------- | --------------- |
| Studies matched                 | 431              | 444             |
| Entries / pages covered         | 16,503 / 4,424   | 17,079 / 4,500  |
| Coverage — all 12,377 pages     | 35.7%            | 36.4%           |
| Coverage — top-200 most-played  | 91.5%            | 92.0%           |
| Coverage — top-1000 most-played | 80.3%            | 80.7%           |
| Cross-family contamination      | 0                | 0               |
| Same-study duplicates on a page | 0                | 0               |
| Title duplication               | 0                | 0               |

Small, genuine gains with zero regressions on quality gates. Of the 75
discoveries, 14 had a public PGN and were appended to `curated-studies.txt` (now
454 entries, still matching the cache 1:1); the other 61 (private/no PGN) were
dropped rather than kept as permanent dead weight — `discovered-studies.txt` is
cleared and ready for the next `course:discover` run.
