# Jev video experiment — can a decision model judge video matches better?

**Status (2026-10-02):** run and judged; results and decision under
[Results](#results-2026-10-02). Spent $1.60 of TypeSafe credit. No production
code or data changed.

## The question

The video matcher (`tools/video-pipeline/lib/video-matcher.js`) decides which
opening a video is about from keywords, aliases, channel tiers and a growing set
of guards. Each guard in `AGENTS.md` → Pipelines exists because keywords
misjudged the subject:

- a family name in an alias list
- a sibling episode cross-linked in a series description
- a premium channel demoted by a title mismatch

Jev (TypeSafe AI, early access since 2026-09-15) reads text and answers typed
questions with a probability for each answer.

The question: **does Jev, reading a video's title, description and tags,
identify bad matches the scorer keeps, without throwing away good ones?** If
yes, it becomes a post-filter in the pipeline. If no, we record why and stop.

## Why videos are the right test

- **The shape fits.** Text in, one answer from a fixed list out. No web, no
  prose, no chess calculation needed: the video's own text names its subject or
  it does not.
- **The volume suits a cheap model.** 10,239 videos in the corpus
  (`tools/data/video_enrichment_cache.json`), and 72,283 distinct pairs of
  opening and video on the site, drawn from 1,574 distinct videos.
- **We already know the failure modes,** so we know where to look.

## What the current audit can and cannot say

`node scripts/audit-video-matches.js` (2026-10-02):

- 0% cross-family contamination
- 54.2% of sub-variation pages whose #1 video names the variation

Both metrics are keyword tests themselves. "0% contamination" means no title
names a _conflicting family_. It does not mean every video is about its page. A
video whose title names nothing ("Hikaru's Bold Gambit Against Magnus") passes
every check. So the audit cannot be the referee for this experiment; a blind
judge is (below).

## Design

### Run 1 — verify the matches on the site

For each of the 1,574 displayed videos, one call:

- **State:** the video's title, channel, duration, description and tags.
- **Questions:** one per page the video appears on: "How does this video relate
  to _<opening name>_ (_<moves>_)?"
- **Choices:** `main subject` / `covered within a broader video` /
  `mentioned only` / `not about it`.

The scorer counts all 72,283 pairs as good matches. Jev's probabilities for each
choice are kept.

### Run 2 — classify the subject of every video

For all 10,239 corpus videos:

- **Question:** "Which opening family is this video mainly about?"
- **Choices:** the 28 families in `api/data/families.json`, plus
  `several openings / general principles` and
  `not an opening video (game recap, puzzle, news, short)`.

Compare with the family the matcher assigned. Videos Jev places in a family the
matcher never matched them to are recall candidates. That matters most for the
22 of the top-200 positions with no video today.

### Optional run 3 — pick the variation

Only if runs 1–2 look promising. For a video with a family, pick among that
family's named variations the scorer already considered (always under Jev's
255-option limit), plus `the family in general`.

## Judging, without hand-labelling

A Claude Code session judges blind, at no API cost: it sees the video text and
the opening, never which system said what. It may answer "can't tell", which is
reported and excluded. Samples, drawn at random within each stratum:

| Stratum | Pairs | What it measures                                             |
| ------- | ----- | ------------------------------------------------------------ |
| A       | 100   | both accept: how often Jev would wrongly reject a good match |
| B       | 100   | scorer accepts, Jev says `mentioned only` / `not about it`   |
| C       | 50    | Jev's family differs from the matcher's                      |
| D       | 50    | Jev calls a displayed video `not an opening video`           |
| E       | 50    | Jev's recall candidates for uncovered top-200 positions      |

The judge may open the YouTube page for context when the text is thin.

## Decision

Adopt Jev as a pipeline post-filter if all three hold:

1. In stratum B, the judge agrees with Jev on ≥70% of pairs: Jev's rejections
   are mostly real bad matches.
2. In stratum A, Jev wrongly rejects ≤5%.
3. Jev's probability separates good from bad: judged-good pairs score clearly
   higher than judged-bad ones. If it doesn't, no threshold will be stable.

Stratum E is reported separately: a recall gain is a second, independent case
for adoption.

Otherwise the results go into this document and the experiment stops. Adopting
it is a separate PR through the `video-pipeline` skill, with the audit run
before and after.

## Budget

Pricing below is from secondary sources and is unverified: $0.042 per million
input tokens, output free.

- A corpus video averages ~1,240 characters of title, description and tags,
  about 310 tokens.
- Run 1: 1,574 states plus 72,283 short questions ≈ 3.5M tokens ≈ **$0.15**.
- Run 2: 10,239 × ~600 tokens ≈ 6M tokens ≈ **$0.26**.

Even at five times these estimates, both runs and one full re-run fit in $5. **A
100-call pilot comes first, and its real billed usage replaces these numbers
before the full runs.**

## Setup

- **API key:** in `.env`, never committed. Its variable name follows TypeSafe's
  docs.
- **Where it runs:** the owner's machine, or a cloud session once the API host
  is allowed in that environment's network policy.
- **Code:** `scripts/experiments/jev-video/`, one script per run.
  - Reads `video_enrichment_cache.json` and `video-index.json`, never writes
    them.
  - Writes answers as JSON Lines to `tools/data/experiments/`, one line as each
    answer arrives. A re-run skips ids already answered, so an interrupted run
    resumes without paying twice.
- **Review:** the `pipeline-reviewer` agent reviews the scripts before the full
  runs.

## Steps

1. **Owner:** buy credits, create a key, share the API reference. The request
   shape, how questions batch per call, and the rate limits all come from it.
2. Write the scripts and run the 100-call pilot; check billed usage.
3. Run 1 and run 2 in full.
4. Judge the strata in a session; write the results and the decision here.

## Results (2026-10-02)

Scripts: `scripts/experiments/jev-video/` (`pilot`, `run1`, `run2`, `recall`,
`sample`, `sample-recall`, `score`, `spotcheck`). Inputs frozen at
`video-index.json` from `a0e1e77c8`; model pinned to `jev-1.13.0`.

### What changed from the design

- **Pairs are asked per named opening, not per position.** A trailing move list
  (", 11.d3") is stripped, giving 32,005 video × named-opening pairs instead of
  72,283 position pairs. Names that _are_ move orders ("Nimzo-Indian: 4.Bd2")
  keep them, and 10,790 such pairs are flagged and sampled separately.
- **Stratum E needed its own pass.** Run 2's family answer cannot place a video
  on a specific page, so 2,827 candidate videos were each asked about all 19
  uncovered top-200 openings (`recall.js`).
- **Stratum F was added:** on top-200 pages where dropping Jev's rejections
  changes the #1 video, the judge picks the better #1 blind.
- **Four blind judge agents** read only their batch file (video text plus the
  question). The owner then blind-labelled 20 judged items.

### Cost and speed

| Run               | Calls  | Input tokens | Cost  |
| ----------------- | ------ | ------------ | ----- |
| Pilot             | 106    | 0.21M        | $0.01 |
| Run 1 (relations) | 2,017  | 8.76M        | $0.37 |
| Run 2 (families)  | 10,239 | 16.44M       | $0.69 |
| Recall (E)        | 2,827  | 12.64M       | $0.53 |

Pricing matched the docs ($0.042/M input, output free, state billed once per
call). p50 latency 235 ms; no call failed. About 640 tokens per call plus ~218
per relation question.

### Pilot

21/21 known pairs right in both wordings: the AGENTS.md regressions (Alapin,
Scheveningen and Prins rejected on the Accelerated Dragon page; Seirawan's
lecture kept), live errors (O'Kelly, Chekhover and Maróczy videos on the Kan
page) and name traps (Kan the player; Max Lange Attack vs Defense). Wording
mattered only when Jev was unsure: the two wordings agreed 98% at confidence ≥
0.7 and 74% below 0.45.

### Decision criteria

Pool-weighted, "can't tell" excluded:

| Criterion                             | Needed  | Result                     |
| ------------------------------------- | ------- | -------------------------- |
| Jev's rejections are real bad matches | ≥ 70%   | **99.0%** (n = 92)         |
| Good matches Jev wrongly rejects      | ≤ 5%    | **1.8%**                   |
| Jev's P(good) separates good from bad | clearly | **0.93 vs 0.31**, AUC 0.94 |

All three pass.

### What it says about today's matches

| Filter                | Pairs kept | Kept pairs judged good | Good pairs kept |
| --------------------- | ---------- | ---------------------- | --------------- |
| None (today's scorer) | 32,005     | 26%                    | 100%            |
| Jev accepts           | 55%        | 47%                    | 98%             |
| Jev P(good) ≥ 0.8     | 38%        | 63%                    | 91%             |
| Jev P(good) ≥ 0.9     | 28%        | 74%                    | 78%             |

The 26% is dominated by deep, obscure sub-lines that inherit their family's
videos. Where traffic is, the gain is smaller. On the 23 top-200 pages where Jev
changes the #1, the judge preferred Jev's #1 on 10 and today's on 6, with 7
equal. The owner's notes show why: on most of those pages, neither video covers
the line.

- **Families (C, D).** Where Jev's family differs from every family the matcher
  showed the video under, the judge sided with Jev 67% of the time and the
  matcher 13%. On displayed videos Jev calls "not an opening video", the judge
  agreed 90%.
- **Recall (E).** Half of Jev's strongest candidates for uncovered top-200
  openings are good. 10 of the 17 sampled openings get at least one, for example
  the Busch-Gass, Owen 2.d4 Bb7, Veresov, QGD Normal Defense and Four Knights
  Italian.

### Where Jev is weak

Jev knows the family but does not check the move order. It keeps a sibling
variation (an f3 Nimzo video on a 4.e3 page, a Classical King's Indian on the
Fianchetto page). It also calls a downstream named line the "main subject" of a
crossroads position: Italian and Ruy Lopez videos on the King's Knight Opening,
Tarrasch videos on QGD Three Knights. 14 of its 26 "main subject" recall picks
were this. As a filter it removes most of the bad matches but keeps about half.

The 28 families in `families.json` have no home for D00–D05 (Colle, Torre,
Blackmar–Diemer), B00 or C20–C21. Jev and the judges both forced these into a
nearest family, which blurs strata C and D.

### Checking the judge

The owner blind-labelled 20 judged items:

- **Facts:** no disagreement with the judge on what a video covers.
- **Labels:** on the 12 relation items both decided, they agreed on good vs bad
  9 times. The 3 differences were all a same-family video on the wrong
  variation. The judge called it bad; the owner called it "partly" ("this is
  Botvinnik", "Tartakower not Rauzer", "covers Bc4 not Bb5").
- **The judge's "can't tell":** it gave this on 46 of 192 relation items, 38 of
  them in stratum A, mostly Naroditsky speedruns with no moves in the
  description. The owner decided all 4 such items, 3 of them as good. So stratum
  A's 47% is likely an underestimate.
- **Jev against the owner:** Jev was right on 13 of 16 by the owner's facts. All
  3 misses were false accepts.

### Decision

**Adopt Jev as a rejection filter, not as a judge of fit.** Its rejections are
trustworthy and cheap: a full re-check of every displayed pair costs about
$0.40. Its acceptances are not good enough to rank by, because the
sibling-variation blind spot is exactly the matcher's own blind spot.

The owner's "partly" verdicts point to a softer form than deletion. A
same-family video Jev rejects for a specific page belongs on the family shelf
the site already has (match-reason badges, family fallback). A cross-family or
"not an opening" rejection is dropped. Adoption is a separate PR through the
`video-pipeline` skill, with the audit run before and after, and should start
from P(good) as a threshold rather than the top choice.

Recall is a second, independent case: Jev-nominated candidates for uncovered
top-200 pages, filtered by a human or a second check, would fill about half of
them.

### Implemented (2026-10-02)

`tools/video-pipeline/lib/jev-filter.js` runs after every consolidation. Two
refinements came from applying it to the real index:

- **Only confident rejections act: P(good) < 0.4.** Removing every rejection
  also dropped parent-variation lectures from their own deep sub-lines (the
  Scheveningen lecture on the Scheveningen Fianchetto page scores 0.49). The
  owner's spot-check counts those as useful. In the judged sample, every good
  match Jev rejected sat at or above 0.4. Removals below it were 100% right, and
  they still cover 87% of Jev's rejections.
- **No new shelves were needed.** A page with no videos already gets the API's
  labelled family shelf.

Applied to the index from `a0e1e77c8`, it removed 31,605 of 72,283 position
pairs. Top-200 own-page coverage fell from 178 to 172. The audit's "#1 names the
variation" fell from 54.2% to 52.7%, but a random sample of the 550 changed
pages showed keyword false positives being removed: a Pilnik video on Chigorin
pages, a Bogo-Indian "Wade-Smyslov" on the Grünfeld Smyslov page. Four emptied
top-200 pages fall to the `irregular` family shelf, which is a grab-bag. That is
a gap in the family list, not in the filter.

### Notes on Jev for other uses

- **What it is good at:** "is this text about X?" with a fixed answer list.
  Cheap enough to run over everything, fast, and calibrated: its confidence
  tracks when wording changes its answer.
- **What it is weak at:** distinctions that need domain reasoning the text does
  not spell out, such as move orders. It does not reason; it reads.
- **Put the evidence in the state.** It read a PGN header buried in a
  description ("Vienna Game: Anderssen Defense (C25)") and used it correctly.
- **Use the probabilities, not the choice.** Thresholds on P(good) gave a usable
  precision/recall curve; the top choice alone did not.
- **Buy keys from console.typesafe.ai.** `jevtypesafeai.com` is an unaffiliated
  reseller at ten times the price, on a different endpoint.

## Out of scope

Changing the scorer or `video-index.json`; the style classification
(`docs/proposals/2026-10-02-opening-style-classification.md`), which would use
Jev only if this experiment shows it reliable.
