# Feature Backlog — assessed and ranked (2026-09-24, rev 4)

Rev 4 re-assesses rev 3 against what has actually shipped since July, and what
has not. The full reasoning, per-surface assessment and the viability note
behind every item is in `docs/reviews/2026-09-24-feature-review.md`. This file
is the ranked list that review produced.

- **rev 1–3** (2026-07-11) — ranked the 2026-07-02 project review's candidates
  through the substitution, duplication, behavioural-realism, funnel, evidence
  and risk-laddering lenses. They produced the deviation-trainer PRD
  (`docs/proposals/2026-07-11-deviation-trainer-prd.md`).
- **rev 4** (2026-09-24) — re-checked every item against the code, folded in the
  2026-08-11 product/UX audit and the board-search PRD, added new ideas, and
  archived what no longer earns a place (owner-agreed; see **Archive**).

## The unifying principle

Unchanged from rev 3: **the only durable moat is connecting a user's own games
to learning content.** Lichess has better raw stats, Chessable has better
drilling, and YouTube has better explanations, each one click away. No free tool
walks _your_ games, finds _your_ recurring leak, and hands you the page, video
and drill for it.

## Rev 4 findings

1. **The destination is half-built.** Slice 1 (the evidence engine) shipped
   2026-07-13. Slice 2, the trainer itself, was never started: no detection
   code, no `?practice=` parameter. Nothing merged since mid-July moved the
   learning loop.
2. **The August audit's P0s are still open.** Analyse headlines noise, the
   detail page ignores `?ref=personal`, every explorer move resets scroll,
   unnamed continuations are dead ends, "Level" means two things, and the
   popularity snapshot is 14 months old.
3. **We cannot see our users.** `/api/event` beacons land in runtime logs that
   Hobby keeps for one hour, and Web Analytics reports as not enabled.
   Impressions are 3–40/day. The accounts go/no-go input does not exist.
4. **So the order is: credibility, then sight, then the loop in its cheapest
   real form.** Do not add a fourth surface while the first three are
   unfinished.

---

## Now — credibility and sight `days`

- **Analyse statistics:** drop the `list[0]` fallback in `findBestOpening`
  (`personalStatsLib.ts:115`), raise the floors (≥10 games for a variation card,
  ≥20 for a family card), print sample sizes inside the percentage, and rank
  "needs work" by games lost. _(audit #2)_
- **Copy and formatting:** add the billions branch to `formatGamesPlayed`
  (`OpeningCard.tsx`); rename the Discover facet to **Difficulty** so **Level**
  means only the rating band; give "off-book" a learner's wording; label the two
  bare percentages on move rows. _(audit #4, #6, #10, E3)_
- **Explorer scroll:** no `ScrollToTop` reset when the new route is a move step
  from the current position. _(audit E1)_
- **Measurement:** see Enablers — this is the gate for every retention decision
  below.
- **Popularity stats refresh:** run the pipeline, and date both game counts on
  screen. _(audit #5)_

## Next — close the loop cheaply `1–2 weeks`

- **Personal strip + "Drill this line"** — read `?ref=personal` on the detail
  page ("You: 8 games as Black, 2 wins, 5 losses"), and add a public
  `?practice=white|black` that arms practice mode. Slice 2's CTA needs the same
  parameter. _(review §4.2, audit #1)_
- **Practice memory** — persist attempts in localStorage
  (`{fen, colour, attempts, misses, missedAtPly, lastSeen}`) and surface a
  "Lines to review" shelf. No due dates and no streaks: this is not the parked
  SRS. _(review §4.1)_
- **Divergence callout** — one line when a move's _share_ differs sharply
  between the selected band and masters. Both bands are fetched already, so it
  costs no extra Lichess requests. Replaces the cut level-check strip. _(review
  §4.3, audit E4)_
- **Analyse bridge, rebuilt small** — one line near Practice: "How do you score
  in this line? Check your games." Replaces the card cut on 2026-07-13.
- **"Start here" shelf** — 20–30 hand-picked learnable openings leading
  Discover, split by colour. The cheap half of J5. _(review §4.8, audit #3)_
- **E2E specs green and in CI** — 8 of 9 fail on `main`; a prerequisite for
  slice 2.

## Then — the differentiator `M each`

- **Slice 2 — deviation trainer v1**, as specified in the PRD §6. **J3,
  paste-a-game post-mortem, ships as its public face**: the same book-walk code,
  no username needed, and it lives where "Paste a game" already is.
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

---

## Enablers (sequence alongside)

- **Measurement** _(pending decision 5)_ — enable Web Analytics page views in
  the Vercel dashboard ("does anyone reach `/analyse`?" needs no code). If event
  counts are needed, send beacons somewhere that outlives an hour; a daily
  counter in a free-tier Marketplace store is the smallest option, and a new
  dependency.
- **Lichess explorer rate-limit monitoring** — carried over from rev 3. The
  `/api/explorer` proxy uses one token at 25 req/min; only cache misses reach
  Lichess (CDN 24h bands / 7d masters), and crawler user-agents are 403'd before
  the upstream call. Each uncached detail view costs ~3 queries. **Act when**
  sustained 429s appear or traffic grows ~10×. The signal meant for this, the
  `explorer_error` `{status:429}` beacon, has the same one-hour visibility as
  every other beacon until **Measurement** is fixed. Then add a structured log
  line per upstream fetch and per 429. Solve ladder: request a higher limit,
  rotate tokens, then self-host a games DB.
- **Popularity stats refresh** — in **Now**, and the source for position facts'
  club-move shares. Check the pipeline's mode first: the current snapshot's
  metadata says it was built "API-based".
- **Variation-level video classification** — carried over unassessed from rev 3:
  an endorsed pipeline project that also builds validation tooling for J1/J2.

## Open decisions

1. ~~Archive list~~ — **agreed 2026-09-24**, applied below.
2. **Board search:** graph now and `/board` later (recommended), or the PRD's
   own plan.
3. **Repertoire:** promote it (repertoire from your games) or fold it into
   Discover.
4. **Position facts:** approve an offline Stockfish run and a sharded
   per-position store.
5. **Measurement:** Web Analytics page views, and whether event counts justify a
   store.

## Build order

```
Now:      Analyse floors · copy fixes · explorer scroll · measurement · stats refresh
Next:     personal strip + ?practice= · practice memory · divergence callout
          · bridge line · Start here shelf · E2E in CI
Then:     deviation trainer v1 (+ J3 public face) · repertoire from your games
          · run-over-run progress
Platform: position graph → detail page on it · position facts → J2 → sparring
Later:    J1 · family hubs · /board · report card
Parked:   slice 3 SRS · J7
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

**Merged, not archived:** the level-check strip → divergence callout · #4 My
openings v2 → repertoire from your games · TASK013 → position facts · audit #8
common mistakes → J2 · J5 guided paths → "Start here" shelf, then family hubs.
