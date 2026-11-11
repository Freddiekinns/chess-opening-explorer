# Active Context

**Date:** 2026-11-11

## Current Task: video matching — recall, levels, creators

Branch `feat/video-matching-recall`. The owner lifted the video pause on
2026-11-11 after a measured review. Rematched 2026-11-11, Jev filter included.

- **Recall.** A page's family comes from its ECO code and the title's from
  `opening-families.js`, with a prefix path for families that have no detector
  ("Bishop's Opening: …"), umlauts folded ("Saemisch") and a keyword that is the
  page's own opening no longer read as a sibling. Pages with videos: 8,421 →
  11,398 of 12,377 (68% → 92.1%); "QGD:" 27 → 532 of 532. Top-200 184/200.
- **Level.** Each video is an overview or a variation video (`videos.level`,
  `level` in the index). Root pages demote variation videos and lift
  introductions (not played games); variation pages drop lectures on other
  lines; the family shelf ranks overviews first. Root pages led by an
  introduction: 22 → 256.
- **Creators.** "Learn", "Introduction", "10-Minute" count as educational, views
  add 0–20, Finegold's tier resolves by handle, a creator's third video on a
  page takes -20. Pages with 3+ of their four visible videos from one channel:
  35.6% → 7.6%. Gotham's primers sit #1–#5 on their root pages.
- **Jev** was asked about the 42,741 new pairs ($0.23) and removed 12,332,
  mostly family overviews on lines they do not cover. Top-200 fell 188 → 184:
  the four emptied pages held another opening's overview.
- Contamination 1 pair, ties 0. "#1 names the variation" 52.9% → 55.9%.

Open: `video-index.json` is 31 MB (was 24), after capping family-level videos at
six per variation page. Normalising it is in `docs/backlog.md`.

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
