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
- **rev 5** (2026-10-05) — folded in the follow-ups the style-tags, Jev video
  and `irregular` work (#156–#160) left in `activeContext.md` and the proposal
  docs, and `progress.md`'s "What's Left" list, which is now gone. **This file
  is the only list of open work**; see "Keeping docs current" in `AGENTS.md`.

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
3. **We could not see our users.** `/api/event` beacons landed in runtime logs
   that Hobby keeps for one hour. Impressions are 3–40/day. _Fixed 2026-09-24:_
   events now go to PostHog, and Vercel Web Analytics turned out to have been
   recording page views all along (the API's "not found" was wrong).
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
- ~~**Measurement**~~ — done 2026-09-24; see Enablers. The funnels and the
  `analyse_run` retention insight are saved in PostHog; what remains is reading
  them once real traffic has accrued.
- **Popularity stats refresh:** run the pipeline, and date both game counts on
  screen. _(audit #5)_
- **Spell out the gambit rule before the style tail runs.** The judge found the
  King's Gambit Accepted lines where Black returns the pawn with …d5 (Abbazia,
  Modern) are not gambits under the taxonomy's own rule, which
  `docs/style-taxonomy.md` does not yet state. The tail would repeat the error.
- **Dragon description** describes the Accelerated Dragon. Fix the text.
- **Style search intent parser** misreads "solid response to e4", "solid e4
  openings", "… for white" and "advanced sicilian defence" (all older than the
  tags). It also skews the `query_shape` measurement that gates style work. Read
  the `search-ranking` skill first.

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
- **Opening style classification** _(added 2026-10-02)_ — the LLM style tags
  barely distinguish one opening from another: "Initiative" is on 99% of
  positions, and the "solid" filter passes 84%. Replace them with a few
  exclusive axes of named values (Quiet / Balanced / Sharp, …), classified per
  named variation and validated by script (anchors, cross-model agreement, draw
  rate and material checks, a blind judge), with no hand-labelling. Gated on
  measuring whether anyone searches by style (`query_shape` on `search_select`,
  added 2026-10-02). Proposal:
  `docs/proposals/2026-10-02-opening-style-classification.md`. _Shipped for 80%
  of pages 2026-10-05 (#160), ahead of its gate._ What remains:
  - **The tail** — 848 variations (16% of pages, 0.8% of games), on leftover
    usage. Plan in `activeContext.md`, runbook in `tools/style-tags/README.md`.
    Needs the gambit rule in **Now** first.
  - **Split the Maróczy Bind (5.c4) out of the Accelerated Dragon.**
  - **Saved repertoire entries keep their old level** after the taxonomy change.
  - **Delete `search-by-category` and `search-categories`** — they read the old
    tags and have no caller.
  - **Tags in the crawler pre-render** — out of scope in #160; tags reach
    Googlebot only through the rendered page. `seo-crawl-graph` skill first.
- **Family taxonomy leftovers** from the `irregular` split
  (`docs/proposals/2026-10-02-irregular-family-split.md`): the Torre Attack
  still goes to `london`; 1.g3 stays in `irregular` because KIA's own shelf is
  contaminated; the 192 `uncategorised` positions get no shelf.

## Parked

- **Slice 3 — "drill your leaks" SRS** — pending accounts (owner decision
  2026-07-11, unchanged). Practice memory is the stateless interim.
- **J7 — PWA with offline practice** — only once there is a daily reason to open
  the app.

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
- **Popularity stats refresh** — in **Now**, and the source for position facts'
  club-move shares. Check the pipeline's mode first: the current snapshot's
  metadata says it was built "API-based".
- **Variation-level video classification** — carried over unassessed from rev 3:
  an endorsed pipeline project that also builds validation tooling for J1/J2.
  - **Jev video experiment** _(added 2026-10-02, $5 budget)_ — test whether a
    decision model reading each video's own text catches bad matches the scorer
    keeps, judged blind. Plan:
    `docs/proposals/2026-10-02-jev-video-experiment.md`. _Done 2026-10-02; the
    rejection filter shipped in #157._
  - **Enable the monthly refresh Action** — commit `tools/data/videos.sqlite`,
    confirm `YOUTUBE_API_KEY`, add `JEV_API_KEY`. Until then the index only
    moves when someone runs it by hand. Then V4–V6
    (`docs/reviews/2026-07-02-video-experience-review.md`).
  - **The scorer gives 0** to some videos whose titles name the opening
    (Veresov, Owen, Nimzo-Larsen). Fixing it beats adding more pins.
  - **A move-order check** on the top few hundred pages: most covered top pages
    still lead with a sibling-line video.
  - **Measured baseline** _(parked 2026-10-02)_ — a blind judge of the top-200
    pages' top 3 videos against a teaching rubric, to rank the two fixes above.
    Set-up in `docs/video-matching-and-jev.md`, "What's next".
  - **Lazy-load `video-index.json`** if Active CPU nears Hobby's 4h (1h55m/30d).

## Engineering health

Moved from `progress.md`'s "What's Left" (2026-10-05). Not features, so not
ranked against them; pick up alongside.

- **#86's remaining half** — flat config and eslint 10 landed (#97); the
  react-hooks 7 `recommended` preset did not. Its compiler rules flag ~20 sites,
  `useOpeningSearch` among them. Land them at `warn`, clear in batches, promote.
- **Blocked upstream**: TS 7 (#107) — typescript-eslint 8.70.1 still peers
  `typescript <6.1.0`. `tools/analysis` still has no CI at all.
- **`npm run test:e2e` fails 8 of 9 specs on `main`** — selectors gone stale
  ("Search by pasting PGN" vs "Paste a game"), and no workflow runs them. Also
  in **Next**.
- **Watch the SEO recovery**: 2026-09-22 — 7,174 indexed, 2,038 discovered-not-
  indexed, sitemaps 5–7 never read, impressions flat. Next lever: slug URLs with
  301s. Also: `/opening/a/b/…` (unencoded FEN) serves a self-canonical
  duplicate.
- **A protected preview shows Vercel's login** on a direct `/opening/` load: the
  middleware fetches `/index.html`.
- **`packages/shared` has two latent defects**: its `tests/` runs in no CI
  suite, and its barrels export without extensions.
- **Search is not a real combobox** — no roles, no live region. Biggest a11y
  gap.
- **Search returns near-duplicate names**: four identical "najdorf" rows
  separated only by ECO — a data problem.
- **Toasts need one host** (two within 4s cover an Undo), and **TASK006 —
  Coverage** wants `collectCoverageFrom` shrunk; it gates 90% on a subset.
- **Mobile Discover facet chips**, win-rate filtering, ARIA tooltips, name
  dedupe. See `.github/memory-bank/archive.md`.

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

## Build order

```
Now:      Analyse floors · copy fixes · explorer scroll · stats refresh
          · gambit rule · Dragon description · style intent parser
Next:     personal strip + ?practice= · practice memory · divergence callout
          · bridge line · Start here shelf · E2E in CI
Then:     deviation trainer v1 (+ J3 public face) · repertoire from your games
          · run-over-run progress
Platform: position graph → detail page on it · position facts → J2 → sparring
Later:    J1 · family hubs · /board · report card · style tail and leftovers
          · family taxonomy leftovers
Enablers: video refresh Action → scorer zeros → move-order check
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
