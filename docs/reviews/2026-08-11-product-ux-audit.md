# Product, UX, performance and security audit

**Date:** 2026-08-11 **Scope:** the live site at openingbook.xyz (commit
`2c4db9e7b`), audited as a club player would use it, then read back against the
code. **Question the audit answers:** does the feature set make a beginner-to-
intermediate player better at chess, and is each feature clear, intuitive and
aligned with what a learner is actually trying to do?

---

## Verdict

The **reference layer is excellent and the improvement layer is not built yet.**

The opening detail page is genuinely good: 100% enrichment coverage, live
Lichess data banded by rating, matched videos and studies, honest handling of
missing stats. Engineering health is strong — 1,497 tests green, route-split
bundles, small cached payloads, no fabricated data.

But the site's stated purpose is _improvement_, and improvement is a loop:
**find your weakness → learn the right line → drill it → play → measure again.**
The site implements step 1 (Analyse), step 2 (Detail), a thin step 3 (Practice),
and nothing for steps 4–5. The three nav destinations are three separate tools
that happen to share a database. A user cannot answer "am I better than last
month?", "what have I actually learned?", or "what should I work on next?" — the
three questions the product exists to answer.

Below, findings ranked by how much they cost the goal.

---

## P0 — the things that block the goal

### 1. The improvement loop is open at both ends

**Observed.** Analyse identifies a weak opening and links to its detail page.
The detail page is generic — it does not know you came from Analyse, does not
show your record in that line, and does not offer a drill for it. The link
carries `?ref=personal&platform=…&username=…` (`PersonalOpeningStats.tsx:373`)
and **nothing in the app reads any of those parameters** — the only reader of
`username` is the Analyse page reading its own URL (`AnalyseGamesPage.tsx:23`).

Practice mode leaves no trace: no record of what was drilled, no failure log, no
repetition schedule, no "you got this wrong last time". Nothing brings the user
back.

**Why it matters.** Every other feature is in service of this loop, and the loop
doesn't close. Users get a good browsing session, not a training habit.

**Recommendation.**

- Make the `?ref=personal` handoff real: on arrival, show a personal strip at
  the top of the detail page — "You: 8 games, 25% wins, 5 losses as Black" with
  a **Drill this line** button. The data is already in the URL; only the render
  is missing.
- Persist practice attempts to localStorage
  (`{fen, attempts, errors, lastSeen}`) and surface a **Review** shelf of lines
  you got wrong, ordered by staleness. This is a small change with the largest
  product return in this document.
- Add "Re-analyse" with a comparison against the previous run, so the user can
  see movement. Without a before/after, the site can never demonstrate that it
  worked.

### 2. Analyse presents statistical noise as a finding

**Observed.** `findBestOpening` (`personalStatsLib.ts:112–117`) filters to
`MIN_CARD_GAMES = 4` and then, if nothing qualifies, **falls back to
`list[0]`**. The live sample report headlines:

> **Top-performing opening — Sicilian: Snyder, 2…Nc6 — 3 games — 100% WIN RATE**

`findWeakestOpening` (line 119) has no such fallback and correctly returns
`null`. The result is a systematic positivity bias: the app always names a
strength, sometimes names no weakness. And 4 games is far too low a bar anyway —
4 games at 75% has a 95% confidence interval of roughly 19–99%.

**Why it matters.** This is the feature that is supposed to tell a player the
truth about their game. A 3-game 100% line presented as their top opening is the
single most credibility-damaging thing on the site, and it is the _headline_.

**Recommendation.**

- Remove the `list[0]` fallback. When nothing qualifies, say so: _"Not enough
  games in any one line yet — play about 20 more, or analyse a longer history."_
- Raise the floor: ≥10 games for a variation card, ≥20 for a family card.
- Show the sample size _inside_ the percentage, not beside it — "60% over 15
  games" — and grey out or annotate any row under the floor rather than ranking
  it.
- Rank "needs work" by **games lost**, not loss rate. Losing 8 of 20 in a line
  you play constantly matters more than losing 3 of 4 in one you don't.

### 3. Discover's first shelf shows positions, not openings

**Observed.** The default Discover grid, sorted "Most played", is:

| #   | Name                  | Moves           |
| --- | --------------------- | --------------- |
| 1   | King's Pawn Game      | 1. e4           |
| 2   | Queen's Pawn Game     | 1. d4           |
| 3   | King's Pawn Game      | 1. e4 e5        |
| 4   | King's Knight Opening | 1. e4 e5 2. Nf3 |
| 6   | Queen's Pawn Game     | 1. d4 d5        |

Eight of the first twelve are generic ply-level positions. "King's Pawn Game"
appears twice, "Queen's Pawn Game" twice, and rows 10 and 11 are the same
position by transposition, one spelled _Defence_ and one _Defense_.

Filtering to **Beginner** does not help — the same head returns, because the
Beginner facet holds only 179 of 12,377 openings (1.4%) and popularity still
drives the order. The distribution is Beginner 179 / Intermediate 4,587 /
Advanced 7,611.

**Why it matters.** Game volume decreases monotonically with depth, so sorting
by volume _guarantees_ the shallowest, least learnable entries win every shelf.
The landing page — the first thing every new user sees — is a list of first
moves.

**Recommendation.**

- Add a **teachability rank** as the default sort: require a specific name
  (exclude the generic `{King's,Queen's} Pawn Game` / `…Knight Opening` family),
  a minimum depth (≈3 plies), and use popularity only as a tiebreak.
- Better still, hand-curate a **"Start here"** shelf of 20–30 real openings
  (Italian, Ruy Lopez, London, Caro-Kann, French, Scandinavian, Vienna, King's
  Gambit…) and lead with it. 179 "Beginner" openings is already close to
  curation; the ranking just isn't using it.
- Dedupe transpositions on the grid (row 10/11) and normalise
  _Defence_/_Defense_ in display names.

### 4. "Level" means two different things, three words each

**Observed.**

| Surface        | Control                   | "Beginner" means                   |
| -------------- | ------------------------- | ---------------------------------- |
| Discover       | `Level` facet             | the _opening_ is simple            |
| Opening detail | `Level` pills (LevelLens) | the _players_ are rated under 1400 |

Both are labelled **Level** and both offer **Beginner / Intermediate /
Advanced**. On Discover the Sicilian is "Advanced"; on the detail page
"Advanced" is the 1800–2200 rating band.

**Why it matters.** It is precisely the target audience who will read "Advanced"
on a card as "too hard for me" and "Advanced" on the pills as the same thing —
and be wrong on one of them. The rating band ranges only appear in a `title`
tooltip (`LevelLens.tsx:39`), which never shows on touch.

**Recommendation.** Rename one. Suggested: Discover facet → **Difficulty**
(Simple / Moderate / Complex); detail pills keep **Level** but print the range
on the pill or in a visible caption ("Beginner · under 1400"), not in a `title`.

---

## P0.5 — the opening explorer: right structure, wrong pointing

Audited separately because it is the most-used surface on the site and the one
carrying the most weight for the goal. Structurally it is the best-designed
component here — one border around the level filter and everything it governs, a
properly navigable breadcrumb, honest source line, and the "Instead of 1…c5"
framing that most explorers omit. Three things break it in use, and a fourth
misdirects it.

### E1. Every move costs a page load and an 800px scroll back

Measured on the live 1.e4 c5 page: the move rows sit at y≈791. Clicking one
navigates to a new URL, `ScrollToTop` fires, and `scrollY` goes **800 → 0**.
Walking a six-move line is six page loads and six manual scrolls.

The `ScrollToTop` fix (`App.tsx`) is correct for genuine navigation and wrong
for stepping moves inside the explorer, which is the interaction the component
exists for.

**Recommendation.** Suppress the scroll reset when the new route is a move step
from the current position (or restore the explorer's offset after the swap).
Biggest single usability win available on this page.

### E2. The most likely continuations are dead ends

Rows with no ECO name render as a plain `<div>`, not a `Link`
(`OpeningNavigator.tsx:122–133`). On the Bowdler Attack page — 2.Bc4, played in
17.7% of under-1400 games — the three most natural Black replies are all inert:

| Move  | Games | Clickable |
| ----- | ----- | --------- |
| 2…e6  | 20.9M | no        |
| 2…Nc6 | 20.1M | no        |
| 2…d6  | 10.2M | no        |

51M games of the most realistic continuations, styled identically to the
clickable rows (same percentages, same bar, same count) and doing nothing. This
is precisely the club-player path: the opponent plays a sideline, you want to
know what to do, and the explorer stops.

**Recommendation.** Make them navigable — the FEN is known; only the ECO name is
missing. Title the destination with its move list.

### E3. "off-book" reads like an error

It means "this position has no ECO name", which is irrelevant to a learner: the
position is real and 20.9M games were played there. To a beginner it looks like
a warning that they have gone wrong.

**Recommendation.** Rename ("no book name") or, better, invert it into the
teaching moment: _"Not a main line — but 20.9M games at your level."_

### E4. The Level filter appears to do nothing where the user is looking

Switching all-ratings → under-1400 on the Bowdler page leaves the percentages
**byte-identical** (44%/52%, 46%/51%, 46%/50%). Verified against the API: not a
bug — Lichess bands genuinely produce near-identical win splits at that depth.

But the filter's real signal is large and sits unsurfaced. For 1.e4 c5:

|            | 2.Nf3          | 2.Bc4        | Result split     |
| ---------- | -------------- | ------------ | ---------------- |
| Under 1400 | 43.6% of games | **17.7%**    | 49 / 4 / 48      |
| Masters    | 82.9%          | not in top 4 | 32 / **43** / 25 |

_"One in six opponents at your level plays 2.Bc4, and masters never do"_ is the
most useful sentence available to a club player on this page, and it can only be
reached by flipping pills and mentally diffing two lists. The number that barely
moves gets the visual prominence; the number that moves a lot (move share, draw
rate) does not.

**Recommendation.** Surface the divergence rather than making users derive it: a
one-line callout when a move's share differs sharply between the selected band
and masters. This is the cheapest way to convert the explorer from a data view
into a teaching tool.

### E5. Two unlabelled percentages

Covered in finding 10 below — no column header, meaning carried only by a
hover-only `title`.

---

## P1 — significant, fix soon

### 5. Two different game counts for the same position, neither dated

For 1.e4 c5, the Discover card says **693.1M games**; the detail page says
**542.1M**. Different sources: the card uses the shipped snapshot, whose
metadata reads `analysis_timestamp: 2025-07-15` — **13 months old** — while the
detail page queries live Lichess for blitz/rapid/classical only. Neither number
carries a date or a source on screen.

**Recommendation.** Put "Lichess, rated blitz/rapid/classical · as of <date>"
under the Discover grid, and refresh the snapshot
(`python tools/analysis/run_pipeline.py`). If the two can't be reconciled,
consider dropping the raw count from the card and keeping the W/D/L bar, which
is stable across sources.

### 6. Billions render as thousands of millions

`formatGamesPlayed` (`OpeningCard.tsx:86–90`) has branches for `M` and `K` only,
so 3,778,178,876 renders as **"3778.2M games"**. Add a billions branch.

### 7. Search returns twenty near-identical rows

Typing `najdorf` returns 20 results, of which **five are literally named
"Sicilian Defense: Najdorf Variation"**, separated only by move length and ECO.
Nothing marks which one is the Najdorf. There is no popularity or win-rate
signal in the rows to break the tie for the reader.

(Already on the backlog as "search returns near-duplicate names" — this raises
the priority: it hits the most common query shape there is.)

**Recommendation.** Collapse by name in the dropdown: show the shallowest entry
as the parent with a "+12 deeper lines" affordance, and add a small game-count
to each row so the canonical line is visibly the big one.

Separately, `/api/openings/search?q=najdorf` ranks _Sozin-Najdorf_ sub-lines
above B90 and never returns B90 in the top six — the client's local ranking is
better than the server's. Worth aligning, since the server list replaces the
local one.

### 8. The detail page never says what's _good_, only what's _common_

Everything on the page is a popularity statistic. There is no evaluation, no
"this is the main line", no "this is the trap", no "here is what beginners get
wrong here". The most instructive element on the page — the `off-book` tag on
2.Bc4, which is exactly the kind of move a club opponent plays — is a small grey
pill with no explanation.

For beginner-to-intermediate players, _why_ a move is played and _what happens
when the opponent goes wrong_ are worth more than any statistic on the page.

**Recommendation.**

- Expand `off-book` into a teaching moment: "Not a main line. Played in 13.3M
  games at your level — here's how to meet it." The data to do this is already
  fetched.
- Add a **common mistakes** section to the enrichment schema (one or two per
  opening: the tempting move, why it fails, the punishment). This is an LLM
  enrichment run, not new UI plumbing, and it is the highest-value content
  addition available.

### 9. Repertoire is a bookmark list, not a repertoire

`/repertoire` renders a flat starred list with no White/Black split, no coverage
view ("what do you play against 1.e4?"), no gaps, no drill-all, no progress. It
is stored in localStorage only (`useRepertoire.ts:101`) with **no export or
import**, so it is device-bound and one cache clear from gone.

It occupies a third of the mobile nav while doing the least work of the three
tabs.

**Recommendation.** Either promote it — split by colour, show which replies are
covered and which aren't, add "drill my repertoire" — or demote it to a filter
on Discover. The current middle position earns neither the tab nor the name.

### 10. Percentages are unlabelled where it counts

Each next-move row shows two bare numbers ("48% … 47%") flanking a bar that is
`aria-hidden` (`OpeningNavigator.tsx:87–110`). Which is White and which is Black
is conveyed only by a `title` tooltip (line 128) — hover-only, so invisible on
every phone, and the same pattern repeats in `MobileDataSurface.tsx`.

**Recommendation.** One column header or micro-legend above the list ("White /
Black"), and move the tooltip content into an `aria-label` on the row.

Related: the detail-page win-rate row reads 48% / 4% / 47% = 99%. Round the
largest share to make the three total 100.

---

## Copy audit (site-wide)

Strings extracted from the codebase, not from screenshots. The finding splits
cleanly: **the captions are excellent, the headings are not, and two words each
carry two meanings.**

### What already works — the pattern to copy from

The strongest writing on the site is the second line, the caption that says what
you are looking at: "Most popular at all ratings"; "17 cover this exact
variation"; the "Covers this variation" / "Explores deeper lines" / "Family
overview" badges; "Jump to a random opening"; and the Analyse blank state, which
answers what it does, what it uses, what it excludes and what happens to your
data in two lines. The pattern works. It just stops at the captions and never
reaches the section titles.

### C1. The same word means two different things

The only copy problem that actively misleads rather than merely underexplains.

| Word        | Place A                                | Place B                                                                        |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| **Level**   | Discover facet — _the opening is hard_ | Detail pills — _the players are rated under 1400_                              |
| **Analyse** | nav tab — _analyse my own games_       | detail button (`OpeningDetailPage.tsx:1352`) — _open this position on Lichess_ |

Mobile already resolved the second: `PositionSheet.tsx:69` reads "Analyse on
Lichess". Desktop reads "Analyse". One-word fix. (For "Level", see finding 4.)

### C2. Headings name the object, not the job

| Now              | What it shows                   | Suggested              |
| ---------------- | ------------------------------- | ---------------------- |
| Overview         | the editorial description       | About this opening     |
| Opening explorer | what players actually play here | What players play here |
| Common plans     | the strategic ideas per side    | The plan for each side |

"Opening explorer" is borrowed Lichess vocabulary — known to a club player,
meaningless to a beginner, and attached to the most important content on the
page.

### C3. Practice has no copy at all

The whole feature is three strings: "Practice", "Playing as:", "Complete!".
Nothing says what pressing it will do, nothing responds to a wrong move (a
visual hint appears after two failures), nothing frames what was learned at
"Complete!". It is the feature closest to the product's purpose and the only one
with no explanatory copy. One line under the button — _"Play the opening's moves
from memory"_ — covers most of it.

### C4. Jargon lands where beginners arrive

| String                                      | Problem                                         | Suggested                                        |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| "Search variations, ECO codes, or systems…" | leads with two unknowns, omits what they'd type | "Search openings — try 'Sicilian' or 'B90'"      |
| "Paste a game"                              | to do what?                                     | reuse the existing "Find opening from PGN"       |
| "…from classic variations to hypermodern"   | decorative, jargon, and doesn't match the shelf | "Ranked by how often they're played on Lichess." |
| "12,377 openings" beside filters            | total or filtered?                              | "12,377 openings match"                          |
| "Position (FEN)"                            | FEN unglossed                                   | — gloss on first use                             |
| "off-book"                                  | reads as an error                               | see E3                                           |

### C5. Smaller

- **"This analysis / Your record"** is an honest fix but a bare two-word toggle;
  it needs the same one-liner treatment as the rest of that page.
- **Dead copy:** `StatisticsShowcase.tsx` and `Layout.tsx` are imported by
  nothing yet still carry "Chess Trainer", "Completely Free", "Expert Analysis",
  "Mobile Optimized" — old voice, old product name. Delete so they cannot
  resurface.

### The rule to apply

**Heading names the thing; caption says what it is for and where it came from.**
"Next moves / Most popular at all ratings" is the model. Apply it to Overview,
Opening explorer, Common plans and Practice, resolve the two collided words, and
the copy problem is essentially closed.

---

## P2 — worth doing

- **No onboarding of any kind.** No "how this works", no first-run hint, no
  explanation of what the level pills change. A learner is expected to infer the
  model of the product from the product.
- **Analyse has no time-control or date split.** Blitz and classical opening
  performance differ enormously; merging them muddies every conclusion.
- **Practice mode is shallow.** Mainline plus 6 plies of most-popular
  continuation (`OpeningDetailPage.tsx:387`), hint after two failures, no
  scoring, no colour memory, no repetition. It's the loop-closing feature and
  the least developed one.
- **Complexity defaults to "Beginner".** `OpeningCard.getComplexity()` (line 83)
  returns `'Beginner'` when analysis is absent. Enrichment is currently 100%, so
  no card is affected today — but it's the same class of defect as the
  `Math.random()` win rates you removed in June. Return `null` and render
  nothing.
- **Mobile Discover hides which facets are on** ("Filters (2)") — already on the
  backlog.

---

## Performance — healthy

Measured on the live detail page: `/api/openings/page/:fen` **7 KB / 180 ms**,
`/api/explorer` **1 KB / 420 ms**, all assets `304`, CDN `HIT` on repeat. Route
splitting, self-hosted fonts and the aggregate page endpoint are all doing their
job. Nothing here is a user-visible problem.

Two nits:

1. **The detail page still fires 5 × `/api/openings/fen/…/tree/children`** on
   load (one per mainline ply), on top of `/page/:fen` and `/explorer` — seven
   API calls, which partly undoes the "5 calls → 1" aggregation. They're 1 KB
   each and cached, so it's cost rather than latency; folding the children into
   `/page/:fen` would remove six round trips per page across 12k crawled pages.
2. **`?username=` fragments the CDN cache.** Every opening page reached from
   Analyse gets a distinct cache key per username. Since nothing reads the
   parameter (finding 1), removing it is free — or keep it and read it, which is
   the better fix.

---

## Security — one structural problem, one hygiene backlog

### S1. Helmet is configured and never runs (**highest priority**)

`api/index.js` builds an Express app with `app.use(helmet())` and a **restricted
CORS allowlist** (lines 13–21). That file is referenced by nothing —
`vercel.json` routes every path to the per-route wrappers (`api/openings.js`,
`api/stats.js`, `api/courses.js`, `api/personal.js`, `api/families.js`,
`api/explorer.js`), and each wrapper builds its own bare Express app and sets
`Access-Control-Allow-Origin: *` by hand.

Confirmed against production:

```
$ curl -sSI https://openingbook.xyz/
Access-Control-Allow-Origin: *
Strict-Transport-Security: max-age=63072000
(no Content-Security-Policy, no X-Content-Type-Options,
 no Referrer-Policy, no X-Frame-Options)
```

So the intended security posture exists in the repo and is absent in production.
This matters more than usual here because `middleware.ts` injects
server-rendered HTML into `#root` and the detail page embeds third-party iframes
— a CSP is the control that bounds both.

**Recommendation.** Move headers to where they actually apply: add a global
`headers` block in `vercel.json` (`Content-Security-Policy`,
`X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy`), and either delete `api/index.js` or wire the wrappers
through it. Start the CSP in `Content-Security-Policy-Report-Only` — the
YouTube-nocookie embeds and Vercel Analytics both need allowances.

### S2. `/api/personal/games` is an open, cacheable third-party proxy

- Returns `Cache-Control: public, max-age=0, must-revalidate`. Your own
  `packages/api/AGENTS.md` mandates `private, no-store` for user-specific
  routes.
- `Access-Control-Allow-Origin: *`, so any site can drive it from a visitor's
  browser.
- The rate limiter (`personal.routes.js:37–64`) is an in-memory `Map`, which on
  serverless is per-instance — near-ineffective as a global limit.
- The page promises "Nothing is stored", which a `public` cache directive
  quietly contradicts.

**Recommendation.** Set `private, no-store` on the route; restrict CORS on
`/api/personal` and `/api/explorer` to your own origin; move rate limiting to
Vercel's WAF/firewall rate rules rather than process memory.

### S3. `/api/event` is an unauthenticated write to your log store

`api/event.js` accepts anonymous POSTs and writes a structured line to Vercel
runtime logs — which are billed and are the analytics store per PRD §9. No rate
limit, no origin check. A trivial script can flood both the bill and the signal.
Add an origin check and a rate limit, or move it behind the same WAF rule as S2.

### S4. Dependency vulnerabilities

`npm audit --omit=dev`: **26 vulnerabilities — 3 critical, 15 high.** The subset
that is both in the request path and trivially fixable:

| Package                                                       | Severity      | Fix                                                       |
| ------------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| `express`, `path-to-regexp`                                   | high          | `npm audit fix` (ReDoS, request path)                     |
| `axios`, `form-data`                                          | high/critical | `npm audit fix`                                           |
| `react-router-dom`, `@remix-run/router`                       | high          | `npm audit fix`                                           |
| `minimatch`, `brace-expansion`, `jws`, `tar-fs`, `ip-address` | high          | `npm audit fix`                                           |
| `sqlite3` chain (`tar`, `cacache`, `node-gyp`)                | critical/high | `sqlite3@6` (major) — pipeline only, not served           |
| `xmldom`                                                      | critical      | no fix available — pipeline only; replace or scope to dev |

Run `npm audit fix` for the first block now; the sqlite3/xmldom chain is build-
and pipeline-only and can be scheduled.

### S5. Minor

- `X-Powered-By: Express` is exposed on every API response —
  `app.disable('x-powered-by')`.
- HSTS has no `includeSubDomains` / `preload`.
- Usernames appear in opening-page URLs (finding 1), so they reach Vercel
  Analytics as page paths. Not a leak to third parties (the default referrer
  policy strips the path cross-origin), but it is avoidable PII in telemetry.

---

## Engineering health

- **1,497 tests green** — 907 backend (68 suites), 590 frontend (61 suites).
- Enrichment coverage 100% (12,377/12,377 with description and complexity).
- No fabricated data anywhere I looked; the "never render a rate we don't have"
  discipline holds in `middleware.ts`, `OpeningCard` and `WinRatePanel`.
- SEO work from 2026-08-07 is live and correct: real content in `#root`, real
  404s for unknown FENs, HTML-escaped throughout.

**One process note:** the local checkout was 107 commits behind `origin/main`
when this audit started, so `.github/memory-bank/` and any stale local review
would have described a site three weeks out of date. Fast-forwarded before
auditing.

---

## Recommended sequence

**Now — credibility (a day or two)**

1. Remove the `list[0]` fallback in `findBestOpening`; raise `MIN_CARD_GAMES`;
   print sample sizes. _(#2)_
2. Add the billions branch to `formatGamesPlayed`. _(#6)_ 2b. Copy: "Analyse on
   Lichess" on desktop, a line under Practice, and the heading→caption pass on
   Overview / Opening explorer / Common plans. _(C1–C3)_
3. `npm audit fix` for the served dependencies. _(S4)_
4. Add security headers to `vercel.json`; `private, no-store` on
   `/api/personal`. _(S1, S2)_

**Next — the goal (a week)**

4b. Explorer: stop resetting scroll on a move step, and make off-book rows
navigable. _(E1, E2)_ 5. Read `?ref=personal` on the detail page: personal
record strip + "Drill this line". _(#1)_ 6. Default Discover to a teachability
rank, or lead with a curated "Start here" shelf. _(#3)_ 7. Rename one of the two
"Level" controls. _(#4)_ 8. Date and reconcile the two game counts; refresh the
13-month-old snapshot. _(#5)_

**Then — the loop (a project)**

9. Persist practice attempts; add a "Review what you got wrong" shelf. _(#1)_
10. Add "common mistakes" to enrichment. _(#8)_
11. Decide what Repertoire is: promote it or fold it into Discover. _(#9)_
