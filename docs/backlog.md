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
- **rev 4.1** (2026-10-05) — the Jev video filter (#157) and style tags (#160)
  shipped; added two Jev follow-ups under Enablers.
- **rev 5** (2026-10-05) — folded in every follow-up that lived outside this
  file: what the style-tags, Jev video and `irregular` work (#156–#160) left in
  `activeContext.md` and the proposal docs, `progress.md`'s "What's Left" list
  (now gone), and open items in older reviews that rev 4 did not carry over.
  **This file is the only list of open work**; see "Keeping docs current" in
  `AGENTS.md`.

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
- **Dragon description** describes the Accelerated Dragon. One of the 43 wrong
  claims under Enablers; it leads because it is on a top page.
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
- **Style tags tail** — style classification shipped in #160 (see **Archive**).
  848 variations remain untagged: 16% of pages, 0.8% of games. Plan in
  `.github/memory-bank/activeContext.md`, runbook in
  `tools/style-tags/README.md`. Needs the gambit rule in **Now** first. Other
  leftovers from #160:
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
- **Family rollups phases 2 and 3** _(unassessed; carried over from 2026-06-06)_
  — a family lens route with a chip system, and display-only repertoire grouping
  (`.github/memory-bank/specs/2026-05-04-opening-family-rollups.md` §6.2–6.3).
  Phase 1 shipped in #34. Rev 4 never assessed them: phase 2 overlaps **family
  hubs** and phase 3 overlaps open decision 3, so decide them there rather than
  separately.

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
  - **The October refresh, #154, predates the Jev filter.** The monthly Action
    (`video-refresh.yml`, 06:00 on the 1st) is live and opened #154 on
    2026-10-01 from a `main` without #157 or #159, and both rewrote
    `api/data/video-index.json`. Do not merge it as it stands: close it and
    re-run the workflow (`workflow_dispatch`) on current `main`. Check the
    `JEV_API_KEY` repository secret is set first — the filter fails open without
    it, so new pairs Jev would reject get through.
  - **The "vs" penalty fires on opening comparisons.** `playerVsPattern` in
    `video-matcher.js` matches any two capitalised words around "vs", so
    "Sicilian vs French Defense" and "Attack vs Defense" take the
    player-vs-player penalty. Its test uses a lowercase title and passes anyway.
    Left over from TASK012; fix test-first.
  - **The scorer gives 0** to some videos whose titles name the opening
    (Veresov, Owen, Nimzo-Larsen). Fixing it beats adding more pins.
  - **A move-order check** on the top few hundred pages: most covered top pages
    still lead with a sibling-line video.
  - **Measured baseline** _(parked 2026-10-02)_ — a blind judge of the top-200
    pages' top 3 videos against a teaching rubric, to rank the two fixes above.
    Set-up in `docs/video-matching-and-jev.md`, "What's next".
  - **V4–V6** — a video library per family, duration and level fit, and
    chapter-level matching
    (`docs/reviews/2026-07-02-video-experience-review.md`).
  - **Lazy-load `video-index.json`** if Active CPU nears Hobby's 4h (1h55m/30d).
- **Fix the descriptions the briefs proved wrong** _(added 2026-10-05)_ — the
  105 researched style briefs audited each current description and
  `common_plans` claim by claim and marked 43 claims wrong, in 32 briefs (e.g.
  the Dragon page describes the Accelerated Dragon). None are fixed yet. Correct
  those from the briefs' sources first, then consider Jev as a cheap first pass
  over the rest: for each claim, supported / wrong / unverifiable against its
  brief, with only "wrong" going to a Claude fix. Unsourced briefs carry no
  audit, so the tail needs evidence before Jev can check it. Plan: step 5 and
  "Research once, use it twice" in
  `docs/proposals/2026-10-02-opening-style-classification.md`. This is also the
  unfinished half of the June common-plans work: the serving bug was fixed in
  #41, but its Tier 1–2 content checks and Option D (re-enrich records that
  fail) never ran (`docs/proposals/2026-06-12-common-plans-provenance.md`).
- **Study refresh** _(open since 2026-07-10)_ — a monthly Action for studies
  mirroring `video-refresh.yml` (fetch, `course:rematch`, audited auto-PR), and
  a periodic `--refetch` so cached likes do not go stale. `courses.json` has not
  been rebuilt by anything automatic.
  `docs/reviews/2026-07-10-study-matching-v2.md`, "Follow-ups".

## Engineering health

Moved from `progress.md`'s "What's Left" (2026-10-05), plus older review items
rev 4 did not carry. Not features, so not ranked against them; pick up
alongside.

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
- **Detection bands** _(open since 2026-08-28)_ — a deterministic script on a
  rolling baseline that files an issue on a breach, with no model and no session
  woken. First two metrics: the video audit's figures against a committed
  baseline, and a synthetic fetch of a few `/opening/` URLs asserting a
  non-empty `#root` and a real description. The second would have caught the
  de-indexing on the day it shipped. Wants a task file first.
  `docs/reviews/2026-08-28-ai-native-sdlc-adoption.md` §4.
- **A SessionStart hook that runs `npm ci`** in remote sessions, so husky's git
  hooks bind. Today a fresh session commits with no pre-commit or pre-push
  checks (same review, "What shipping 1 and 2 turned up").
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
- **Smaller UX gaps** (2026-08-28 list, `.github/memory-bank/archive.md`):
  mobile Discover shows no chips for active filters (they sit inside the sheet);
  no win-rate filter on Discover (sort was rejected: a minimum-sample floor
  makes `total` depend on `sort`); no shared ARIA tooltip component;
  `rankNotableGames` dedupes by exact player name, so "Caruana, F." and
  "Caruana, Fabiano" count as two players.
- **Run `/doctor` locally** _(open since 2026-07-25)_ — it cannot run from a
  remote session, and it proposes `CLAUDE.md` trims.

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
Later:    J1 · family hubs · /board · report card · style tags tail
          · family taxonomy leftovers · family rollups phases 2–3
Enablers: redo the #154 refresh → "vs" penalty · scorer zeros → move-order check
          · wrong descriptions · Jev families · study refresh
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
| Opening style classification                            | Shipped  | 2026-10-05, PR #160. A fixed taxonomy (`docs/style-taxonomy.md`) replaces the LLM tags; the tail is in **Later**.                                   |

**Merged, not archived:** the level-check strip → divergence callout · #4 My
openings v2 → repertoire from your games · TASK013 → position facts · audit #8
common mistakes → J2 · J5 guided paths → "Start here" shelf, then family hubs.
