# Feature Backlog — assessed and ranked (2026-10-27, rev 6)

Rev 4 re-assesses rev 3 against what has actually shipped since July, and what
has not. The full reasoning, per-surface assessment and the viability note
behind every item is in `docs/reviews/2026-09-24-feature-review.md`. This file
is the ranked list that review produced. Rev 6 adds the market view and the
scores from `docs/reviews/2026-10-27-competitive-review.md`.

## How this file works

This file is the **idea pool and the order**: the reasoning, the decisions, and
items not yet defined well enough to build. An item becomes a **GitHub issue**
once it is ready to start: the problem is clear, there is a "done when", and it
links to the review or PRD behind it. When it moves, its bullet here becomes a
one-line link (`→ #123`); the issue is then the only place it is described.
Shipped items are deleted, not struck through; closed issues and git history
keep the record.

- **rev 1–3** (2026-07-11) — ranked the 2026-07-02 project review's candidates
  through the substitution, duplication, behavioural-realism, funnel, evidence
  and risk-laddering lenses. They produced the deviation-trainer PRD
  (`docs/proposals/2026-07-11-deviation-trainer-prd.md`).
- **rev 4** (2026-09-24) — re-checked every item against the code, folded in the
  2026-08-11 product/UX audit and the board-search PRD, added new ideas, and
  archived what no longer earns a place (owner-agreed; see **Archive**).
- **rev 4.1** (2026-10-05) — the Jev video filter (#157) and style tags (#160)
  shipped; added two Jev follow-ups under Enablers.
- **rev 4.2** (2026-10-09) — **Now** items 1–3 done. The Analyse floor is 3, not
  10/20 (owner decision: players spread games too thin for 10), and "off-book"
  keeps its name.
- **rev 4.3** (2026-10-10) — the 43 description claims the briefs marked wrong
  are fixed; the popularity refresh is parked; E2E specs are green and in CI.
- **rev 4.4** (2026-10-11) — style tags tail: 280 more variations (#174), 568
  left.
- **rev 4.5** (2026-10-13) — style tags tail finished (#179): every variation
  outside the 14 hubs is tagged. Out of **Later**.
- **rev 5** (2026-10-21) — the **Next** items moved to GitHub issues #195–199;
  **Now** is done apart from the parked popularity refresh, which moved to
  **Parked**. Shipped **Now** and **Next** items deleted.
- **rev 6** (2026-10-27) — a deep competitive review
  (`docs/reviews/2026-10-27-competitive-review.md`, notes alongside) scored 22
  candidates. Chess.com Game Review now flags where a game left your prep, so
  the "your games" moat is weaker than the principle below says; the strongest
  player complaint is drilling lines they never meet at their level, which our
  band data answers on every landing page. Added **Soon** (sparring v0,
  description claim audit, opponent scout), moved "your style" to **Later**,
  re-aimed the deviation trainer at the recurring leak, and added decisions A–F.
- **rev 6.1** (2026-10-27) — owner agreed decisions A–F. New issues: #204
  per-band popularity refresh, #205 set your level, #206 replace the difficulty
  labels, #207 sparring v0, #208 progressive content review. #198 folded into
  #195; #197 and #188 widened.

## The unifying principle

Unchanged from rev 3: **the only durable moat is connecting a user's own games
to learning content.** Lichess has better raw stats, Chessable has better
drilling, and YouTube has better explanations, each one click away. No free tool
walks _your_ games, finds _your_ recurring leak, and hands you the page, video
and drill for it.

_Rev 6 qualification:_ the "walks your games" half is no longer rare. ChessAtlas
and Chessbook flag where imported games left a repertoire, and since September
2026 Chess.com Game Review does it too; its free tier already marks the last
book move of one game a day. "Free, no account" does not set a trainer apart
either (Chess Prep Pro, Listudy, Chessdriller). What stays ours is the **landing
page**: any named opening, including the obscure ones Google sends people to,
with what players at your rating actually play from it. Rev 6 therefore puts
first-visit value on that page ahead of the Analyse-led loop (decision C), and
the deviation trainer must lead with the leak that recurs across many games, not
a single-game post-mortem.

## Rev 4 findings

1. **The destination is half-built.** Slice 1 (the evidence engine) shipped
   2026-07-13. Slice 2, the trainer itself, was never started: no detection
   code, no `?practice=` parameter. Nothing merged since mid-July moved the
   learning loop.
2. **The August audit's P0s are still open.** Analyse headlines noise, the
   detail page ignores `?ref=personal`, every explorer move resets scroll,
   unnamed continuations are dead ends, "Level" means two things, and the
   popularity snapshot is 14 months old.
3. **We could not see our users.** `/api/event` beacons landed in runtime logs
   that Hobby keeps for one hour. Impressions are 3–40/day. _Fixed 2026-09-24:_
   events now go to PostHog, and Vercel Web Analytics turned out to have been
   recording page views all along (the API's "not found" was wrong).
4. **So the order is: credibility, then sight, then the loop in its cheapest
   real form.** Do not add a fourth surface while the first three are
   unfinished.

---

## Next — close the loop cheaply `1–2 weeks`

- **Personal strip + "Drill this line"**, with the bridge line as its fallback →
  #195
- **Practice memory** → #196
- **Divergence callout** → #197
- **"Start here" shelf** → #199

#197 now includes "you can stop here at your level" (ranked first of 22).

## Soon — realistic practice and credibility _(rev 6)_

Scores and reasoning: `docs/reviews/2026-10-27-competitive-review.md`, "A scored
backlog".

- **Sparring v0** → #207
- **Progressive content review** of the pages people visit, 50–100 per batch,
  with a review ledger → #208
- **Popularity refresh, per rating band and dated** → #204
- **Set your level on the landing page and search** → #205 (needs #204 for
  ranking)
- **Replace Beginner/Intermediate/Advanced with measures from real games** →
  #206 (needs #204)
- **Make unnamed continuations clickable** (the "continuation links first" step
  of decision 2) → #209
- **Search: tell apart openings that share a name** (five "Najdorf Variation"
  rows) → #210
- **Opponent scout** — Analyse framed for "who am I playing on Thursday?": what
  they play per colour, linked to pages and to "Drill this line" in your colour.
  OpeningTree, the old favourite, is discontinued. **Gate:** schedule only if
  the late-November analytics revisit shows real `analyse_run` volume.

## Then — the differentiator `M each`

- **Slice 2 — deviation trainer v1**, as specified in the PRD §6, **led by the
  recurring leak across many games** (rev 6: a single-game "where did I leave
  book" is now close to a free Chess.com feature). J3, paste-a-game, is a
  secondary entry point rather than the public face.
- **Repertoire from your games** _(pending decision 3)_ — a move tree of what
  you actually play, which fills Repertoire by colour, flags inconsistent move
  orders, shows coverage gaps against what opponents really play, and exports
  PGN. It absorbs rev 3's #4 "My openings v2" (J4 + 3.5). _(review §4.4, audit
  #9)_
- **Run-over-run progress on Analyse** — the change since your last run, plus a
  time-control and date split. _(review §4.7)_

## Platform — depth `M each`, pending decisions

- **Position graph, then the detail page on it** _(pending decision 2)_ — board-
  search PRD slice 1. It makes all 12,106 named boards reachable (37% are not
  today) and gives unnamed continuations a destination, fixing audit E2.
- **Position facts** _(pending decision 4)_ — an offline Stockfish and club-play
  batch over ~15.5k boards, served per FEN, never whole. It absorbs TASK013. It
  unlocks, in order:
  - **J2 traps + common mistakes** — re-scoped. Only ~14 distinct trap-named ECO
    lines exist, so traps are found mechanically instead: a popular club move
    with a large engine swing. Any LLM prose must be engine-confirmed and replay
    legally. Absorbs audit #8.
  - **Sparring mode** — practice where the opponent replies as your band
    actually does. Never built on live explorer calls.

## Later

- **Your style, from your games** _(rev 6, demoted from Soon)_ — Analyse counts
  joined to `style-tags.json`. Unique data, but a crowded concept (Chessiverse,
  Chess DNA, Chessigma) with no demand signal, and the level axis is 92%
  "intermediate".
- **Maia-2 fallback for sparring** _(rev 6; decision F: Maia-2)_ — a small
  in-browser rating-conditioned move model, lazy-loaded on the practice board
  only when the explorer runs thin, labelled as a model's prediction. Never
  writes text.
- **Model games** _(rev 6)_ — guess the move through the explorer's notable
  games, as Chessbook does; PGNs need the Lichess game-export API. After
  sparring v0, which shares the board.
- **Grounded "why" from position facts** _(rev 6)_ — engine facts in, an LLM
  only words them, every line replays legally. The architecture the credible AI
  coaches use. After position facts.
- **J1 — per-move "why" annotations.** `courses.json` holds study links only, so
  mining study comments needs a pipeline change plus a licence and attribution
  check.
- **Family hubs (3.4)** — read the `seo-crawl-graph` skill first; 28 new URLs
  compete with each family's root page.
- **`/board`** — board-search PRD slices 2–3, if its "reached only via the
  board" metric can be measured.
- **Shareable opening report card** — an acquisition experiment, gated on the
  Analyse statistics fix.

## Parked

- **Slice 3 — "drill your leaks" SRS** — pending accounts (owner decision
  2026-07-11, unchanged). Practice memory is the stateless interim.
- **J7 — PWA with offline practice** — only once there is a daily reason to open
  the app.
- **Side-aware style plans** — a plan chip does not say who it favours, so the
  French Advance shows White's "Space advantage" to Black players. Needs a side
  per plan, which means reclassifying (owner decision 2026-10-13: too costly
  now).

---

## Enablers (sequence alongside)

- **Measurement** _(done 2026-09-24)_ — page views in Vercel Web Analytics
  (already on; custom events there are Pro-only). Events go to PostHog EU Cloud
  free tier through `trackEvent` (`packages/web/src/lib/analytics.ts`), keyed by
  the anonymous id, so funnels and the accounts gate's 14-day retention are
  readable. `/api/event` is deleted.
- **Lichess explorer rate-limit monitoring** — carried over from rev 3. The
  `/api/explorer` proxy uses one token at 25 req/min; only cache misses reach
  Lichess (CDN 24h bands / 7d masters), and crawler user-agents are 403'd before
  the upstream call. Each uncached detail view costs ~3 queries. **Act when**
  sustained 429s appear or traffic grows ~10×. The signal meant for this, the
  `explorer_error` `{status:429}` event, is now readable in PostHog. If it shows
  429s, add a structured log line per upstream fetch and per 429. Solve ladder:
  request a higher limit, rotate tokens, then self-host a games DB.
- **Popularity stats refresh** — now #204, and the source for position facts'
  club-move shares. Check the pipeline's mode first: the current snapshot's
  metadata says it was built "API-based".
- **Variation-level video classification** — carried over unassessed from rev 3:
  an endorsed pipeline project that also builds validation tooling for J1/J2.
  - ~~**Jev video experiment**~~ — shipped 2026-10-02 as a rejection filter plus
    18 pinned videos (#157), $1.60 spent. Next steps (a rubric baseline, then a
    move-order check) are in `docs/video-matching-and-jev.md`.
  - **Use Jev's video families** _(added 2026-10-05)_ — the experiment's run 2
    put all 10,239 corpus videos in a family. Where it disagreed with every
    family the matcher had shown a video under, the blind judge sided with Jev
    67% and the matcher 13%, and on displayed videos Jev called "not an opening
    video" it agreed 90%. Nothing reads these answers yet. They feed the family
    shelves pages without their own videos fall back to. Answers are in
    `tools/data/experiments/jev-run2.jsonl`, gitignored and on the owner's
    machine only; re-asking costs about $0.70. Results:
    `docs/proposals/2026-10-02-jev-video-experiment.md`.
- **Fix the descriptions the briefs proved wrong** _(added 2026-10-05)_ — the
  105 researched style briefs audited each current description and
  `common_plans` claim by claim and marked 43 claims wrong, in 32 briefs (e.g.
  the Dragon page describes the Accelerated Dragon). _Those 43 are fixed
  (2026-10-10)._ What remains: consider Jev as a cheap first pass over the rest:
  for each claim, supported / wrong / unverifiable against its brief, with only
  "wrong" going to a Claude fix. Unsourced briefs carry no audit, so the tail
  needs evidence before Jev can check it. Plan: step 5 and "Research once, use
  it twice" in `docs/proposals/2026-10-02-opening-style-classification.md`.

## Open decisions

1. ~~Archive list~~ — **agreed 2026-09-24**, applied below.
2. **Board search:** graph now and `/board` later (recommended), or the PRD's
   own plan.
3. **Repertoire:** promote it (repertoire from your games) or fold it into
   Discover.
4. **Position facts:** approve an offline Stockfish run and a sharded
   per-position store.
5. ~~Measurement~~ — **decided 2026-09-24**: Vercel page views plus PostHog
   events.
6. ~~**A. Sparring v0**~~ — **decided 2026-10-27**: capped, CDN-cached explorer
   calls now → #207.
7. ~~**B. Bridge line**~~ — **decided 2026-10-27**: folded into #195.
8. ~~**C. Strategy**~~ — **decided 2026-10-27**: first-visit value on the detail
   page ahead of the Analyse-led loop; re-check after the November analytics
   revisit.
9. ~~**D. Popularity refresh**~~ — **decided 2026-10-27**: un-parked, per band
   and dated → #204.
10. ~~**E. Description audit**~~ — **decided 2026-10-27**: progressive review of
    visited pages → #208.
11. ~~**F. Maia licence**~~ — **decided 2026-10-27**: Maia-2, after confirming
    the weights' licence; Later, behind #207.

## Build order

```
Next:     personal strip + ?practice= + bridge (#195) · practice memory (#196)
          · divergence callout (#197) · Start here (#199)
Soon:     sparring v0 (#207) · content review (#208) · per-band stats (#204)
          → your level (#205) → difficulty replaced (#206) · continuation
          links (#209) · same-name search results (#210) · opponent scout
          (gated)
Then:     deviation trainer v1 (+ J3 public face) · repertoire from your games
          · run-over-run progress
Platform: position graph → detail page on it · position facts → J2 → sparring
Later:    your style · Maia fallback · model games · grounded why · J1 · family hubs · /board · report card
Parked:   slice 3 SRS · J7 · side-aware plans
```

---

## Archive

Agreed by the owner on 2026-09-24. The reasoning is in the feature review §3.

| Item                                                    | Outcome  | Why                                                                                                                                                 |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice 1 — explorer bundle (3.2 bands, M1 notable games) | Shipped  | 2026-07-13, PR #50. M2 practitioners were cut as redundant; the level-check strip and bridge card were cut and return in **Next** in cheaper forms. |
| TASK015 — opening tree navigation                       | Shipped  | Breadcrumbs, next moves, "Instead of…" rows and ancestor links. The remaining reachability gap is the position graph.                               |
| TASK005 — Stockfish game analysis and blunder detection | Archived | Whole-game blunder review is one click on chess.com and Lichess. The opening-scoped part lives in the trainer.                                      |
| TASK014 — community curation and upvotes (Supabase)     | Archived | A database, abuse handling and moderation, for an audience of a few people a day. Revisit at ~100× traffic.                                         |
| M3 — master continuations in practice                   | Archived | Superseded by popular-continuation practice and the level lens; sparring mode is the better version.                                                |
| J8 — Stockfish deviation analysis (client WASM)         | Archived | The mobile CPU and Vercel cost objections go away when the engine runs offline (position facts).                                                    |
| 3.6 — middlegame bridge                                 | Archived | Cut in rev 3; still holds.                                                                                                                          |
| J6 — side-by-side comparison                            | Archived | Cut in rev 3; still a chatbot question.                                                                                                             |
| Opening style classification                            | Shipped  | 2026-10-05, PR #160. A fixed taxonomy (`docs/style-taxonomy.md`) replaces the LLM tags; the tail finished in #174 and #179.                         |

**Merged, not archived:** the level-check strip → divergence callout · #4 My
openings v2 → repertoire from your games · TASK013 → position facts · audit #8
common mistakes → J2 · J5 guided paths → "Start here" shelf, then family hubs.
