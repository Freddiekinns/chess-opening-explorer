# PRD — The Learning Loop: deviation trainer + evidence engine

**Status:** v4 (post owner feedback, 2026-07-11) · Owner: Fred **Source:**
`docs/backlog.md` rev 3, built on `docs/reviews/2026-07-02-project-review.md`
§3.1/3.2/5.1 **v4 changes:** practitioners line (M2) cut — good game ranking
makes it redundant; band selector reworked around a zero-interaction "level
check" insight + persistent "my level" preference; deviation evidence now leads
with the user's own results (in-theory vs deviated record); drill queue (old
slice 3) parked — it needs accounts, and accounts aren't justified until slice 2
proves engagement.

## 1. Product statement

> OpeningBook becomes the only free tool that finds where your opening play
> breaks down in your own games, proves it matters — with your own results and
> your level's statistics — and hands you the drill.

Today the site answers "what is this opening?" (12k reference pages, videos,
studies, practice mode) and "how do I score with it?" (Analyse W/D/L rollups).
It never answers the question that makes a learner come back: **"what exactly
should I fix, and how?"** Two slices close that loop.

**Glossary.** A **deviation** is the first move in a game that left known theory
(our opening index) while theory moves were still available. A **leak** is a
deviation by the _user_ that recurs across their games — the unit this feature
detects, prices, and drills.

## 2. Goals and non-goals

**Goals**

1. Give every Analyse user at least one concrete, evidence-backed fix per
   session.
2. Make detail-page statistics meaningful below master level, without requiring
   the visitor to discover a control.
3. Create the first genuine return loop: play online → check leaks → drill →
   repeat.
4. Measure whether Analyse can carry retention — the numbers that decide the
   accounts question (§7).

**Non-goals (v1)**

- No engine analysis (parked as J8; two engine-free evidence sources substitute
  — §6.3).
- No accounts, no server-side user state — browser storage only. The accounts
  decision is explicitly deferred until slice 2 data justifies it.
- No spaced-repetition queue (parked with accounts — §7).
- No new data pipelines; no new serverless routes except the optional event
  beacon (§9).
- No opponent-deviation analysis ("they left book — punish it") — v2.
- No middlegame/blunder analysis; scope ends where theory ends.

## 3. Users and jobs

Primary: the club player (~800–1800), blitz/rapid on chess.com or Lichess, loses
in openings they "know", won't pay for Chessable. (Concrete instance: playing
the King's Indian inconsistently — different move orders on different days — and
losing regularly without knowing which order is the leak.)

- _"Show me why I keep losing with this opening."_ → Analyse (slice 2)
- _"Does this opening actually work at my level?"_ → detail page (slice 1)

Secondary: the SEO visitor landing on one of 12k detail pages — here for
reference, but every one is a conversion candidate for the loop (§5.2, bridge
card).

## 4. Success metrics

Instrumentation ships in slice 1 (§9). Return-visit metrics key on an anonymous
random id in localStorage — no PII, per-device, clearable. Targets are
directional; the requirement is trend visibility.

| Metric                                              | Slice | Signal it gives                                         |
| --------------------------------------------------- | ----- | ------------------------------------------------------- |
| Level-check views + band interactions / page visits | 1     | Level context is valued                                 |
| Bridge-card click-through to Analyse                | 1     | The funnel bridge works                                 |
| Analyse runs per week (baseline currently unknown)  | 1     | Surface viability                                       |
| Leak-panel expansions / Analyse runs with leaks     | 2     | Diagnosis lands                                         |
| Drill-CTA clicks / leak-panel expansions            | 2     | Prescription lands                                      |
| Same anonymous id re-running Analyse within 14 days | 2     | The retention bet — **and the accounts go/no-go input** |

> **2026-07-13:** rows 1–2 are dead as specified — the level-check strip and
> bridge card were cut in the right-column redesign (see §5 as-built note).
> `band_select` still measures level engagement; the bridge/funnel metric needs
> a replacement before slice 2.

---

## 5. Slice 1 — Evidence engine (Lichess explorer integration) `S–M`

> **As built (2026-07-13, PR #50).** Slice 1 shipped with deliberate deltas from
> this spec, locked during the right-column design review (spec:
> `docs/superpowers/specs/2026-07-13-opening-detail-right-column-redesign-design.md`):
>
> - **Level-check strip cut** (and `levelCheck.ts` deleted). The comparison is
>   now manual — toggle bands and read the numbers. Superseding idea: a new
>   **`All` band** (every Lichess rating) is the default when no level is saved,
>   so live stats render on first paint with zero interaction; the reset control
>   went with it (`All` is the reset-equivalent).
> - **Analyse bridge card cut** (match-mock decision). Slice 2 needs a
>   replacement funnel from detail pages — open item.
> - The band selector grew into the sidebar-wide **level lens**: it also governs
>   the opening book, whose Next moves / "Instead of …" rows re-rank by live
>   play with W/D/L bars and gain inert **off-book** rows (sidebar unification,
>   `docs/proposals/2026-07-11-sidebar-unification.md`). The in-panel
>   continuations list from §5.3 moved there.
> - Explorer calls go through a new **`/api/explorer` proxy** — Lichess gated
>   the explorer behind auth in 2026-03, so "no key required" (§5.3) no longer
>   holds. The proxy attaches `LICHESS_EXPLORER_TOKEN` (25 req/min), owns CDN
>   cache headers, and short-circuits crawler user-agents so JS-rendering bots
>   can't burn the budget across 12k+ indexed pages.
> - Bands carry learner-facing labels (Beginner/Intermediate/Advanced/Expert);
>   the Elo ranges moved to tooltips and source lines. A games-weighted position
>   **Average Elo** stat was added (null when absent — never fabricated).
>
> Consequence for §4: the `level_check_view` and `bridge_click` metrics are
> dead. `band_select`, `explorer_error` and `analyse_run` beacons shipped.

### 5.1 User stories

- As a 1400 player on a detail page, I can see — without touching anything —
  whether this opening works differently at my level than at master level.
- As a learner, I can set "my level" once and the site's numbers speak to it
  from then on.
- As a learner, I can see real, strong games in this opening and open them.

### 5.2 UX

**Level check (zero-interaction insight).** The band selector alone buries its
value behind a control nobody is looking for. So the headline is an automatic
comparison, rendered when the stats section scrolls into view: masters score vs
club-band score for the side to move, shown **only when the discrepancy is
significant** (starting threshold: ≥8 percentage points, both samples ≥ the §11
minimum):

> _Level check: at club level (Lichess 1400–1800) White scores 56% here — at
> master level only 48%. This line works better in club play._

…or the reverse ("masters score well with this; club players struggle — it needs
precision"). When there's no significant gap, the strip doesn't render. This is
the trappy-vs-sound signal no reference site surfaces, and it also motivates
discovering the selector.

**Rating-band selector** on the Win Rate panel (`OpeningStats.tsx`), mapped to
the explorer API's actual buckets:

| Label      | Explorer `ratings=` | Source endpoint   |
| ---------- | ------------------- | ----------------- |
| Masters    | —                   | `/masters` (live) |
| 2200+      | 2200,2500           | `/lichess`        |
| 1800–2200  | 1800,2000           | `/lichess`        |
| 1400–1800  | 1400,1600           | `/lichess`        |
| Under 1400 | 0,1000,1200         | `/lichess`        |

Speeds: `blitz,rapid,classical` (matching the Analyse games filter).

- Band labels are **Lichess ratings, which run higher than chess.com's** — a
  one-line hint says so ("Lichess ratings; chess.com players typically sit 1–2
  bands lower than their number suggests").
- The chosen band persists in localStorage as a site-wide **"my level"**
  preference: every detail page then defaults its stats and level check to it,
  and a slice 2 analysis can prefill it from the user's own game ratings. Set
  once, the whole site becomes level-aware.
- **Initial render** (no preference set): today's snapshot stats, now labelled
  with their date ("Master games · updated 2025-07-15") — the freshness badge
  from the review, folded in.
- Any live selection swaps the panel and continuations list with a clear source
  line ("Lichess games, 1400–1800, live"). One panel, one source at a time.

**Notable games** (from `/masters` `topGames`): compact list under the stats —
players, ratings, year, result. **Ranking:** average rating descending, **max
one game per player** so one prolific super-GM doesn't fill the list, cap 5. (A
famousness/recency ranking is a v1.1 refinement if click-through justifies it.)
v1 links out to `lichess.org/{gameId}`; in-board replay is v1.1. Omit the
section when `topGames` is empty. With good ranking the names _are_ the
credibility — the separate "notable practitioners" line from earlier drafts is
cut as redundant.

**Analyse bridge card**: on detail pages whose snapshot shows ≥1,000 games, a
small dismissable card: _"See how you actually play the {family} — free, no
account."_ Plain link to `/analyse`; dismiss persists for the session.

### 5.3 Technical design

- New client module `packages/web/src/lib/lichessExplorer.ts`:
  `fetchExplorer(fen, band)` → normalised
  `{ totalGames, moves: [{ san, games, whitePct, drawPct, blackPct }], topGames }`.
  Full FEN passed; no key required.
- **Level check cost**: two cached fetches (masters + club band), fired only
  when the stats section enters the viewport; if a "my level" preference exists,
  its band is the comparison band.
- **Caching**: localStorage keyed `(fen, band)` — TTL 7 days `/masters`, 24 h
  `/lichess` — plus an in-memory session map; LRU-capped (~200 entries).
- **Failure mode**: on error/429, revert to the snapshot panel (and no
  level-check strip) silently; report to error monitoring. The page must never
  be worse than today's.
- **Privacy**: only FENs (public positions) are sent to Lichess.
- No new API routes except the optional event beacon (§9), which is the only
  `vercel.json` change in the slice.

### 5.4 Acceptance criteria

- Level check renders only above the discrepancy + sample thresholds; the copy
  states both levels and both scores (never a bare verdict).
- Cached band data renders instantly; cold fetch shows a loading state in the
  panel only.
- With the explorer unreachable, the page is indistinguishable from today's
  (plus the snapshot date label).
- No explorer request fires before the stats section is in view or the selector
  is touched.
- "My level" persists across pages and sessions; clearable.
- Vitest: explorer client (success, 429, malformed), band mapping, cache
  TTL/LRU, level-check threshold logic, game-ranking dedupe; component tests for
  selector swap and omit-when-empty rules.
- Error monitoring (S4) captures explorer failures — same PR.

---

## 6. Slice 2 — Deviation trainer v1 `M`

### 6.1 User stories

- As an Analyse user, opening rows where I repeatedly leave theory show a leak
  flag; expanding shows where I go wrong, what theory plays, and — in my own
  results — what it's costing me.
- One click drills the theory line: the opening page opens with practice mode
  armed as my colour.

### 6.2 Detection

Detection runs **inside the existing per-game analysis loop** in
`usePersonalGames` — the sessionStorage dashboard cache stores aggregates, not
PGNs, so leak data must be computed at analysis time and persisted with the
dashboard (cache key `v4→v5`; old snapshots simply re-analyse).
`lookupOpeningFromPGN` already calls `findDeepestMatch`, which already returns
the deepest in-book ply (`matchedAtMove`); the increment per game:

1. Identify the first move _after_ the deepest in-book position (exact indexing
   defined by fixture tests, not prose — off-by-one is the classic bug here).
2. Record a **user deviation** only if (a) it was the user's move and (b) book
   was still available: at that position at least one legal move (chess.js)
   leads to a FEN in the openings map. Opponent-first deviations are not flagged
   (at club level that's most games; without this filter the feature reports
   noise).
3. Store `{ deviationFen, playedSan, userColor, gameResult, sampleLine }` per
   game — `sampleLine` is the move list to the deviation +2 plies, small, and
   reserves the data for the v1.1 game step-through (§6.3).
4. Aggregate per (opening, deviationFen, playedSan), **and per opening keep the
   in-theory vs deviated W/D/L split** — the primary evidence (§6.3).

**Surfacing rules:** recurrence ≥ 2; one leak per opening row (most recurrent,
ties broken by worse results); sub-threshold deviations render nothing.

### 6.3 UX — and the "how damning is it?" answer without an engine

The owner's core question: without Stockfish, how does the user see that the
deviation actually hurts? Two evidence sources, in order of punch:

1. **Your own record (primary — no external dependency).** The user's games
   already contain the answer:
   > _"Sicilian Defense — 12 games. When you stayed in theory: 4 wins, 1 loss.
   > When you left it at move 6: 1 win, 6 losses."_ Shown as **counts, not
   > percentages** — 7 games don't earn a percent sign (honesty rule). This is
   > the "every time you deviate, you lose" insight, computed entirely from data
   > in hand.
2. **Your level's statistics (secondary — slice 1's client, fetched on
   expand).**
   > _"At 1400–1800, theory's 6.d4 scores 56% for White; your 6.Nf3 scores
   > 44%."_ Same honesty rules as slice 1: below sample threshold, no numbers;
   > if the played move is too rare for stats, say so — that is itself evidence;
   > if the played move scores _equal or better_, say that too and de-emphasise
   > the leak. Trust outranks narrative.
3. **Engine eval (parked, J8).** Client-side WASM eval-delta remains the v2
   upgrade if the first two prove insufficient.

Panel anatomy, on qualifying `OpeningRow`s and their mobile card equivalents
(Analyse is heavily mobile; both layouts in scope):

- Quiet badge: **"Leak · move 6"**.
- Expanded: static board at the deviation position (existing static-SVG
  renderer), _"You played **6.Nf3** in 4 of 7 games. Theory continues
  **6.d4**."_, then evidence blocks 1 and 2.
- CTA: **"Drill the theory line"** → `/opening/{fen}?practice={color}`
  (`OpeningDetailPage` reads the param and arms practice mode — new, small;
  practice is currently local state only).
- **v1.1 — step through your game:** using `sampleLine`, replay the user's own
  moves up to the deviation on the panel board. Data is reserved in v1 records;
  UI ships when v1 engagement justifies it.
- Copy discipline: "left known theory", never "mistake"/"blunder".

### 6.4 Acceptance criteria

- Fixture-tested in `packages/shared`: recurring user deviation (flagged),
  opponent-first (not flagged), no book moves available (not flagged),
  transposition back into book (deepest match wins), game shorter than book (not
  flagged), off-by-one boundaries.
- In-theory vs deviated split matches hand-computed fixtures; renders as counts.
- Analysis wall-time impact ≤ ~10% on 500 games.
- Cached-dashboard restore shows leaks without re-analysis (v5 snapshot).
- Practice CTA lands with practice mode running as the correct colour.
- Evidence honesty rules verified by component tests.
- E2E (CI, per S2): analyse a fixture account → expand leak → CTA → armed
  practice.

---

## 7. Parked — drill queue, and the accounts question

Earlier drafts carried a slice 3 (localStorage spaced-repetition queue).
**Parked on owner decision (2026-07-11):** a drill queue is only really useful
with an account — cross-device state, tracked engagement, durable scheduling —
and an account system isn't justified until the product has earned the signup
("not enough benefit to ask someone to sign up yet"). That's the right order:
slices 1–2 create the value; slice 2's returning- user metric (§4) is the
evidence that decides whether accounts (and then the drill queue, watch history,
synced repertoire) are worth building. Note for that future decision: accounts
imply auth + a database (free-tier marketplace options exist) — a strategic
step, not a weekend add-on.

Until then, the drill loop is: leak panel → practice mode, one click, no state.

## 8. Rollout

1. **Slice 1** ships alone — value on the highest-traffic surface; answers the
   explorer caching/rate-limit/error questions before anything depends on it.
   Includes level check, bridge card, instrumentation, S4.
2. **Slice 2** ships alone — consumes slice 1's client. E2E-in-CI (S2) lands
   first.
3. **Accounts go/no-go** — reviewed once slice 2 has ≥1 month of returning-user
   data.

## 9. Instrumentation

Vercel Web Analytics custom events are Pro-gated; hobby plan gets pageviews
only. v1: `navigator.sendBeacon('/api/event', {event, page})` to one tiny new
route — counts only, no PII, fire-and-forget, `Cache-Control: no-store` entry in
`vercel.json` (site rule: every route declares caching). Events:
`level_check_view`, `band_select`, `bridge_click`, `analyse_run`, `leak_expand`,
`drill_cta`, plus the anonymous id for return-visit counting. Fallback if the
route feels heavy: error-monitoring breadcrumbs — decided at slice 1
implementation.

## 10. Risks

| Risk                                                        | Mitigation                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Explorer rate limits / outage                               | Lazy fetch, per-(fen,band) cache, silent snapshot fallback, S4 visibility                  |
| Analyse audience too small for the retention bet            | Bridge card + instrumentation from slice 1; accounts decision gated on data                |
| Detection noisy for low-rated users                         | User-deviation filter + book-available check + recurrence ≥2 + one leak per row            |
| Small personal samples read as statistics                   | Counts, never percentages, for own-record evidence                                         |
| Thin explorer samples rendered as authority                 | Sample + discrepancy thresholds; omit rather than show weak numbers                        |
| Evidence contradicts the leak (user's move is fine)         | Show it honestly, de-emphasise the leak — trust is the product                             |
| Lichess vs chess.com rating scales confuse band choice      | Explicit "Lichess ratings run higher" hint; "my level" is user-set, not silently converted |
| Level check reads as engine verdict                         | Copy always cites both levels' scores, never a bare "good/bad"                             |
| Practice-param adds a public entry point to a stateful mode | Param validated (colour whitelist); practice already handles arbitrary positions           |

## 11. Open questions (deliberately few)

1. **Minimum explorer sample for evidence** — start ≥100 games per band per
   position; tune during slice 1.
2. **Level-check discrepancy threshold** — start ≥8 pp; tune against real pages
   so the strip is rare enough to mean something.
3. **Event beacon vs breadcrumbs** (§9) — decide at slice 1 implementation.
