# Jev video experiment — can a decision model judge video matches better?

**Status (2026-10-02):** planned, not started. Budget: $5 of Jev credits, bought
by the owner. No production code or data changes until the decision step.

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

## Out of scope

Changing the scorer or `video-index.json`; the style classification
(`docs/proposals/2026-10-02-opening-style-classification.md`), which would use
Jev only if this experiment shows it reliable.
