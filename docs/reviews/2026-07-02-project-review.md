# Project Review — Performance, Existing Features, New Features (2026-07-02)

Full-project review against the goal: **an excellent chess learning resource
where players find and discover openings, explore their own performance, and
improve.** Conducted on `main` (e35260a9) with a production build, both test
suites, and code-level tracing of every claim. This builds on — and does not
repeat — the prior review docs:

- `TASK008-competitive-analysis.md` (2026-02-28) — strategy + 5 feature bets
- `docs/reviews/2026-06-11-design-review.md` — visual/UX findings
- `docs/proposals/2026-06-12-common-plans-provenance.md` — plans data quality
- `docs/reviews/2026-06-13-video-pipeline-assessment.md` — video matching

## Verdict

The foundation is genuinely strong: unique data assets (12,377 openings, 917
matched videos, 6,100+ study chapters, LLM content), a distinctive brand, and —
newly verified in this review — **a fully green test suite (716 backend + 198
frontend, zero failures)**. The trust-critical bugs from the June reviews
(fabricated stats, wrong common plans, cross-family videos) are fixed or have
fixes staged.

The two gaps between "strong reference site" and "excellent learning resource"
are unchanged in kind but sharper in focus:

1. **Delivery performance is leaving easy wins on the table** — one unsplit JS
   bundle, redundant megabyte fetches, five API round-trips per opening page,
   and a 24.8 MB endpoint still exposed.
2. **The learning loop is still open.** Users can find and read; the
   return-and-improve loop (what TASK008 called the reference→learning gap) has
   had no feature shipped against it since February. Meanwhile the Analyse page
   now has exactly the data needed to close it cheaply.

Recommended headline sequence: **(1) week-scale perf + trust fixes, (2) book-
deviation trainer on the Analyse page, (3) rating-contextualised statistics, (4)
family hub pages.** Details and full backlog below.

---

## 1. Performance

### 1.1 Frontend delivery

**P1 — No route-level code splitting (medium effort, high value).** The build
produces a single 409 kB main chunk (127 kB gzip) plus token-sized vendor/router
chunks — `App.tsx` imports all three pages statically, so every visitor
downloads the landing page, the Analyse page, the 1,665-line detail page,
`chess.js`, and `react-chessboard` before first render. `React.lazy` per route
plus a `manualChunks` entry for the chess stack is the standard fix. Caveat: the
landing page's `MiniBoard` currently uses full interactive `react-chessboard` to
render static thumbnails — see P2.

**P2 — `MiniBoard` uses an interactive board for static thumbnails.** Each
landing card mounts a full `react-chessboard` instance (`allowDragging: false`)
— hundreds of SVG nodes per card in the DOM and accessibility tree (flagged in
the design review), and it forces the chess stack into the landing bundle,
defeating P1. A ~60-line static SVG FEN renderer (12 piece glyphs + 64 rects)
would render cards for ~1% of the cost and let `react-chessboard`/`chess.js`
load only on the detail route. Do P2 before or with P1.

**P3 — Search-index fetch strategy re-downloads megabytes.** The Analyse page
fetches the **full** `/api/openings/search-index` (~1.6 MB) on every mount; the
landing page fetches `?limit=1000` eagerly plus the full index on first search
focus. Three cheap fixes:

- `vercel.json` gives `search-index` only `s-maxage` — **no browser `max-age`**
  — so repeat visits re-download 1.6 MB from the CDN. Add
  `public, max-age=3600`.
- The Analyse page only needs FEN→name/eco/family lookup, and the API already
  supports `?fields=lookup` (a much smaller payload with moves stripped). Use
  it.
- Defer the Analyse fetch until a username is actually submitted — visitors who
  bounce off the empty state currently pay 1.6 MB for nothing.

**P4 — Render-blocking third-party fonts.** `index.html` loads Bricolage
Grotesque + DM Sans via Google Fonts stylesheet (render-blocking, third-party
connection on the critical path of all 12k pages). Self-host the two families as
woff2 with `font-display: swap` — better LCP, one less origin, and the
design-system bundle becomes self-contained.

**P5 — Production console noise + off-brand splash (trivial).** 11
`console.log`/`console.warn` calls in production frontend code (rule 8 of
CLAUDE.md) — `OpeningDetailPage` logs the full opening payload on every load.
Separately, the inline splash screen in `index.html` still uses the legacy
blue/dark palette (`--accent-blue: #007bff`), so users see an off-brand flash
before the app CSS loads.

### 1.2 Edge & SEO delivery

**P6 — Middleware fetches a 1.7 MB lookup on edge cold start.** `middleware.ts`
pulls `seo-lookup.json` (12,377 entries, measured 1,714 KB) into module scope on
first request per region — first-byte latency on the cold path for every opening
page. Shard the lookup by FEN-hash prefix (e.g. 16 files of ~107 KB, fetch one
per request) or move it to Vercel Edge Config/KV.

**P7 — Strategic: opening pages are content-empty HTML.** The middleware injects
only meta tags; the actual content (name, moves, description, plans, stats)
requires the SPA to boot and make **five API calls** (P9). Googlebot does render
JS, but across 12k+ pages this costs crawl budget, and real users see a spinner
→ skeleton → content sequence. The durable fix is build-time static HTML for
opening pages — a pre-rendered content shell (heading, moves, description,
plans, stats table) that the SPA hydrates. This is the single biggest lever for
both SEO and perceived performance, but it is an architecture task (build
pipeline + hydration), so schedule it deliberately. P1/P2/P6 are worth doing
first regardless.

**P8 — `/api/openings/all` (24.8 MB) is still exposed.** TASK011 removed all
client usage (verified: zero references in `packages/web/src`), but the route
still serves the full dataset to anyone who requests it, with only a 1-hour
`s-maxage`. Crawlers found it before — that was TASK011's origin-transfer
incident. Delete the route (or 410 it).

### 1.3 API / serverless

**P9 — Five API calls per opening page view.** The detail page fans out to
`/fen/:fen`, `/stats/:fen`, `/videos/:fen`, `/courses/:fen`, and
`/fen/:fen/tree` — five serverless invocations (across four separate Vercel
functions with independent cold starts) for one page view. Long-tail pages (most
of 12k) will rarely hit warm CDN cache. An aggregate `/api/openings/page/:fen`
endpoint inside the openings function — the services are all importable
in-process — cuts this to one round-trip. If P7 (static pre-render) happens,
this collapses into it.

**P10 — Cold starts parse ~35 MB of JSON.** Each cold start of the openings
function parses 5 ECO files (~30 MB) plus popularity stats (4.9 MB); the first
video request parses the 16 MB `video-index.json`. It's cached in-process after
that, but the first-hit latency (and 1024 MB memory pressure) is real. Cheapest
mitigation: strip fields the API never serves from the build-time JSON (audit
`analysis_json` field usage), and store per-ECO-letter indexes so only the
needed letter loads for FEN lookups. Measure first — add a one-line cold-start
timing log before investing here.

**P11 — Data-file duplication in the repo/deployment.** `video-index.json`
exists twice at 16 MB each (`api/data/` and `packages/api/src/data/` — the
documented copy-after-regenerate gotcha), and `popularity_stats.json` is 4.9 MB
in `api/data/` but **2 bytes** in `packages/api/src/data/`. Consolidate to one
canonical location via `path-resolver` and delete the copy step; this removes a
standing footgun (serving stale/empty data depending on path resolution) and
shrinks the deployment.

### Measured baseline (2026-07-02)

| Metric                         | Value                                             |
| ------------------------------ | ------------------------------------------------- |
| Main JS chunk                  | 409 kB (127 kB gzip), no route splitting          |
| CSS bundle                     | 138 kB (21 kB gzip)                               |
| `seo-lookup.json` (edge fetch) | 1,714 KB, 12,377 entries                          |
| Full search-index payload      | ~1.6 MB (fetched on Analyse mount + search focus) |
| ECO data parsed on cold start  | ~30 MB across 5 files                             |
| `video-index.json`             | 16 MB × 2 copies                                  |
| Detail-page API calls          | 5 per view, 4 separate functions                  |
| Backend tests                  | 49 suites, 716 tests, all passing                 |
| Frontend tests                 | 17 files, 198 tests, all passing                  |

---

## 2. Improving existing features

### 2.1 Trust and data quality (highest value per hour)

The June design review's verdict stands: the gap to "high quality" is
trust-undermining details in a data product, not aesthetics. Status of that
class of issue:

- ✅ Fabricated card stats — fixed (PR #39)
- ✅ Wrong common plans (ECO-bucket lookup) — fixed (PRs #41/#42)
- ✅ Cross-family video matches — fixed in code (PRs merged), **but the
  regenerated index has not shipped**. The live site still serves the old
  matches until someone runs `backfill-views.js` → `pipeline:rematch` →
  `audit-video-matches.js` locally (needs DB + API key). **Do this first; it's
  finished work that isn't delivering value yet.**
- ❌ **Study title duplication** — `StudiesGallery` still renders raw
  `course_title` ("The Ponziani Guide: … – The Ponziani Guide: …"), the cheap
  render-time dedupe from design-review finding #1 was never applied.
- ❌ **Wrong-family studies** — a Semi-Slav study on the King's Pawn page. Apply
  the same family-compatibility guard the video matcher now has
  (`opening-families.js` move-prefix check) to the course/FEN matching in
  `course-service`.
- **Video variation-level classification** — endorsed as the right next pipeline
  project (already scoped in `activeContext.md`): a one-time taxonomy/LLM pass
  classifying each video to variation level, replacing the denylist heuristics
  and fixing the ~82-pages-per-video fan-out.

### 2.2 The learning loop (existing surfaces)

- **Practice mode is the seed of the learning product but under-delivers on
  short lines** — "Move 1 of 1" on one-move openings (design-review #7, accepted
  then, worth doing now). The tree service already knows each position's most
  popular continuations: extend practice to "opening line + the N most popular
  book moves that follow", which converts thousands of stub-depth pages into
  real training and is the prerequisite for spaced repetition (§3).
- **Practice audio has never worked in production** — `useAudio` fetches
  `/sounds/move.mp3` and `/sounds/success.mp3`, but
  `packages/web/public/ sounds/` **does not exist**; every board interaction
  takes the failure path (console noise, oscillator fallback). Add the two files
  or delete the fetch path — either beats the current state.
- **Analyse hero-cards still ambiguous** (design-review #3): "Top performing:
  Vienna Gambit: 3…d6" vs "Needs work: Vienna Game: Vienna Gambit" read as the
  same opening. Show full distinguishing lines; label bare-family child rows
  "Main line".
- **`PersonalOpeningStats.tsx` is 1,665 lines.** It owns fetching, caching,
  aggregation, sorting, filtering, and all rendering for the Analyse page.
  Extract data hooks (`usePersonalGames`, `useFamilyRollups`) and presentational
  components **before** building the deviation trainer (§3.1) on this surface —
  otherwise the highest-value new feature lands on the least maintainable file
  in the codebase.

### 2.3 Accessibility & semantics (design-review #2, still open)

`OpeningCard` remains a `div role="button"` — no Space-key activation, no
middle-click/new-tab, and card grids contribute zero crawlable internal links
(relevant to P7). Make cards real `<a>` elements, `aria-hidden` the board SVGs
(or fix via the P2 static renderer, which shrinks the a11y tree by itself), and
promote detail-page section headings H3→H2.

### 2.4 Housekeeping

- **Memory bank is stale on test health**: `progress.md` still lists "16 broken
  tests" as a known issue; both suites are verified green. Corrected as part of
  this review.
- Copy nits and mobile filter-chip stacking (design-review #5/#6) — batch with
  the next touch of those components.
- Footer internal links (ECO family hubs, Analyse) — bundle with family hub
  pages (§3.4), where they become natural link targets.

---

## 3. New features (re-ranked from TASK008)

TASK008's competitive analysis and strategic framing ("the free Chessable";
convert one-time visitors into returning learners) remain correct — see that doc
for the full landscape. What has changed since February: family taxonomy +
rollups shipped, the Analyse page now imports and classifies 500 games per user,
and the tree service exists. That reshuffles the build order — the deviation
trainer got dramatically cheaper, so it moves up.

### 3.1 Book-deviation trainer (was TASK005/#3 — now the top feature bet)

**Why first now:** the Analyse pipeline already fetches a user's last 500 games,
parses PGNs, and matches openings by FEN. Finding _the first move where the user
left known theory_ is a walk down each game's moves against the ECO FEN index —
data and infrastructure that all exist today. No Stockfish, no new pipeline.

**v1 scope:** per opening row in Analyse, show "you deviated from book at move 6
in 4 of 7 games" with the position; link to the deepest matching opening page
with practice mode pre-armed. This is the complete
explore→analyse→practice→improve loop in one feature, it's unique among free
tools (ChessTempo charges for a clunkier version), and it directly serves the
stated project goal ("explore their performance and improve").

**Dependencies:** the §2.2 refactor of `PersonalOpeningStats`; engine-based
blunder detection (TASK013) stays deferred — book-deviation alone is the 80%.

### 3.2 Rating-contextualised move statistics (TASK008 #1 — still excellent)

Unchanged case: master stats are near-useless to sub-1800 players; the Lichess
explorer API (`explorer.lichess.ovh/lichess`, `ratings=` param) provides
what-people-at-your-level-play for free. A rating-band selector on the detail
page's stats + continuations, fetched client-side with short-TTL caching. One
API integration, immediate differentiation. Pairs naturally with 3.1: "at your
level, opponents answer 4…e5 here 60% of the time."

### 3.3 Spaced-repetition review queue (TASK008 #2)

Still the biggest structural gap vs Chessable, and still deliberately third: it
needs practice-mode depth (§2.2) to be worth drilling, and repertoire v2 (3.5)
to define _what_ to drill. localStorage intervals (1→3→7→21 days), a "due today"
strip on the landing page, reuse practice mode as the drill UI.

### 3.4 Family hub pages (new since TASK008 — Phase 2 of the rollups plan)

`/family/:id` landing pages (28 families): description, key variations tree,
most popular lines by rating band, best videos/studies for the family. The
taxonomy, `GET /api/families`, and per-family video data all exist. Serves
discovery ("I keep facing the Sicilian — where do I start?"), gives the footer
and cards real internal-link targets (P7/§2.3/§2.4 synergy), and creates 28
high-quality SEO pages targeting the queries people actually search ("Sicilian
Defense guide") instead of 12k thin FEN pages.

### 3.5 Repertoire v2

Colour + priority on starred openings, PGN export, "add this line" from any tree
node. Feeds 3.3. Flat list first; tree visualisation later.

### 3.6 Opening-to-middlegame bridge (TASK008 #4 — keep last)

High user value ("what do I do when the opening ends?") but it's an LLM content
project, and the common-plans incident showed the validation cost of shipping
generated content without provenance checks. Do it after the variation-level
video classification builds the taxonomy/validation muscle.

---

## 4. Suggested sequencing

| Horizon             | Work                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Now (days)**      | Ship the staged video rematch. Study title dedupe + family guard. Delete `/api/openings/all`. Browser caching + `fields=lookup` on Analyse. Console.log sweep. Audio files in or out. Memory-bank corrections. |
| **Next (1–2 wks)**  | Static MiniBoard renderer → route code splitting (P2→P1). Self-host fonts. `<a>` cards + aria-hidden boards. `PersonalOpeningStats` refactor. Shard the edge SEO lookup (P6).                                  |
| **Then (features)** | Book-deviation trainer v1 (3.1) → rating-contextualised stats (3.2) → family hub pages (3.4).                                                                                                                  |
| **Later (arch)**    | Static pre-render of opening pages (P7, absorbs P9). Practice-mode depth → SRS queue (3.3) → repertoire v2 (3.5). Variation-level video classification. Middlegame bridge (3.6).                               |

The "Now" row is roughly a week of work and closes every known trust-undermining
defect plus the cheapest performance wins. The "Then" row is where the product
identity advances: after it, OpeningBook is the only free tool that tells a
player where their opening play breaks down and trains the fix at their level.

---

## 5. Addendum — master games and the rest of the learning journey

### 5.1 Master games: the missing artefact

Today the product holds **aggregate statistics only** — `popularity_stats.json`
stores win rates, frequency counts and average rating per position. There is not
a single actual game anywhere in the product: no game IDs, no player names,
nothing a learner can replay. Every serious opening resource ends up answering
"show me this opening played well" — OpeningBook currently can't.

**M1 — Model games on the detail page (small effort, high value).** The free
Lichess explorer API's masters endpoint (`explorer.lichess.ovh/masters?fen=...`)
returns `topGames` for any position: game ID, both players with ratings, year,
and result. Fetch client-side per FEN (same integration pattern, caching, and
rate-limit budget as the rating-band stats feature 3.2 — build them together),
render a "Notable games" list of 3–5 entries, and replay each one on the
existing board (the Lichess game export API returns PGN by ID) or deep-link to
Lichess. This is the cheapest possible bridge from "I memorised 8 moves" to "I
watched a strong player convert this structure into a win" — and it complements
the middlegame bridge (3.6) with zero LLM risk, because the content is real
games.

**M2 — Notable practitioners (nearly free, same API response).** The `topGames`
payload names the players; surfacing "recently played by Caruana, Rapport, …" on
major openings adds identity and credibility to a page (the one thing 365Chess
does that OpeningBook doesn't). Render-only feature on top of M1's data.

**M3 — Master continuations in practice mode.** When the book line ends, offer
"continue like a master": play out the next N most common master moves from the
same endpoint. This is the concrete mechanism for fixing the "Move 1 of 1"
problem (§2.2) on popular lines, and it makes practice depth proportional to how
much theory actually exists.

### 5.2 Other learning-journey features worth adding to the backlog

Ranked by impact for the sub-1800 learner against implementation cost:

**J1 — Per-move "why" annotations.** Practice mode currently tests recall but
never explains purpose — a learner can pass the drill without understanding why
3.Bb5 attacks the knight that defends e5. One-line annotations per mainline move
for the top ~500 openings by popularity (LLM-generated, human spot-checked —
apply the provenance lessons before scaling) turn memorisation into
comprehension. This is the single biggest content upgrade to the existing
trainer.

**J2 — Traps and typical tactics per opening.** Disproportionately loved by the
target audience (trap videos dominate club-level chess YouTube — the matched
video corpus proves it). A "Traps to know" section: the trap line replayable on
the board, marked as "you can set this" vs "avoid falling into this". Candidate
lines can be mined from existing ECO sub-variations whose names mark traps, plus
engine-validated LLM suggestions. Medium content effort; very high engagement
value.

**J3 — Paste-a-game post-mortem.** PGN identification already exists on the
landing page; extend it one step — after identifying the opening, walk the
game's moves against the ECO index and show _where the player left book_, with a
link to the correct line's page and practice mode. This is a single-game,
no-account slice of the deviation trainer (3.1) — shippable earlier, a great
shareable acquisition hook ("here's where your opening went wrong"), and it
reuses the exact same book-walk logic, so building it first de-risks 3.1.

**J4 — Progress tracking and streaks.** Mark openings as learning/learned, show
last-practiced dates and a practice streak. Cheap localStorage state, and it's
the retention mechanic the review's "open learning loop" finding needs _before_
full SRS (3.3) exists — SRS then upgrades the same data model from "streak" to
"due dates".

**J5 — Guided learning paths.** "Your first White repertoire (under 1200)" —
curated sequences of 8–10 existing opening pages with a progress checkbox per
step (J4's data model). Mostly editorial work over existing pages; answers
"where do I start?", which no amount of search quality answers for a genuine
beginner. Natural companion content for family hubs (3.4).

**J6 — Side-by-side opening comparison.** "Caro-Kann vs French for my style" —
two detail summaries in one view. A real user question, but lower priority; the
family hubs + style tags already partially answer it.

### 5.3 Where these slot into the §4 sequence

- **M1/M2 join 3.2** — one Lichess-explorer integration ships both master games
  and rating-band stats; build them as a single feature.
- **J3 precedes 3.1** as its thin end-to-end slice; **J4 precedes 3.3** the same
  way.
- **M3 merges into the practice-depth work** already listed in "Later".
- **J1/J2** are enrichment-pipeline projects — schedule them after the
  variation-level video classification builds the validation tooling.
- **J5** ships with or right after family hubs (3.4); **J6** stays parked.
