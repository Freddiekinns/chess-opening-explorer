# Active Context

**Date:** 2026-11-11

## Current Task: video matching — recall, levels, creators

Branch `feat/video-matching-recall`, local only. The owner lifted the video
pause on 2026-11-11 after a measured review. Rematched 2026-11-11.

- **Recall.** A page's family comes from its ECO code and the title's from
  `opening-families.js`, with a prefix path for families that have no detector
  ("Bishop's Opening: …"), umlauts folded ("Saemisch") and a keyword that is the
  page's own opening no longer read as a sibling. Pages with videos: 8,421 →
  11,585 of 12,377 (68% → 93.6%); "QGD:" 27 → 532 of 532. Top-200 188/200.
- **Level.** Each video is an overview or a variation video (`videos.level`,
  `level` in the index). Root pages demote variation videos and lift
  introductions; variation pages drop lectures on other lines; the family shelf
  ranks overviews first. Root pages led by an introduction: 22 → 269.
- **Creators.** "Learn", "Introduction", "10-Minute" count as educational, views
  add 0–20, Finegold's tier resolves by handle, a creator's third video on a
  page takes -20. Pages with 3+ of their four visible videos from one channel:
  35.6% → 7.1%. Gotham's primers sit #1–#5 on their root pages.
- Contamination 1 pair, ties 0. "#1 names the variation" 52.9% → 55.4%.

Open, both the owner's call:

- The rematch ran with `JEV_API_KEY` blanked, so 42,741 new pairs are
  unfiltered. `node tools/video-pipeline/scripts/apply-jev-filter.js` with the
  key asks Jev about them and pays for it; the monthly workflow will do the
  same.
- `video-index.json` is 37 MB (was 24), after capping family-level videos at six
  per variation page. Normalising it is in `docs/backlog.md`.

Not done: Jev's run-2 families, a judged baseline. Detail: the `video-pipeline`
skill and `tools/video-pipeline/README.md`.

## Previous Task: #205, rank by your level (merged #216; #219 open)

`hooks/useMyLevel.ts` is the saved band; Discover has a "Your level" facet and
search takes `?band=` on both halves, with a "Ranked for … players · Change"
line. Levels are named Beginner/Intermediate/Advanced/Expert with the Lichess
range beside them (owner, 2026-11-01). Not built: setting the level from
Analyse, the rating input, the rest of #206. Stacked: `feat/level-words-search`.
Next there: review `data/popularity-2026-10`, then Task 3c. Full text and the
#208 content-review note: `archive.md`.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking stays paused until then (`archive.md`).
