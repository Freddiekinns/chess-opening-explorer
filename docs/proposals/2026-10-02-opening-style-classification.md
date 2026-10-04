# Opening style classification — diagnosis and proposal

**Status (2026-10-03):** piloting. The owner chose to go ahead without waiting
for the step 0 gate, because the at-a-glance purpose of tags applies on every
page whether or not anyone searches by style. Rubric: `docs/style-taxonomy.md`.
Plan: [Execution plan](#execution-plan-2026-10-03).

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

   _Superseded 2026-10-03 by `docs/style-taxonomy.md`:_ Theory became Level
   (Beginner / Intermediate / Advanced), the site's existing labels, because
   "light theory" is not how players talk and theory load is one of two reasons
   an opening is hard. Character became Solid / Balanced / Sharp and Speculative
   became Dubious, the words players actually use. Gambit and Dubious carry a
   side, and Plans are not shown in the first release.

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

## Execution plan (2026-10-03)

There is no Anthropic API key, so the work runs as Claude Code sessions and
subagents on the owner's Claude plan. The owner does not hand-label or write
chess content; they skim the anchors, sanity-check openings they play, and read
copy for whether it sounds human.

### Research once, use it twice

Each variation gets one sourced **brief**, written from web research and kept as
internal data (one JSON file per variation). Tags are classified from the briefs
now. Descriptions and plans are rewritten from the same briefs later. The
researcher also checks the current `analysis_json` description and
`common_plans` against its sources, claim by claim (supported / wrong /
unverifiable). The existing text came from Gemini 2.5 Pro and much of it may be
fine, so the later step fixes what the audit marks wrong instead of rewriting
everything.

### Grouping by move order, not name

The name strings in `api/data/eco/` come from several sources and disagree: the
Najdorf appears as "Sicilian Defense: Najdorf Variation" and "Sicilian:
Najdorf", the Stafford under three spellings of Petrov. Grouping on the name
string splits one variation into several, which is itself a cause of sibling
disagreement. A variation is therefore a **root position**, and every position
reached from it inherits its classification unless a child brief overrides it
with a stated reason. Counts quoted earlier (707 variations behind the top 1,000
positions) were by name and overstate the real number.

`tools/style-tags/select-roots.js` implements it. Only the standard `eco_tsv`
names (3,545 of 12,377 positions) define variations: a variation is "Family:
first variation" of such a name, its root is the shallowest position carrying
it, and every position belongs to the variation of its nearest `eco_tsv`-named
ancestor. That gives **1,429 variations** in all. Twelve of them are crossroads
such as 1.e4 and 1.d4 Nf6 (`tools/style-tags/hubs.json`); they get no tags.
Transpositions are not merged: the London by 2.Nf3 and by 2.Bf4 are two roots.

### Roles

| Role         | Runs as                                  | Model      | Why                                                                                                             |
| ------------ | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Orchestrator | the main session                         | Opus       | Owns the rubric, batching, merging and validation scripts. Never holds research text.                           |
| Researcher   | general-purpose subagent, ~10 variations | Sonnet     | Web search and summarising sources. Writes briefs and the description audit to files.                           |
| Classifier A | subagent, on the compact states file     | Sonnet     | Picks one value per axis from the rubric, with confidence and a one-line reason.                                |
| Classifier B | Jev on the briefs; Opus if no Jev key    | Jev / Opus | A different model family is a real second opinion. Briefs spell the evidence out, which is what Jev reads well. |
| Judge        | subagent with web search, disputes only  | Opus       | The hardest calls, at small volume.                                                                             |
| Copy editor  | later phase, never the writer            | Sonnet     | Applies the prose guide. An editor that did not write the text catches AI-isms better.                          |

Agents write to separate files, so they run in parallel without worktrees.

### Order

1. **Calibration.** One researcher on ~10 variations, mostly anchors. Tune the
   brief schema and prompt, and measure credit use per brief. The owner reads
   two or three briefs for openings they play.
2. **Pilot.** Briefs for the 100 most-played variations, ranked by games across
   all their positions, plus the calibration set. Classify with A and B, judge
   the disagreements, run the validation checks above, and derive the plans list
   from the briefs' `plan_phrases`. Arm (a), today's tags mapped to the
   taxonomy, runs alongside as the baseline.
3. **Extend** in two tiers if the pilot passes. Full web research for the next
   ~50 variations. The rest of the 1,429 get briefs from model knowledge and the
   parent's brief, marked unsourced, used for tags only and never for page text.
4. **Ship tags.** Detail page, `OpeningCard`, Discover facets and both halves of
   search ranking together, through the `seo-crawl-graph` and `search-ranking`
   skills.
5. **Later, separately: descriptions and plans** from the briefs, under a prose
   guide (house style plus an AI-ism blacklist with before/after examples), most
   popular pages first and in stages, watching Search Console between batches.

### Calibration results (2026-10-03)

Twelve variations: six the owner plays and six anchors. Briefs are in
`tools/data/style-briefs/`; the two classifiers' answers are in
`_classify/calibration-{claude,jev}.json`.

- **Agreement:** Sonnet (classifier A) and Jev agreed on 69 of 72 axis
  decisions, and both got every anchor right. The three disagreements were all
  low-confidence Jev answers or a Level call on the Stafford Gambit.
- **Taxonomy changes it forced:** Offbeat had been "rarely played at a high
  level", which both classifiers applied to the Vienna; it is now "seldom played
  by strong players", with the Vienna as a standard anchor. Closed now covers a
  tense centre as well as a locked one (London, QGD). Level names the side it is
  judged for, and a Dubious line is never Beginner. Plans are shown, because
  hiding middle values left the Nimzo-Indian with only "Semi-open".
- **Description audit:** 6 wrong claims in 4 of the 12 current descriptions,
  e.g. the King's Indian's "…e5 frees the g7 bishop" (after d5 it blocks it) and
  the Nimzo-Indian's recapture on c3 "with the e-pawn". The other 8 had none.
- **Cost, on the owner's Pro plan:** the 12 briefs took about 28% of a 5-hour
  window and ~4% of the weekly limit, roughly 32k tokens each. Classifier A on
  the full briefs took another 8% of the window; it now reads the compact states
  file Jev reads. Jev cost a fraction of a penny. Research is the cost, so it
  runs in waves sized to the 5-hour window, and each brief is written as soon as
  it is finished so an interrupted wave resumes cleanly.

## Out of scope

Cleaning up `strategic_themes`; the video and study pipelines. Rewriting
descriptions is step 5 above, a separate decision.

### Pilot results (2026-10-04)

105 variations: the 100 most played (hubs excluded) plus the calibration set.
Briefs in `tools/data/style-briefs/`, answers in `_classify/`, and what each
page would show in `_classify/pilot-tags.md`.
`node tools/style-tags/validate.js` passes every check.

- **Anchors:** 42 of 42 right.
- **Agreement:** Sonnet and Jev agreed on 532 of 630 axis decisions (84%).
  Almost every disagreement was one of them choosing the hidden middle value,
  and in all but a few cases that was Sonnet. A blind Opus audit of 14 such
  disputes sided with Sonnet in 13, so a dispute involving a middle value now
  takes Sonnet's answer. Only 6 disputes were between two shown words; the judge
  settled all 6.
- **Closed was too broad.** Letting it cover a tense centre put 42% of games
  under Closed, including the Italian, the Ruy Lopez and the Exchange
  variations. Structure now has a hidden middle value, Flexible, and Closed
  means a locked centre: 8% of games.
- **Selectivity:** Advanced fell from 61% of positions to 21% of games. No plan
  exceeds 18%.
- **Gaps:** 3 of 105 show nothing at all (Vienna Game, Italian Classical,
  Queen's Pawn Chigorin) and 14 show plans only.
- **Description audit:** about a quarter of the current descriptions contain at
  least one wrong claim, e.g. the Dragon page describing the Accelerated Dragon.
- **Cost:** about 105 briefs over three 5-hour windows on the Pro plan, roughly
  1.3–2% of a window each, and about a quarter of a week's allowance in all. Jev
  cost a few pence of TypeSafe credit.

### Unsourced tier (2026-10-04)

The 1,308 variations past the pilot hold about 8,400 pages, and full research
for all of them would cost several weeks of the Pro allowance. They get an
unsourced brief instead (`tools/style-tags/UNSOURCED.md`): Sonnet writes the
evidence and its own tags from memory, without the web, given the parent
variation's researched overview for context. The writer stands as classifier A,
because a second Sonnet pass over the same model's knowledge adds cost without
independence; Jev still reads the evidence alone. Unsourced briefs carry no
audit and are not used to rewrite descriptions.

A blind test wrote unsourced briefs for 32 researched variations and compared
the tags with the researched answer:

- **No contradictions.** No axis came out with the opposite shown word (Sharp
  for Solid, Open for Closed) in any of the 32.
- **First 16:** 6 showed the same words; 80 of 96 axis decisions agreed. The
  misses were Balanced used as a hedge for Sharp lines (Dutch, English Defence,
  Chigorin), Offbeat for lines that are only less common, and Level read from
  the parent's reputation.
- **Second 16, after guidance on those three:** 8 showed the same words; 86 of
  96 agreed. The test set was changed so the guidance could not name its
  answers. The remaining misses are mostly a dropped Advanced or an extra
  Beginner, and the Beginner guidance was tightened after it.
- **Cost:** about 0.4% of a 5-hour window per brief, and about 1% of the week
  per 16.
- **Confidence matters more without sources.** Shown words the writer gave at
  0.65 or above matched the research in 36 of 37 cases; below that, 15 of 25. So
  for an unsourced brief, a dispute with Jev over a middle value takes A's shown
  word only at 0.65 or above, and otherwise the middle value.
- **What the pipeline cannot catch.** Jev reads the writer's evidence, so a rare
  branch mistaken for the main line convinces both (the La Bourdonnais came back
  as a dubious White gambit from the Reuter Gambit 3.Nf3 dxe4 4.Ng5).
  `validate.js` sends unsourced gambits the name does not mention to the judge.
