# Video Experience Review — Pipeline, Matching, and Discovery (2026-07-02)

Companion to `docs/reviews/2026-07-02-project-review.md` (the full project
review), focused entirely on videos: the verified state of the live index, how
to ship the staged matcher improvements, and how to build the best experience
for learners to **find and explore videos**. Builds on
`docs/reviews/2026-06-13-video-pipeline-assessment.md` (the matching-quality
assessment) and the June fixes that followed it (PRs merged through #43).

## Verdict

Videos are the product's richest learning asset — ~917 curated videos from
allowlisted educators, matched to positions — and its most under-delivered one.
Three problems, in order:

1. **The improved matching never shipped.** All of June's matcher work
   (cross-family guards, variation specificity, tiebreakers) is merged but the
   index was never regenerated — users still get the March matches.
2. **Discovery is one-dimensional.** A video is only reachable by navigating to
   the exact FEN page it matched; 72% of pages show nothing; there is no browse
   surface, no "why this video", and every click exits to YouTube.
3. **Freshness has no owner.** The index is 109 days old, and RSS discovery's
   ~15-video window means gaps become permanent misses.

---

## 1. Verified: the improved matching never shipped

The belief that the pipeline was re-run is understandable but wrong — checked
three ways on 2026-07-02:

1. Both index copies (`api/data/` and `packages/api/src/data/`) are
   **byte-identical** (same md5) and stamped **2026-03-15** — generated three
   months before either matcher PR merged.
2. The audit harness (`scripts/audit-video-matches.js`) against the live index
   reports the pre-fix baseline: **28.2% coverage, 75% top-200 coverage, 36.9%
   #1-variation-specificity, 7.9% cross-family contamination (1,577 wrong-family
   matches)** — e.g. Sicilian pages still recommending "The Reversed Sicilian:
   1.c4 e5" English videos.
3. The matcher's SQLite database is not in the repo, so no environment except
   the local machine that owns `videos.db` _can_ have run it.

June's offline re-score (recorded in `activeContext.md` at the time) verified
what shipping delivers:

| Metric                     | Live index (Mar 15) | After rematch (verified offline) |
| -------------------------- | ------------------- | -------------------------------- |
| Coverage                   | 28.2%               | ~67%                             |
| Top-200 played covered     | 75%                 | 81.5%                            |
| #1 video names variation   | 36.9%               | 61.9%                            |
| Cross-family contamination | 7.9%                | 0%                               |

That value is sitting in merged code, invisible to every user.

## 2. Ship checklist (user, locally — needs `videos.db` + YouTube API key)

1. `node tools/video-pipeline/scripts/backfill-views.js` — one-time; populates
   views/thumbnails/descriptions/tags (~35 API calls). **Must precede the
   rematch** or content matches score from titles alone.
2. `npm run pipeline` — the index is 109 days old and RSS discovery only sees
   each channel's ~15 latest uploads, so run a discovery pass too, not just a
   rematch; videos published in the gap are otherwise permanently missed. (If
   the API key allows, `npm run pipeline:full` closes the gap completely.)
3. `node scripts/audit-video-matches.js` — confirm the four metrics moved as
   expected before committing.
4. Commit the regenerated `api/data/video-index.json` (since 2026-07-06 it is
   the single canonical copy — the old duplicate at `packages/api/src/data/` and
   its copy step are gone). Then set up the monthly automation (§4, Freshness)
   so this never silently rots again.

---

## 3. Finding and exploring videos: the learner's view

Today a video is only reachable if the learner already navigated to the exact
FEN page it matched — and 72% of pages (post-ship: ~33%) have none, where the
gallery renders nothing at all. The corpus is curated from trusted educators;
the discovery around it is where the experience falls short. Ranked by value per
effort:

**V1 — Family fallback for empty galleries (highest value, small).** When a page
has no exact-position videos, `videos/:fen` should fall back to the page's
`family_id` and return the family's best generic videos, labelled "Videos for
the \<family\>" (and the same for studies). The family taxonomy and the
matcher's family logic already exist. This converts every "dead tab" on ~4,000+
post-ship pages into a useful shelf, honestly labelled — and it is the right
coverage strategy: solve the remaining gap _in the UI_, never by loosening match
thresholds again (the 28%→71% blanketing incident is the cautionary tale).

**V2 — Say why a video is here.** The index stores a match score but the UI
gives no signal. A small badge — "covers this variation" vs "family overview"
(derivable from the existing specificity check) — tells a learner whether
they're getting exactly their line or background material. This also makes the
V1 fallback self-explanatory.

**V3 — Keep the learner on the board.** Cards deep-link to YouTube in a new tab,
so watching a video means losing the position. An in-page embedded player
(`youtube-nocookie.com` iframe, loaded on click — no bundle or privacy cost
until played) beside the existing board turns "watch then try to remember" into
"watch and follow along". Track watched state in localStorage and show it on the
card ("✓ watched") — trivial, and it makes the gallery feel personal.

**V4 — A video library per family.** There is no browse surface for the
~917-video corpus; it's locked behind knowing the opening first. Family hub
pages (project review §3.4) should each carry a filterable video shelf (channel,
duration, sort by views/recency) — "all Sicilian videos" is a page learners
would land on from search, and it exercises the corpus far better than per-FEN
slices.

**V5 — Duration and level fit.** A 6-minute intro and a 90-minute theory deep
dive currently rank side by side. One LLM pass over titles/descriptions
classifying format (intro / deep dive / speedrun-explainer / trap-focused) and
audience level, stored as index fields, enables both filtering on V4 shelves and
smarter defaults on detail pages (short intro first for low-complexity
openings). Cheap because it rides the planned variation-classification pass.

**V6 — Chapter-level matching (the strategic one).** Most educator videos are
multi-opening surveys with YouTube chapters in the description ("12:30 Najdorf,
18:05 Dragon") — and the DB now persists descriptions precisely so content
evidence survives rematches. Parsing chapter timestamps and matching chapter
titles to openings turns the corpus's biggest weakness (one video blanketing ~82
pages) into its biggest strength: the Dragon page deep-links to `?t=1085` — _the
Dragon segment_ — of the survey video. It attacks the same problem as
variation-level classification but from the content side, raises effective
coverage without any new videos, and no competitor does it. Build it into the
same taxonomy/LLM pipeline project.

## 4. Pipeline: precision, coverage, freshness

The June work fixed scoring; the remaining structural risks:

- **Precision ceiling**: denylist heuristics can't catch the long tail
  (Chekhover, Prins, apostrophe variants) — variation-level classification
  (already scoped in `activeContext.md` history) plus chapters (V6) is the real
  fix. Do them as one project.
- **Coverage strategy**: post-ship coverage of ~67% is respectable; V1's family
  fallback covers the rest in the UI without polluting the index.
- **Freshness**: RSS mode's ~15-video window makes gaps permanent. A monthly
  GitHub Action (RSS pipeline + `audit-video-matches.js` + auto-PR carrying the
  metric diff — the audit already prints exactly the numbers the PR description
  needs) turns freshness from a memory into a process. This is finding S1 in the
  project review.
- **Curation input**: channel tiers live in `config/youtube_channels.json` —
  once V4 shelves exist, watch-through behaviour (which videos users actually
  click) becomes the first real feedback signal for tier and weight tuning.

## 5. Suggested sequencing

| Horizon   | Work                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| **Now**   | Ship checklist (§2) — backfill → pipeline → audit → copy → commit.                                |
| **Next**  | V1 family fallback + V2 match-reason badge (one small API + UI change). Monthly freshness Action. |
| **Then**  | V3 embedded player + watched state. V4 family shelves with the family hub pages.                  |
| **Later** | V5 + V6 as one taxonomy/LLM pipeline project alongside variation-level classification.            |

Ship first, then make what's shipped explorable. V1+V2 are the best
value-per-hour in the whole video programme: one honest fallback and one badge
turn thousands of empty tabs into working learning shelves.
