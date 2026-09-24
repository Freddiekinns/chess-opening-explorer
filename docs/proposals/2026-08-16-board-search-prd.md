# PRD — Board search: find an opening by setting up the position

**Status:** v1 draft, 2026-08-16 · Owner: Fred **Supersedes:** backlog J9
("Board-input search", demoted to an enhancement on the grounds that it is "the
Lichess analysis board with explorer open"). **This document argues the demotion
was made on an assumption that the data disproves** — see §2.

---

## 1. Product statement

> A board you can play moves on that answers the question our text search
> cannot: **"I'm in this position — what is it, and what do I do now?"** Every
> position on it is a door into the 12,000 opening pages we already own.

Today the site has exactly one way in: type a name. That works when the user
already knows the name. It fails for the two most common ways a club player
actually meets an opening — an opponent played something and they don't know
what it was, or they half-remember a shape and not its label.

Board search closes that gap. It is not a statistics explorer; it is a
**navigator into our library**, and it is measurably not a duplicate of anything
already on the site.

---

## 2. The case: 37% of the library cannot be reached by clicking

The strongest argument for this feature is not that a board is nice. It is that
the site's own navigation cannot reach most of its own content.

`tree-service.js` builds its parent/child map by **truncating move strings** — a
line's parent is that line minus its last move. If the truncated string is not
itself a named opening, the edge is dropped and the child appears as nobody's
child. Running the service's own `_buildIndex()` and walking every reachable
edge from the twenty first-move roots:

|                                           |                   |
| ----------------------------------------- | ----------------- |
| Named openings in the corpus              | **12,377**        |
| Reachable by clicking move rows today     | **7,794**         |
| **Unreachable by any amount of clicking** | **4,583 (37.0%)** |

Those 4,583 pages exist, are enriched, carry videos and studies, and are indexed
by Google — but inside the product they can only be reached by typing the right
name or arriving from a search engine.

Rebuilding the same graph **keyed on the position rather than the move string**
fixes it. Replaying all 12,377 move strings with `chess.js`:

|                                                 |                                                    |
| ----------------------------------------------- | -------------------------------------------------- |
| Move strings that replay as legal games         | **12,377 / 12,377**                                |
| Replayed boards that match their stored FEN     | **12,377 / 12,377**                                |
| Distinct boards named by the corpus             | **12,106** (271 rows differ only in move counters) |
| Distinct boards on the paths to them            | **15,511**                                         |
| — of which carry no ECO name                    | **3,405 "connector" boards**                       |
| Edges in the position graph                     | **15,984**                                         |
| Named boards reached walking named boards only  | **9,117**                                          |
| Named boards reached walking through connectors | **12,106 (all of them)**                           |
| Named openings with no named parent at all      | **1,750**                                          |

The corpus needs **zero cleanup** to support this: every line replays, and every
replayed board agrees with the FEN already stored against it.

The 3,405 connector boards are the whole story. A named opening frequently sits
one or two _unnamed_ plies past another named opening. Text navigation cannot
cross an unnamed position — there is no row to click. A board can, because you
just play the move. That is the mechanism by which a board reaches 12,106 boards
where clicking reaches 9,117, and it is not a feature Lichess can copy from us,
because Lichess has no curated library on the other side of the door.

**Verification.** Every figure above is reproducible from a clean checkout:

```bash
node docs/proposals/assets/2026-08-16-board-search-reachability-today.mjs
```

```bash
node docs/proposals/assets/2026-08-16-board-search-graph-probe.mjs
```

The first walks `tree-service.js`'s own child map; the second builds the
position graph. Any implementation must reproduce both in a test (§13).

---

## 3. Assessment against the incumbents

The instruction was to be sure this is not a clone. Taken seriously, that means
naming what each incumbent does better than us and refusing to compete there.

### Lichess analysis board + opening explorer

The dominant free tool, and better than us at almost everything a _statistics_
explorer does: real game counts over a vastly larger database, rating and
time-control filters, master games, top games, engine evaluation, arrows,
variations, unlimited depth. We proxy a slice of that data already
(`/api/explorer`) on a personal token capped at **25 requests per minute**.

**We must not try to beat this, and we cannot afford to.** A board that fires a
live explorer request on every move played would spend the entire token budget
on a single enthusiastic user.

What Lichess does _not_ do: tell you what the opening is _like_. It gives a name
and a count. It has no description, no complexity rating, no style tags, no
matched video, no matched study, no "should someone with my style play this".
That is exactly the 12,000 pages we have.

**Our line:** Lichess answers _what do people play here_. We answer _what is
this, and should I play it_. The board is the index to the second answer, and it
runs on our own snapshot, not on their token.

### chess.com Opening Explorer

Same shape, paywalled beyond a few moves a day, and tied to an account. We are
free and anonymous. No further differentiation needed.

### openingtree.com

Builds a move tree from **your own** games pulled from a Lichess/chess.com
username. That is a different job, and one we already do on `/analyse`. Board
search must not drift into it; the personal-games angle belongs to the
deviation-trainer PRD.

### Our own opening detail page

The closest overlap and the one worth guarding. `OpeningNavigator` already shows
next moves and alternatives with names and win rates. The differences that
justify a second surface:

|                 | Detail page explorer                          | Board search                                |
| --------------- | --------------------------------------------- | ------------------------------------------- |
| Entry point     | you already know the opening                  | you have a position, not a name             |
| Movement        | one page load per move, ~800px scroll reset   | move on a board, no navigation              |
| Graph           | move-string parents, 7,794 openings reachable | position graph, all 12,106 boards reachable |
| Transpositions  | invisible                                     | named ("also reached from…")                |
| Arbitrary moves | not possible                                  | any legal move, always                      |

**They are not the same component and should not become one.** The detail page's
job is to describe a known opening; the board's job is to identify an unknown
position. Sharing the row renderer and the sort rules is right; sharing the
surface is not.

---

## 4. Users and jobs

Primary — the club player (~800–1800), consistent with the deviation-trainer
PRD.

- _"My opponent played 2.Bc4 against my Sicilian. What is that and what do I
  do?"_ → set up the position, get the name, get the continuations, get the
  page.
- _"I know the shape, not the name."_ → play the four moves you remember.
- _"How do I get to the Najdorf from a different move order?"_ → play it; the
  board recognises the transposition where the text tree cannot.
- _"What can I actually reach from here?"_ → the continuation list, ranked by
  our snapshot.

Secondary — the returning user building a repertoire, who wants to walk a family
tree quickly rather than page-load through it.

**Explicitly not served in v1:** analysing your own games (that is `/analyse`),
engine evaluation, and endgame or middlegame positions. Board search stops where
the opening book stops, by design.

---

## 5. The model: three states, and an honest "off book"

Every board the user reaches falls into exactly one of three states. This is the
conceptual core of the feature and everything in the UI derives from it.

| State                | Count                  | What the panel shows                                                                                                             |
| -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Named**            | 12,106 boards          | The opening: name, ECO, games, W/D/L bar, description snippet, continuations, "Open full page"                                   |
| **In book, unnamed** | 3,405 connector boards | "No book name for this position — but N named lines run through it", the named openings ahead, and the last named opening behind |
| **Off book**         | everything else        | "Our opening book stops here." The last named position, how many moves ago it was, and the way back                              |

**"Off book" gets a single, honest meaning: our library has nothing beyond this
point.** It is not a judgement on the move.

This collides with existing copy and the collision must be resolved in the same
change. The detail page currently tags a move `off-book` when it has no ECO name
— a different meaning, and one the UX audit already flagged (finding E3) as
reading like an error to a beginner. **Proposal: the detail page's tag becomes
"no book name" and "off book" is reserved for the terminal state above.** One
word, one meaning, both surfaces.

### Where off book actually happens

**5,421 of the 12,106 named boards (44.8%) have no continuation in the corpus.**
That is not a defect to engineer around — it is the shape of the book, and it is
why the user's instinct to "stop at a certain point" is right. Off book is a
frequent, expected destination, so its panel is a first-class screen, not an
error state.

Continuation counts are small and readable: **median 1, 90th percentile 3,
maximum 22.** A continuation list is a short list, not a wall.

---

## 6. Feature set

### 6.1 The board

- Full interactive board (`react-chessboard`, already a dependency and already
  in its own Vite chunk for the detail page — near-zero incremental bundle).
- **Legal moves only, from the starting position.** Not free piece placement.
  Free placement produces boards with no game history, no move list, and no
  meaningful "how did you get here", and 99% of them are off book. A "set up any
  position" mode is a v2 question, not a v1 feature.
- Drag or click-click to move; both, because touch.
- **Flip board.** Persisted in `localStorage` — a Black player wants Black at
  the bottom every visit, not every session.
- **Playing as White / Black** toggle, separate from orientation. It changes
  _framing_, not data: as Black, the continuation list for a White-to-move
  position is headed "What White plays against you", and the "add to repertoire"
  action files under the right colour.
- Undo, reset, and a "back to last named opening" jump.

### 6.2 The move path

A horizontal move strip above or below the board (reuse the detail page's
pattern; scroll it with `scrollLeft`, never `scrollIntoView` — see the frontend
AGENTS.md trap). Clicking a ply rewinds to it. Every ply shows a small marker
when that position is named, so the user can see at a glance where the named
openings sit along the line they have played.

### 6.3 The panel — named state

1. **Name and ECO**, large. This is the primary answer and gets the visual
   weight the user asked for.
2. **Snapshot line:** games analysed and the W/D/L bar, from
   `popularity_stats.json`. Labelled with source and date — the audit (finding
   #5) found two undated, unreconciled game counts on the site already; this
   surface must not add a third. Copy: _"All rated Lichess games · snapshot of
   July 2025"_, reading the date from the file's own
   `metadata.analysis_timestamp` rather than hardcoding it. That snapshot is
   **13 months old**; refreshing it (`python tools/analysis/run_pipeline.py`) is
   audit item #5 and should land before or with slice 2, because this surface
   puts the number in front of the user on every position.
3. **Description snippet** — first sentence of `analysis_json.description`, plus
   complexity and style tags. This is the differentiator against every incumbent
   and it should be visible without scrolling.
4. **Continuations** — one row per named continuation: SAN, opening name, games,
   W/D/L bar. Ranked by `sortNodesByPopularity` from `lib/openingBook.ts`, the
   same rule the detail page uses. Clicking a row **plays the move on the
   board** — it does not navigate.
5. **Also reached from** — when the board has more than one named parent, name
   them. **247 boards qualify.** This is the transposition insight and no
   competitor surfaces it, because it only exists relative to a named corpus.
6. **Actions:** _Open full page_ (→ `/opening/:fen`, the existing detail page),
   _Save to repertoire_ (existing `useRepertoire`, filed by colour), _Analyse on
   Lichess_ (existing deep link, existing wording).

### 6.4 The panel — connector state

Named openings the user can reach from here, with the moves that reach them:

> **No book name for this position.** Four named openings run through it.
> `3.Nf3` → Sicilian Defense: Najdorf Variation · 4.2M games `3.Bb5+` → Sicilian
> Defense: Moscow Variation · 1.1M games

Plus a quiet line back: _"Last named: Sicilian Defense, 1 move ago."_

This screen is the reason the feature exists. It is the only place on the site
where the 1,750 openings with no named parent become clickable.

### 6.5 The panel — off-book state

> **Our opening book stops here.** You left it 2 moves ago, at **Sicilian
> Defense: Najdorf Variation**. [Back to it] · [Open its page] · [Start again]

Two rules:

- **The board stays playable.** Taking the board away punishes exploration. The
  panel changes; the pieces do not lock.
- **No fabricated data.** No counts, no bars, no eval. We have nothing here and
  we say so — consistent with the site-wide rule that missing stats are omitted,
  never synthesised.

**Hard stop at ply 40**, purely to bound URL length and history depth. The
deepest named line in the corpus is 36 plies.

### 6.6 Live stats — deliberately opt-in

A single _"Show live stats at my level"_ button on the **current position
only**, firing one `/api/explorer` request per explicit press, at the user's
existing `myLevel` band, reusing the cached proxy.

**No automatic live fetch on any move.** The token allows 25 requests/minute
across the whole site; the snapshot covers 12,377 of 12,377 positions and is
what the board runs on. This is the single most important cost decision in the
document.

### 6.7 Entry points

- The search hub gains a board icon: _"Or find it on the board"_.
- The detail page gains _"Open on the board"_, seeding the board with that
  opening's line — the fastest fix for the audit's finding E1 (every move
  costing a page load and an 800px scroll reset), because on the board a move
  costs nothing.
- `/analyse` deviation rows link to the board at the position where play left
  theory. (Wiring only; the deviation trainer owns that feature.)

**No fourth nav tab.** The mobile nav already carries three tabs, one of which
the audit says is under-earning its place. Board search is a mode of search, not
a destination.

---

## 7. Stickiness and navigation

The requirement — _going back keeps the position_ — decomposes into three
behaviours.

**Within a session: the URL is the state.** Route `/board`, with the line in a
query parameter as SAN tokens: `/board?line=e4_c5_Nf3_d6`. Each move played
pushes one history entry, so **the browser Back button undoes one move**, which
is both what the user asked for and what an analysis board is expected to do.
Maximum 40 plies keeps the URL well under any limit.

This choice has a free and significant benefit: `ScrollToTop` in `App.tsx` keys
on `pathname` alone (`App.tsx:26-32`), so a query-parameter change **does not
trigger the scroll reset**. The bug that makes the detail-page explorer painful
cannot occur here by construction.

**Leaving and returning: the line comes back.** Navigating to `/opening/:fen`
and pressing Back restores the exact board, because the line is in the URL.

**Across sessions: resume.** The last line is written to `localStorage`. Landing
on a bare `/board` with a stored line offers _"Resume: 1.e4 c5 2.Nf3"_ rather
than silently restoring it — a silent restore is disorienting when the user
meant to start fresh.

**Sharing:** the URL is copy-pasteable and reproduces the position exactly.

---

## 8. Data and API

### 8.1 The position graph is a build artifact, not a runtime computation

Replaying the corpus with `chess.js` to build the graph takes **16.5 seconds**.
That is fine as a build step and impossible as a serverless cold start.

Add `scripts/generate-position-graph.js`, writing
`api/data/position-graph.json`, following the existing generator precedent
(`scripts/generate-sitemaps.js`, the `seo-lookup` shards). The raw edge map is
~1.8 MB; with names and stats folded in, budget ~3 MB. Server-side only, so the
payload rules that govern `/api/openings/all` do not apply — but it must never
be shipped to the client.

The generator runs in the build and its output is committed to `api/data/`,
which `AGENTS.md` establishes as the single canonical data location.

### 8.2 One new route

```
GET /api/openings/position?fen=<fen>
```

Keyed on the **position key** — the first four FEN fields (board, side to move,
castling, en passant), the same normalisation `positionKey` already uses to fold
the 271 duplicate-by-counter canonicals. Move counters are excluded so that a
transposition reaching the same board in a different number of plies still
resolves.

```jsonc
{
  "status": "named" | "connector" | "off-book",
  "opening": { "fen", "name", "eco", "moves", "description", "complexity",
               "style_tags", "games", "stats": { … } | null } | null,
  "continuations": [
    { "san", "fen" | null, "name" | null, "eco" | null,
      "games", "stats": { … } | null, "namedDescendants" }
  ],
  "reachedBy": [ { "san", "fen", "name" } ],
  "lastNamed": { "fen", "name", "pliesAgo" } | null
}
```

`Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` — the
static-data default from the API AGENTS.md, set in `vercel.json` **or** in the
route, never both.

Response size: with a 90th-percentile continuation count of 3, a typical
response is under 2 KB. Project the fields the panel draws and nothing else —
the same discipline `toSearchResult` enforces on the search routes. **Do not
return raw service results.**

### 8.3 Client

- `chess.js` for legality and SAN, client-side, one move at a time (~0.1 ms per
  move — the 16.5 s figure is 124,000 moves in bulk, not a per-move cost).
- A `useBoardPosition` hook owning the fetch, with a **monotonic request id
  checked before every `setState`** — moves can be played faster than responses
  return, and the codebase has been bitten by exactly this (`useBrowse`,
  `useOpeningSearch`).
- Nothing added to any search component. `lib/searchQuery.ts`,
  `lib/searchIndex.ts` and `useOpeningSearch` are untouched; the board is a page
  with its own hook.

### 8.4 Missing stats

`popularity_stats.json` carries entries for all 12,377 positions, **16 of which
hold `null` win rates with `games_analyzed: 0`**. Guard with `!= null`, not
`!== undefined` — `Math.round(null * 100)` is `0` and would draw "White 0% ·
Draw 0% · Black 0%" for a position with no data, the fabricated-data trap
wearing a type coercion.

---

## 9. SEO — the one thing that could actively hurt us

`/board?line=…` is an **unbounded, crawlable URL space**. Google purged 5,010
opening pages on 31 July 2026 for thin content; feeding it tens of thousands of
parameterised near-empty routes is the worst thing this feature could do.

Three mitigations, all required before launch:

1. `robots.txt`: `Disallow: /board?` — the bare route stays crawlable, every
   parameterised state does not.
2. `middleware.ts` emits a self-canonical to `https://openingbook.xyz/board` for
   the route, so any parameterised URL that is crawled anyway folds into one
   page. The middleware matcher already lets `/board` through; it needs a branch
   beside the existing `/analyse` branch, giving it a real title and description
   rather than the generic fallback.
3. `/board?line=…` is excluded from `scripts/generate-sitemaps.js` — it is not a
   page that owns a canonical URL.

The board is a **tool**, not indexable content. All the indexable content it
leads to already has its own URL.

---

## 10. Non-goals for v1

- No free piece placement (§6.1).
- No engine evaluation, no arrows, no annotation.
- No live explorer data except on explicit request (§6.6).
- No PGN paste into the board — "Paste a game" already exists and resolves to a
  detail page. Routing it to the board instead is a v1.1 one-liner, but it
  changes an existing behaviour and should be measured separately.
- No personal-games overlay. That is the deviation trainer.
- No accounts, no server-side state. `localStorage` only, matching the rest of
  the product.
- No new nav tab.

---

## 11. Validity against the rest of the site

The instruction was to check the feature is "valid against itself". Each row is
a rule the codebase already enforces, checked against this design.

| Rule                                                       | Status                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Never render fabricated data                               | Off-book shows no numbers; `!= null` guards on the 16 null-rate positions                 |
| Missing stats are `null`, guard with `!= null`             | §8.4                                                                                      |
| Never fetch large payloads on mount                        | `/board` fetches one ~2 KB position response; the graph never reaches the client          |
| Every route declares its caching                           | §8.2, one place only                                                                      |
| Don't add a fetch/debounce/index to a search component     | The board is a page with its own hook; search files untouched                             |
| One ranking rule, implemented once                         | Continuations use `sortNodesByPopularity` from `lib/openingBook.ts`                       |
| Lichess proxy is rate-limited; CDN caching is load-bearing | Snapshot-first; live data on explicit press only                                          |
| `api/data/` is the canonical data location                 | `position-graph.json` written there by a committed generator                              |
| Scroll traps: no `scrollIntoView` on strips                | Move strip scrolls by `scrollLeft`                                                        |
| CSS: no `animation-fill-mode: forwards` with transforms    | Applies to any new entrance animation                                                     |
| New component gets a `.module.css`                         | `BoardSearchPage.module.css` etc.                                                         |
| New visual surface gets a design-system preview card       | Add under `design-system/project/preview/`; build via the `openingbook-design` skill      |
| Docs updated in the same PR                                | `AGENTS.md` gotchas, `activeContext.md`, `progress.md`, `docs/backlog.md` (J9 resolution) |

**Two live copy collisions this feature must not worsen:**

- **"off book"** — resolved in §5 by giving the detail page's tag the words "no
  book name" and reserving "off book" for the terminal state.
- **"Level"** — the audit (finding #4) found "Level" already means two different
  things on two surfaces. The board's colour control is **"Playing as"** and its
  optional live-stats control reuses the existing `myLevel` band without adding
  a third control named "Level".

**One architectural tension, stated plainly.** After this ships, the site has
two implementations of "what gets played from here": `tree-service.js` (move
strings, feeding the detail page) and the position graph (feeding the board).
They will disagree — that is the entire point of §2 — but they must disagree
_only_ in the direction of the position graph being a superset. A test must
assert that every edge in the move-string graph exists in the position graph.
**The right end state is that the detail page moves onto the position graph
too**, retiring the move-string map and picking up 4,583 openings' worth of
reachability. That is a deliberate follow-up, not v1 scope, and it should be
written into the backlog when this ships.

---

## 12. Risks

| Risk                                 | Likelihood        | Mitigation                                                                                                                                    |
| ------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Crawler explosion on `/board?line=`  | High if unhandled | §9, all three mitigations, before launch                                                                                                      |
| Reads as a worse Lichess board       | Medium            | Lead with name + description + tags, not counts; no engine, no arrows, no attempt to compete on data                                          |
| Off book feels like failure          | Medium            | §6.5 recovery panel; rename the detail-page tag; 44.8% of named boards are leaves, so this screen gets heavy traffic and deserves real design |
| Explorer token exhaustion            | Low as specified  | Snapshot-first; live stats only on explicit press                                                                                             |
| Graph and corpus drift               | Medium            | Generator is a build step; test asserts 12,377/12,377 replay and full-graph reachability                                                      |
| History spam from per-move pushes    | Low               | Standard analysis-board behaviour; `replace` rather than `push` for rewinds within the strip                                                  |
| Mobile: board plus panel doesn't fit | Medium            | Board fixed at top, panel scrolls beneath; reuse `PositionSheet` patterns from `components/detail/mobile/`                                    |

---

## 13. Slices

**Slice 1 — the graph (backend only, shippable and testable alone)**
`scripts/generate-position-graph.js`, `api/data/position-graph.json`,
`PositionGraphService`, `GET /api/openings/position`. Tests reproduce every
figure in §2: 12,377/12,377 replay, 12,106 named boards, 15,511 boards, full
reachability, and the superset assertion against `tree-service`.

**Slice 2 — the board** `/board` route, `BoardSearchPage`, move strip, flip and
"playing as", URL state, the three panel states, continuation rows, "also
reached from". Entry point from the search hub. SEO mitigations (§9) ship here,
not later.

**Slice 3 — the joins** "Open on the board" from the detail page; repertoire
save by colour; resume from `localStorage`; optional live stats button;
`/analyse` deviation link.

Slices 1 and 2 are the product. Slice 3 is what makes it part of the site rather
than a tool bolted onto it.

---

## 14. Success metrics

Instrumented through the existing `/api/event` beacon (which needs the origin
check and rate limit the audit flagged as S3 — do that first).

| Metric                                                                    | Target        | Reads as                                                |
| ------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| Board sessions reaching ≥4 plies                                          | 50% of starts | People use it rather than bounce                        |
| Board sessions ending in an opening page open                             | 30%           | It works as a door into the library                     |
| **Openings first reached via the board that are unreachable by clicking** | >0 and rising | The §2 thesis is real in practice                       |
| Connector-state panels shown per session                                  | ≥1 median     | The mechanism that unlocks the 4,583 is being exercised |
| Off-book panels followed by "back to last named"                          | 60%           | The recovery panel works                                |
| `/api/explorer` requests per board session                                | <0.3          | The token decision held                                 |

The third row is the one that decides whether this was worth building. If users
never reach openings that clicking could not reach, the backlog's original
demotion was right after all and the feature should be cut back to a search
enhancement.

---

## 15. Open decisions

1. **Route name.** `/board` assumed. `/explore` collides with "Discover"
   conceptually; `/position` is accurate but cold.
2. **Free piece placement.** Cut from v1 (§6.1). Revisit only if users ask for
   it, and only as a distinct "set up a position" mode with its own honest
   handling of the fact that most such positions are off book.
3. **Does the detail page migrate to the position graph?** Recommended, not
   scoped here (§11).
4. **Does "Paste a game" land on the board instead of a detail page?** Probably
   yes, measured separately (§10).
