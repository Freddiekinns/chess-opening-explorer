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

1. **A fixed taxonomy of scored axes instead of tag bags.** For example:
   - quiet ↔ sharp (1–5)
   - sound ↔ risky (1–5)
   - structure: open / semi-open / closed
   - theory load (1–5)
   - gambit: yes / no
   - approach: system / principled main line / offbeat
   - plans: up to three from a list of about 30 named themes (minority attack,
     IQP, kingside pawn storm, …)

   Each axis has written definitions with anchor openings, such as "sharp 5 =
   Najdorf main line, sharp 1 = Exchange Slav". Scores let search _rank_ ("most
   aggressive replies to 1.e4"), not just pass or reject.

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
5. **Use the stats we already have as a check.** `popularity_stats.json` carries
   `draw_rate`. Among positions with ≥20k games, the mean draw rate is 3.8% for
   "Gambit", 4.5% for "Sharp" and 5.4% for "Solid". The extremes run from
   Stafford Gambit at ~0% to queenless QGA lines at ~15%. It is a sanity check
   and a ranking input, never a number shown as a style statistic.
6. **Store it beside `analysis_json`, not over it.** The descriptions are live
   page content; changing them is a separate decision.

## Experiment before building

1. Hand-label a reference set of ~100 openings on the taxonomy, spread across
   families and popularity.
2. Run four arms against it:
   - (a) today's tags, mapped to the taxonomy
   - (b) a frontier model with structured output, from name and moves
   - (c) a decision model (Jev) on the existing descriptions
   - (d) (b) or (c) on web-researched briefs
3. Measure each arm on:
   - agreement with the reference set
   - consistency within a variation
   - filter selectivity: each style value should hold a minority of the top
     1,000, not most of it
   - the top ten results for a fixed set of style queries

This shows whether the gain comes from the taxonomy, the evidence or the model.
The expectation is that the taxonomy does most of the work.

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

Today nothing measures whether anyone searches by style. `search_select` sends
only `surface` and `rank`, and search text is never sent. Step 0:

- Add a `query_shape` enum (`name` / `eco` / `moves` / `style` / `other`) to
  `search_select`. It is a small enum, within the analytics rules in
  `AGENTS.md`.
- Count Discover `?style=` and `?level=` page views in PostHog.

After about two weeks of traffic, schedule this work only if style queries and
facets are a meaningful share of use.

## Out of scope

Rewriting descriptions; cleaning up `strategic_themes`; the video and study
pipelines.
