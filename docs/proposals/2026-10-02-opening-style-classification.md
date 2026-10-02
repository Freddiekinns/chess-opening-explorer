# Opening style classification — diagnosis and proposal

**Status (2026-10-02):** proposed, not scheduled. Gated on step 0 below. Listed
under **Later** in `docs/backlog.md`.

## The problem, measured

Every one of the 12,377 positions in `api/data/eco/` carries LLM-written tags
(`analysis_json`). Searching and browsing by style read them, and they barely
distinguish one opening from another.

**The common tags are on nearly everything.**

| Tag                                | Share of positions |
| ---------------------------------- | ------------------ |
| Middlegame Plans (`phase_tags`)    | 99.7%              |
| Initiative (`tactical_tags`)       | 99%                |
| Piece Activity (`positional_tags`) | 96%                |
| Counterattack (`tactical_tags`)    | 92%                |
| Pawn Structure (`positional_tags`) | 90%                |

These are the example words in the prompt
(`packages/api/src/config/enrichment-config.js`): the model copied the examples
instead of choosing between them.

**So style filters filter almost nothing.** `filterBySemanticStyle` matches
substrings across three tag fields through the broad lists in
`SearchConstants.js`:

| Style searched | Passes, all positions | Passes, 300 most played |
| -------------- | --------------------- | ----------------------- |
| defensive      | 99%                   | 97%                     |
| solid          | 84%                   | 85%                     |
| aggressive     | 72%                   | 67%                     |
| tactical       | 62%                   | 61%                     |

154 of the 300 most-played positions count as both aggressive and solid.
"Defensive" passes 99% because its list includes "counterattack". The ranking
falls back on popularity.

**The vocabulary sprawls.** `style_tags` has 265 distinct values (84 used once),
with duplicates such as `Counter-attacking`/`Counterattacking` and
`Closed`/`Closed Game`/`Closed Position`. `strategic_themes` has 9,403 (6,253
used once). The top 20 style tags still cover 88% of uses, so the sprawl is the
smaller problem.

**Related positions disagree.** Each position was tagged alone, from its name
and moves only. Of 248 Najdorf positions, 40 are "Solid" and 45 "Gambit". The
"Najdorf, Scheveningen" line is "Solid" and "Patient Player".

**Difficulty is lopsided.** 61% Advanced, 37% Intermediate, 1.4% Beginner, so
"beginner openings" draws from 179 positions.

Discover has already worked around the first problem: `primaryStyle`
(`browse-service.js`) assigns each opening exactly one bucket from
`config/browse_facets.json`, ties broken by config order.

## Where the tags are read

A new classification has to reach all of these together:

- `search-service.js` — `filterBySemanticStyle`, `scoreSemanticResults`,
  categories, multi-pass re-ranking (server)
- `packages/web/src/lib/localSearch.ts` (client). Ranking is one rule
  implemented twice, so read the `search-ranking` skill first.
- Discover's style and difficulty facets (`browse-service.js`,
  `config/browse_facets.json`)
- Tag chips on the detail page and `OpeningCard`. Crawlers see these, so roll
  out changes deliberately.

## Proposal

1. **A fixed taxonomy of a few axes, each with a small set of named values.**
   Users see words, never numbers: a page says "Sharp", not "sharpness 4/5".

   | Axis      | Values                               | Shown?                   |
   | --------- | ------------------------------------ | ------------------------ |
   | Character | Quiet / Balanced / Sharp             | not when Balanced        |
   | Risk      | Sound / Speculative                  | only when Speculative    |
   | Gambit    | yes / no                             | "Gambit" when yes        |
   | Structure | Open / Semi-open / Closed            | yes                      |
   | Approach  | System / Main line / Offbeat         | yes                      |
   | Theory    | Light / Moderate / Heavy             | only when Light or Heavy |
   | Plans     | up to 3 of ~30 named themes (IQP, …) | yes                      |

   An opening shows two to four words, and each word means something because the
   axes are exclusive: an opening cannot be both Quiet and Sharp, so today's
   state, where 154 of the top 300 are both aggressive and solid, cannot recur.

   The values are ordered, and the classifier's confidence is stored with each
   value but never displayed. That lets search _rank_ ("most aggressive replies
   to 1.e4" = Sharp, ordered by confidence then popularity) without showing a
   scale. Each value has a written definition and anchor openings, e.g. "Sharp:
   Najdorf main line, King's Gambit. Quiet: Exchange Slav, London System."

   Gambit and Structure are mostly computable from the position (step 5), so
   they are checked, not just judged.

2. **Classify named variations, not positions.** Child positions inherit their
   variation's classification and override it only when they genuinely differ.
   This fixes the sibling disagreement and cuts the work by roughly an order of
   magnitude.
3. **Gather evidence where the web has any.** For the variations covering the
   ~1,000 most-played positions, a frontier model with web search writes a short
   sourced brief. Obscure ECO lines have nothing on the web; classify those from
   name, moves and the parent's brief.
4. **Classify against the taxonomy with structured output,** keeping a
   confidence per axis and sending low-confidence results to a review queue.
5. **Use what the data can measure as a check.** Two signals need no model:
   - **Draw rate** (`popularity_stats.json`). Among positions with ≥20k games
     the mean is 3.8% for today's "Gambit", 4.5% for "Sharp" and 5.4% for
     "Solid". The extremes run from Stafford Gambit at ~0% to queenless QGA
     lines at ~15%.
   - **Material balance** from the FEN. 67% of positions tagged "Gambit" today
     are a pawn or more out of balance, against 11% of the rest. Positions
     caught mid-exchange confound it, so it is a check, not the answer.

   Both are sanity checks and ranking inputs, never numbers shown as style
   statistics.

6. **Store it beside `analysis_json`, not over it.** The descriptions are live
   page content; changing them is a separate decision.

## Validating it without hand-labelling

Nobody hand-labels a reference set: the owner has neither the time nor
expert-level knowledge of a hundred openings. Validation is procedural, and each
check below runs as a script with a pass mark.

1. **Anchors.** The taxonomy's written definitions name 3–5 anchor openings per
   value. These are textbook cases (King's Gambit is Sharp, Speculative and a
   Gambit; the London is Quiet and a System), so ~40 anchors cover every value.
   An arm that misclassifies an anchor fails outright. The owner reviews the
   anchor list once, which is a few minutes, not a labelling job.
2. **Agreement between independent runs.** Classify the variations covering the
   top 1,000 positions twice, with two different models. Where they agree,
   accept the answer. The disagreements are the review queue, and its size is a
   metric.
3. **Agreement with what the data measures.** Character must follow draw rate,
   and Gambit must follow material balance, at the population level (step 5). A
   classification whose Sharp group draws more than its Quiet group is wrong
   somewhere.
4. **Consistency.** Within a variation, children may override their parent only
   with a stated reason; the rate of overrides is reported.
5. **Selectivity.** No displayed value may hold more than ~40% of the top 1,000
   positions, so every filter actually filters.
6. **Search sanity.** A fixed list of ~15 style queries ("aggressive openings
   for black", "solid reply to e4", "beginner openings") is run before and
   after. A strong model with web search judges each top-ten list blind, without
   knowing which version produced it.
7. **The disagreement queue goes to a judge, not a person.** A strong model with
   web search reviews each disputed variation against its sources and records
   the evidence. The owner sees only a short summary of the most popular
   disputed openings.

The arms to compare:

- (a) today's tags, mapped to the taxonomy
- (b) a frontier model with structured output, from name and moves alone
- (c) the same model on web-researched briefs
- (d) Jev on those briefs, if the video experiment
  (`docs/proposals/2026-10-02-jev-video-experiment.md`) shows it is reliable

The difference between (b) and (c) tells us whether the web research earns its
cost. (a) against (b) tells us how much comes from the taxonomy alone; the
expectation is most of it.

## Where Jev fits

Jev (TypeSafe AI, early access since 2026-09-15) answers typed questions about
text it is given:

- up to 255 options per choice, with a probability for each
- no prose
- no web access

That suits step 4 and nothing else in this pipeline. Its value would be cheap
re-runs while the taxonomy is iterated, and confidence scores for the review
queue. On its vendor's own benchmark it scores below frontier models, and it can
only judge from the evidence it is given. These facts come from secondary
sources, because the primary docs were unreachable when this was written.

## Gate — step 0

Until 2026-10-02 nothing measured whether anyone searches by style:
`search_select` sent only `surface` and `rank`, and search text is never sent.
Step 0:

- **Done 2026-10-02:** `search_select` carries `query_shape` (`move` / `eco` /
  `style` / `name`), from `queryShape` in `packages/web/src/lib/searchQuery.ts`.
  It is a small enum, within the analytics rules in `AGENTS.md`. It counts only
  searches that end in a click, so a style search that finds nothing worth
  clicking is invisible. If that matters, add a separate event later.
- Count Discover `?style=` and `?level=` page views in PostHog.

After about two weeks of traffic, schedule this work only if style queries and
facets are a meaningful share of use.

## Out of scope

Rewriting descriptions; cleaning up `strategic_themes`; the video and study
pipelines.
