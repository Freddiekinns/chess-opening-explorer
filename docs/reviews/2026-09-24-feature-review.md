# Feature review — what we have, what was proposed, what to build next

**Date:** 2026-09-24 · **Scope:** every feature idea recorded since February
(`docs/backlog.md` rev 3, the deviation-trainer and board-search PRDs, the
2026-07-02 project review, the 2026-08-11 product/UX audit, TASK005/008/013/
014/015), checked against the code on `main` at `6ee7d444e`, plus new ideas.
**Question:** what makes a club player measurably better at openings, and which
of those can one developer actually ship and sustain?

Every verdict carries a viability note: what exists already, what it costs, and
what would make it fail. Sizes are for one developer working with Claude: **S**
is days, **M** is one to two weeks, **L** is several weeks.

---

## 1. Where the product actually is

Four facts reshape the backlog more than any single feature idea does.

**1. The backlog's destination is half-built and has been idle for ten weeks.**
Slice 1 of the deviation trainer (the level lens, live Lichess stats, notable
games, `/api/event`) shipped on 2026-07-13. Slice 2, the trainer itself, was
never started. No deviation-detection code exists in `packages/web` or
`packages/shared`, and the `?practice=` parameter it needs was never added.
Everything merged since mid-July has been SEO, video matching, infrastructure
and Dependabot work. That work was necessary, but the product's learning loop
has not moved since July.

**2. Almost none of the August audit's P0 findings have been fixed.** Each of
these was verified in the code today:

| Audit finding                                           | Still true | Where                                                 |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Analyse headlines a 3-game "100% win rate" line         | Yes        | `personalStatsLib.ts:115` (`return list[0]`)          |
| `?ref=personal&username=…` is written, never read       | Yes        | `OpeningRow.tsx:39`, `PersonalOpeningStats.tsx:373`   |
| Every explorer move resets scroll to the top            | Yes        | `App.tsx:21–24` `ScrollToTop`                         |
| Unnamed continuations are inert and labelled "off-book" | Yes        | `OpeningNavigator.tsx:83`, `MobileDataSurface.tsx:72` |
| "Level" means opening difficulty _and_ player rating    | Yes        | `FilterBar.tsx:45` vs `LevelLens.tsx`                 |
| 3.78 billion renders as "3778.2M games"                 | Yes        | `OpeningCard.tsx:93–97`                               |
| Discover leads with "King's Pawn Game" ×2               | Yes        | no teachability sort or curated shelf exists          |
| Popularity snapshot is stale                            | Worse      | `analysis_timestamp: 2025-07-15`, now 14 months old   |

These are small fixes, and they are the credibility of the two surfaces people
actually use.

**3. There are very few people to build for, and we cannot see them.** Search
impressions are 3–40 a day, against 100–250 in mid-July. Google indexes 7,174
pages and shows almost none of them. The `/api/event` beacons write to Vercel
runtime logs, which the Hobby plan keeps for **one hour**. Vercel's Web
Analytics API returns "Web Analytics not found" for the project, even though
`<Analytics />` is mounted in `App.tsx`. The PRD's accounts go/no-go gate ("same
anonymous id re-running Analyse within 14 days") was set against data nobody can
read.

> **Correction (2026-09-24, later the same day):** Web Analytics _was_ enabled.
> The dashboard shows page views, routes, referrers and devices; only the API
> answered "not found". Custom events remain Pro-only, so events now go to
> PostHog — see the backlog's **Measurement** entry.

**4. The substitution argument still holds.** Lichess has better statistics,
Chessable better drilling, YouTube better explanations. What nobody offers free
is the connection between _your_ games and the content for them. The July
backlog's thesis is right. It has just not been built.

**What follows from this:** do the credibility fixes first. Make measurement
work next, so we can see who uses the site. Then build the loop in its cheapest
real form, rather than adding a fourth surface to a site whose first three are
unfinished.

---

## 2. What exists today, surface by surface

### Opening detail page — _the product; strongest surface_

- **Good:** 12,377 pages, 100% LLM-enriched (description, plans, tags,
  complexity), matched videos (specificity 54.2%, contamination 0%) and studies
  (6,100+ chapters), a level lens over live Lichess data, honest `null` handling
  for missing stats, and content in the HTML for crawlers.
- **Bad:** it only ever says what is _common_, never what is _good_. There is no
  evaluation, no "this is the main line", no "here is the trap". Stepping
  through moves is a page load plus a scroll back from the top each time (audit
  E1). The most realistic club continuations are dead ends (E2), and 37% of the
  corpus cannot be reached by clicking (board-search PRD §2).
- **Could be better:** a callout for the level divergence (E4), where the data
  is already fetched. Practice pre-armed from a link. A personal strip when the
  visitor arrives from Analyse.

### Practice mode — _the "chess trainer"; the thinnest part of the loop_

How it works today: the user picks a colour and replays the page's named line.
Lines shorter than 8 plies are extended by up to 6 plies, following the
most-played named child each time (`OpeningDetailPage.tsx:361–431`, ranked by
the 2025-07-15 snapshot's `gamesPlayed`). Wrong moves are rejected, a hint
appears after two misses, and there is audio and tap-to-move.

- **Good:** it is correct and tactile, works on mobile, and fixed the "Move 1 of
  1" stub problem.
- **Bad:** it is a recall test of **one fixed line**. The opponent plays the
  same moves every time, and never plays what a real 1200 plays. There is no
  score, no memory of what you got wrong, no reason to come back, and no
  explanation of why a move is right. Nothing links a practice session to
  Analyse or Repertoire.
- **Could be better:** see §4, "Practice memory" and "Sparring mode". These are
  the two biggest upgrades to the part people mean by "the trainer".

### Analyse (personal games) — _the differentiator, currently untrustworthy_

- **Good:** one-click import from chess.com or Lichess with no account. Family
  rollups with a per-side sort. Distribution bars. A sample report as the blank
  state. The reduction is shared with the fixture generator.
- **Bad:** it headlines noise (audit #2). The best-opening card falls back to
  `list[0]`, the floor is 4 games, and "needs work" is ranked by loss _rate_. It
  merges blitz with classical. There is no memory between runs, so it cannot
  show improvement. Its links to detail pages carry context that the detail page
  ignores.
- **Could be better:** fix the statistics first. Then add the deviation trainer,
  run-over-run comparison, and "your repertoire, from your games" (§4).

### Discover and search — _fast and correct, pointed at the wrong things_

- **Good:** search answers in 2–5 ms with parity across all three surfaces, and
  its responses are 4.4 KB. Paste a game identifies openings across the full
  corpus.
- **Bad:** the default shelf is first moves (audit #3). "Najdorf" returns five
  identically named rows (#7). The Beginner facet holds 179 openings. There is
  no onboarding and no "where do I start?".
- **Could be better:** a curated "Start here" shelf. Collapse duplicate names in
  search.

### Repertoire — _a bookmark list occupying a third of the mobile nav_

- **Good:** it is simple and instant, and feeds the search blank state.
- **Bad:** there is no White/Black split, no coverage view ("what do I play
  against 1.d4?"), no export, and it lives only on one device. A tab that does
  the least work of the three (audit #9).
- **Could be better:** promote it or fold it into Discover. §4 makes the case
  for promoting it by filling it from the user's own games.

---

## 3. Every previously proposed feature, with a verdict

**Keep** = still on the plan. **Promote** = move up. **Merge** = folded into
another item. **Archive** = take out of the backlog (the reason stays recorded
here). **Done** = shipped; archive as complete.

| Item                                                                             | Source                  | Status today                                                      | Verdict                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice 1 — explorer bundle (3.2 rating bands, M1 notable games, M2 practitioners) | backlog, PRD §5         | Shipped 2026-07-13; M2 cut; level-check strip and bridge card cut | **Done**                                                    | Works; the level lens is the best-designed component on the site. Two cut pieces return below in cheaper forms.                                                                                                                                                                                                                                                                                                                     |
| Slice 2 — deviation trainer v1 (3.1)                                             | backlog, PRD §6         | Not started                                                       | **Keep — the headline build, after §5 "Now"**               | Still the only feature nobody offers free. Feasible: `findDeepestMatch` already returns the deepest in-book ply, and the games are in the browser. **Blocked on credibility:** a trainer on top of an Analyse page that praises 3-game samples will not be believed.                                                                                                                                                                |
| J3 — paste-a-game post-mortem                                                    | project review §5.2     | Demoted to slice 2's milestone 1                                  | **Promote — ship as slice 2's public face**                 | Same book-walk code, no username needed, and it works on the landing page where "Paste a game" already exists. The demotion argued that chess.com/Lichess offer one-click engine review. They do, but they say "inaccuracy at move 9", not "you left the Najdorf at move 6; here is the page, and drill it". It is also the only candidate here that produces something shareable.                                                  |
| Slice 3 — "drill your leaks" SRS                                                 | backlog, PRD §7         | Parked pending accounts                                           | **Keep parked; do "Practice memory" instead**               | The owner's July reasoning holds for _scheduling_. But a device-local log of what you got wrong needs no account and delivers most of the value (§4).                                                                                                                                                                                                                                                                               |
| Analyse bridge card                                                              | PRD §5.2                | Cut 2026-07-13, "replacement needed", never replaced              | **Keep — rebuild small**                                    | With 3–40 impressions a day, the detail page is the only funnel into Analyse. One line next to Practice ("How do you score in this line? Check your games") is enough.                                                                                                                                                                                                                                                              |
| Level-check strip                                                                | PRD §5.2                | Cut; `levelCheck.ts` deleted                                      | **Merge into "divergence callout"**                         | The audit (E4) showed win rates barely move between bands but **move shares** move a lot ("one in six opponents at your level plays 2.Bc4; masters never do"). Both bands are already fetched, so it costs zero extra requests.                                                                                                                                                                                                     |
| #4 My-openings v2 (J4 progress + 3.5 repertoire v2)                              | backlog                 | Not started                                                       | **Merge into "Repertoire from your games"**                 | Same model, but filled automatically rather than hand-starred. Hand-starring 20 openings is the step nobody does.                                                                                                                                                                                                                                                                                                                   |
| #5 Family hubs + guided paths (3.4 + J5)                                         | backlog                 | Not started                                                       | **Keep, split**: "Start here" shelf now (S); hubs later (M) | The shelf is the cheap half of J5 and fixes audit #3. Hubs are 28 new URLs competing with each family's root page. Read the `seo-crawl-graph` skill before adding them; after a quality purge, near-duplicate pages are a real risk.                                                                                                                                                                                                |
| J2 — traps per opening                                                           | backlog                 | Not started                                                       | **Keep, re-scope**                                          | **The pre-commit audit the backlog asked for: only 18 trap-named ECO lines exist, about 14 distinct.** Mining names cannot carry the feature. Demand is real: 85 of 1,568 matched video titles say "trap". Rebuild it on the engine layer (§4): a popular club move with a large engine swing _is_ a trap, found mechanically.                                                                                                      |
| Audit #8 — "common mistakes" enrichment                                          | audit                   | Not started                                                       | **Merge with J2**                                           | Same content: "the tempting move, why it fails, the punishment". Needs engine grounding before any LLM prose, or it repeats the provenance problems the common-plans work found.                                                                                                                                                                                                                                                    |
| J1 — per-move "why" annotations                                                  | backlog                 | Not started                                                       | **Keep, later**                                             | The plan was to mine study comments, but **`courses.json` holds links only** (title, URL, author, match score), with no PGN or comments. It needs a pipeline change to fetch study exports, and a licence and attribution check on reusing authors' text. Highest content value, and the highest cost.                                                                                                                              |
| J9 / board-search PRD                                                            | backlog, PRD 2026-08-16 | PRD drafted, not built                                            | **Split: build the position graph; defer `/board`**         | The PRD's finding is the most important data point in any proposal: 4,583 pages (37%) are unreachable by clicking. The fix is the **position graph** (PRD slice 1). Moving the detail page onto it, which the PRD calls "the right end state", also fixes audit E2. That gets most of the value on the page with traffic, without a new surface and its crawler risk. Build `/board` later if the PRD's key metric can be measured. |
| TASK015 — opening tree navigation                                                | memory-bank             | Pending since March                                               | **Done / archive**                                          | Breadcrumbs, next moves, "Instead of…" rows and ancestor links all shipped. The remaining reachability gap is the position graph above.                                                                                                                                                                                                                                                                                             |
| M3 — master continuations in practice                                            | backlog                 | Not started                                                       | **Archive**                                                 | Superseded by the popular-continuation extension and the level lens. "Sparring mode" (§4) is the better version.                                                                                                                                                                                                                                                                                                                    |
| J8 — Stockfish deviation analysis (client WASM)                                  | backlog                 | Parked                                                            | **Archive; replaced by the offline engine layer**           | The objection was mobile CPU and Vercel cost. Both vanish if the engine runs once, offline, over our ~15.5k positions (§4).                                                                                                                                                                                                                                                                                                         |
| TASK005 — Stockfish game analysis and blunder detection                          | memory-bank             | Pending since Feb                                                 | **Archive**                                                 | Whole-game blunder review is exactly what chess.com and Lichess do in one click. It fails the substitution test. The opening-scoped part lives in the trainer.                                                                                                                                                                                                                                                                      |
| TASK013 — engine-validated practical blunders                                    | memory-bank             | Pending since March                                               | **Merge into the offline engine layer**                     | Its core idea (theory vs engine-best vs the popular blunder) is right. It just assumed live cloud-eval calls.                                                                                                                                                                                                                                                                                                                       |
| TASK014 — community curation and upvotes (Supabase)                              | memory-bank             | Pending since March                                               | **Archive**                                                 | Needs a database, abuse handling and moderation, for an audience of a few people a day. An upvote count of zero is worse than none. Video matching is already clean. Revisit at 100× traffic.                                                                                                                                                                                                                                       |
| J7 — PWA with offline practice                                                   | backlog                 | Parked                                                            | **Keep parked**                                             | Still true: only worth it once there is a daily reason to open the app.                                                                                                                                                                                                                                                                                                                                                             |
| 3.6 — middlegame bridge                                                          | backlog                 | Cut                                                               | **Archive**                                                 | The cut reasoning still holds.                                                                                                                                                                                                                                                                                                                                                                                                      |
| J6 — side-by-side comparison                                                     | backlog                 | Cut                                                               | **Archive**                                                 | Still a chatbot question.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Popularity refresh and freshness badge                                           | backlog enabler         | Not done; snapshot now 14 months old                              | **Promote**                                                 | The detail card and Discover disagree (693M vs 542M for 1.e4 c5), and practice extensions rank by it. Needed by the engine/band layer anyway.                                                                                                                                                                                                                                                                                       |
| E2E in CI (S2)                                                                   | review, backlog         | 8 of 9 specs fail on `main`; nothing runs them                    | **Promote before slice 2**                                  | The PRD made it a slice 2 prerequisite; still true.                                                                                                                                                                                                                                                                                                                                                                                 |
| Usage instrumentation                                                            | backlog, PRD §9         | Ships events nobody can read                                      | **Promote — fix first**                                     | See §1 point 3.                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 4. New ideas

Each has the idea, why it matters, and a viability note. Ordered roughly by
value per unit of effort.

### 4.1 Practice memory — `S`

**Idea:** persist every practice attempt in localStorage
(`{fen, colour, attempts, misses, missedAtPly, lastSeen}`). Show a "Lines to
review" shelf on the landing page and Repertoire, ordered by misses and then by
staleness. On the page itself: "Last time you missed move 7."

**Why:** it is the smallest change that gives practice a reason to come back
(audit #1). It needs no scheduling algorithm and no account.

**Viability:** high. The pattern already exists three times (`recentOpenings`,
`watchedVideos`, `useRepertoire`). The honest limit is one device, so say "saved
on this device" and add export (4.4). **Not** the parked SRS: there are no due
dates and no streaks. If this gets used, it is the evidence the accounts
decision was waiting for.

### 4.2 Personal strip and "Drill this line" — `S`

**Idea:** read the `?ref=personal` parameters Analyse already sends. At the top
of the detail page: "You: 8 games as Black, 2 wins, 5 losses", with a **Drill
this line** button that arms practice in your colour. Add
`?practice=white|black` as a public parameter, as the PRD specified.

**Why:** it closes the Analyse → detail half of the loop, and the deviation
trainer's call to action needs exactly this parameter.

**Viability:** high. The data is in the URL or the sessionStorage dashboard
cache. The only risk is stale counts if the cache has expired: omit the strip
rather than guess.

### 4.3 Divergence callout — `S`

**Idea:** one sentence above the opening book when a move's **share** differs
sharply between the selected band and masters. "At your level 18% play 2.Bc4.
Masters almost never do." Trigger thresholds on share difference and sample
size, as the level-check strip had.

**Why:** it turns the explorer from a data view into a teaching tool, and it
tells a club player which sidelines they will actually face.

**Viability:** high. Both bands are fetched on page load already (current + all,
current + masters), so it costs zero extra Lichess requests. The risk is noise
on thin positions; the thresholds handle it.

### 4.4 Repertoire from your games — `M`

**Idea:** Analyse already replays the user's games. Build a move tree of **what
you actually play** from each position, per colour. Surface three things from
it:

1. **"This is your repertoire"**: one click fills Repertoire, split by colour,
   instead of hand-starring.
2. **Inconsistency flags**: "Against 1.d4 you've played 1…Nf6, 1…d5 and 1…e6 in
   roughly equal numbers." This is the owner's own King's Indian problem
   (different move orders on different days), and a common club habit.
3. **Coverage gaps from reality**: "You face the Sicilian in 31% of your White
   games; your repertoire has no line for it."

Export as PGN, so it can go into a Lichess study or Chessable. This also fixes
the one-device fragility.

**Why:** it makes Repertoire earn its tab (audit #9) and feeds practice memory
and the trainer. A repertoire that builds itself is the kind of thing people
tell other players about.

**Viability:** good. It is a second pass over up to 500 games already in memory,
using chess.js, which the codebase uses throughout; keep it inside the ~10%
analysis-time budget the PRD set. **Substitution honesty:** openingtree.com
already draws a tree of your games. What it does not do is flag inconsistency,
compare against named theory, or link each node to a page and a drill. That
difference is the feature. If it ships without those, it is a clone.

### 4.5 Offline engine and club-play layer ("position facts") — `M`, a platform piece

**Idea:** one offline batch job, run on the dev machine, never on Vercel, that
writes one fact record per position for our ~15.5k boards (12,106 named plus
3,405 connectors):

- the Stockfish evaluation and the best move;
- the top club moves and their shares per band;
- the evaluation _after_ each popular move.

Serve each record through the existing aggregate `/api/openings/page/:fen`
response. Never ship the whole file.

**What it unlocks:**

- **"Sound / dubious / refuted"** labels on explorer rows. Use coarse, learner-
  facing labels, not centipawns, because "+0.3" means nothing to a 1200. This
  answers audit #8: the page finally says what is _good_.
- **Traps, found mechanically:** a move ≥ X% of club play whose engine swing is
  ≥ 2 pawns is a trap, either to set or to avoid. This re-scopes J2 and subsumes
  TASK013.
- **Grounding for any LLM prose:** "common mistakes" text is only generated for
  lines the engine confirms, and every line must replay legally in chess.js.
- **Sparring mode** (4.6).

**Viability:** good, with three real costs.

1. **Compute:** ~15.5k searches at MultiPV 5, plus the popular-move follow-ups,
   is roughly an overnight run on a desktop. It is incremental after that.
2. **Club move shares:** fetching them through our explorer token (25 req/min)
   would take ~10 hours per band and compete with production traffic. The better
   source is the popularity-stats pipeline, which is designed around the Lichess
   games database and is due a refresh anyway. Check which mode it runs in
   first: the current snapshot's metadata says it was built "API-based".
3. **Cold-start weight:** each serverless cold start already parses ~78 MB of
   JSON, and Active CPU per invocation is up ~3×. Shard the facts by FEN like
   the SEO lookup, or load them lazily. Do not add another monolith to
   `api/data/`.

Accuracy risk: engine truth is not teaching truth. Sanity-check the top ~100
pages by traffic by hand before any label ships.

### 4.6 Sparring mode — `M`, after 4.5

**Idea:** a second practice mode where your moves still have to follow the line,
but the **opponent replies the way players at your level actually do**, sampled
by band share. Sometimes that is the main line, sometimes 2.Bc4. When the
opponent leaves book, the page shows the punishment if the engine layer knows
one. The drill ends honestly when the data runs out, with "you're on your own
from here" and an Analyse-on-Lichess link.

**Why:** today's trainer drills the one line opponents at club level rarely
play. This drills the positions you will actually meet. It is the "more
interactive" trainer, and it varies from session to session.

**Viability:** good once 4.5 exists, because it is pure client logic over
per-position facts. **Do not** build it on live explorer calls: one enthusiastic
user would spend the 25/min token budget, which the board-search PRD already
worked out. Substitution: Chessable drills fixed lines, and Lichess practice
plays engine moves. A few niche tools sample from explorer data, but none of
them sit next to a named-opening page with videos and plans.

### 4.7 Run-over-run progress on Analyse — `S`

**Idea:** store each Analyse run's summary locally and show the change next time
("Caro-Kann: 9 → 14 games, 33% → 50%"). Add a time-control split and a "last 3
months" filter (audit P2).

**Why:** "am I better than last month?" is one of the three questions the audit
said the product cannot answer.

**Viability:** high, if the statistical floors are fixed first. Otherwise it
shows noise moving around.

### 4.8 "Start here" shelf — `S`, editorial

**Idea:** a hand-picked set of 20–30 learnable openings, split by colour and
tagged by style (Italian, London, Caro-Kann, Scandinavian, Vienna…), leading
Discover. The first shelf of a guided path.

**Viability:** high; it is a JSON list and a shelf component. The real cost is
choosing well, and a chess player (the owner) is the right person to do that.

### 4.9 Shareable opening report card — `S–M`, acquisition experiment

**Idea:** from Analyse, "Share my openings": an image with your best and worst
openings per colour, sample sizes printed, and an openingbook.xyz link. Generate
it client-side on a canvas, so no new route is needed.

**Why:** search is not bringing people, and personal results are what players
post in club chats and on Reddit.

**Viability:** technically easy. It only works if the numbers survive scrutiny,
so it strictly depends on the Analyse credibility fix. Treat it as an experiment
and measure it (see §5).

### 4.10 Ideas considered and not recommended

- **Daily "guess the opening" game.** Chessle already does this. It is a novelty
  that would be off-mission to maintain.
- **"Which opening suits me?" quiz.** Fails the same chatbot test that cut J6.
  If anything, it is a front door to the "Start here" shelf, not a feature.
- **In-board replay of notable games (M1 v1.1).** Pleasant but low value. Games
  link out to Lichess, which replays them better. Revisit if the link-out click
  rate shows demand.
- **LLM "explain this move" on demand.** Per-request cost and fabrication risk,
  with no validation. J1 plus the engine layer is the grounded version.
- **Accounts.** Still not earned. Practice memory and the report card are the
  cheapest ways to find out whether anyone would want one.

---

## 5. Recommended sequence

```
Now      (days)    Credibility and sight
                   · Analyse floors: drop list[0], ≥10/≥20 games, rank by losses
                   · billions formatting; Difficulty vs Level rename; off-book copy
                   · explorer: no scroll reset on move steps (E1)
                   · measurement: enable Web Analytics in the Vercel dashboard
                     (page views answer "does anyone reach /analyse?"); send
                     beacon counts somewhere that outlives an hour
                   · refresh popularity stats; date both game counts
Next     (1–2 wk)  Close the loop cheaply
                   · 4.2 personal strip + ?practice=  · 4.1 practice memory
                   · 4.3 divergence callout           · bridge line on detail
                   · 4.8 Start here shelf             · E2E specs green in CI
Then     (M each)  The differentiator
                   · deviation trainer v1, with J3 paste-a-game as its public face
                   · 4.4 repertoire from your games (shares the game replay pass)
                   · 4.7 run-over-run progress
Platform (M each)  Depth
                   · position graph, then the detail page on it (fixes E2 + 37%)
                   · 4.5 position facts, then traps/common mistakes, then 4.6 sparring
Later              J1 annotations · family hubs · /board · 4.9 report card
Archive            TASK005 · TASK014 · TASK015 (done) · M3 · J8 · 3.6 · J6 · slice 1 (done)
```

On measurement: Vercel's docs are the authority on what Hobby includes. As of
the 2026-07-11 PRD, custom events were Pro-only and page views were included.
Page views alone would answer the first question. For event counts, the smallest
durable option is a daily counter in a free-tier Marketplace store. That is a
new dependency, so decide it deliberately rather than let it creep in.

## 6. Decisions needed from the owner

1. **Archive list (§5):** agreed 2026-09-24. `docs/backlog.md` is rewritten as
   rev 4, and the TASK files are moved to _Abandoned_ / _Completed_ in
   `.github/memory-bank/tasks/_index.md`.
2. **Board search:** accept the split (graph now, `/board` later), or keep the
   PRD's plan.
3. **Repertoire:** promote it (4.4) or fold it into Discover. It should not stay
   in the middle.
4. **Engine layer:** approve an offline Stockfish run and the shape of a
   position-facts store. It is the one new data pipeline in this plan.
5. **Measurement:** enable Web Analytics page views, and decide whether event
   counts justify a small store.
