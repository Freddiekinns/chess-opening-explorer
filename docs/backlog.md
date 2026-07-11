# Feature Backlog — assessed and ranked (2026-07-11, rev 3)

Assessment of every feature candidate from
`docs/reviews/2026-07-02-project-review.md` (§3 main list, §5 M/J addendum,
including the later J8/J9 additions), re-ranked against what has **actually
shipped** since that review, then stress-tested across three revisions:

- **rev 1** — re-rank against shipped foundations (PRs #45–#48).
- **rev 2** — three lenses: _substitution_ (does chess.com/Lichess/Chessable/
  YouTube do this one click from where the user already is? — killed J3),
  _internal duplication_ (does our own site already do it?), _behavioural
  realism_ (does a sub-1800 club player actually act this way?).
- **rev 3** — three more: _funnel reality_ (where do visitors actually land?),
  _evidence_ (can we prove a deviation matters without an engine?), _risk
  laddering_ (what does a solo dev ship first to de-risk the rest?).

## The unifying principle

The substitution test exposed one pattern: **the only durable moat is connecting
a user's own games to learning content.** Lichess has better raw stats,
Chessable has better drilling, YouTube has better explanations — each one click
away. No free tool walks _your_ games, finds _your_ recurring leak, and hands
you the page + video + drill for it. Features that exploit that connection
survive; features that don't turned out to be worse versions of something that
already exists.

## Rev 3 findings (change the build order, not the destination)

1. **Funnel reality.** This is an SEO product: nearly all visitors land once on
   one of 12k detail pages from Google. The deviation trainer lives on Analyse,
   which requires knowing the site, navigating there, and typing a username — an
   audience that is currently unmeasured and probably small. Retention features
   need users to retain: the trainer needs a **bridge from the detail pages**
   (where traffic actually is) and **instrumentation** to know if Analyse
   engagement is real. Neither was in the backlog.
2. **The evidence synthesis.** The trainer's weakest point was proving a
   deviation _matters_ without Stockfish (J8 was parked for that). The explorer
   bundle solves it with zero compute: rating-band stats can price the leak —
   _"at your level, the book move 6.d4 scores 56%; your 6.Nf3 scores 44%."_ The
   explorer integration is therefore **not garnish on the trainer — it is the
   trainer's evidence engine**, which inverts the build order.
3. **Risk laddering.** The bundle is the smaller, self-contained slice: it ships
   visible value to today's actual visitors, forces the caching/
   rate-limit/error-handling questions to be answered once, and everything the
   trainer needs then already exists. Build the foundation that is also a
   feature.

## What changed since the 2026-07-02 review

- **Foundations shipped** (PRs #45–#48): route splitting + static MiniBoard,
  aggregate `/api/openings/page/:fen`, sharded edge lookup, canonical
  `api/data/`, **`PersonalOpeningStats` refactor** (3.1's blocker — gone),
  **practice mode extended into popular continuations** (3.3's blocker — mostly
  gone), video rematch shipped (coverage 72.8%, contamination 0%), family
  fallback shelves + `family-resource-service` (makes 3.4 much cheaper), study
  matching v2 (top-200 coverage 92%).
- **Still open from the review** (not features, but they gate trust): popularity
  stats remain dated **2025-07-15** (12 months stale); E2E specs still absent
  from CI (S2); no error monitoring (S4).

---

## Tier 1 — the recommendation: one pursuit, three shippable slices

**The destination is the book-deviation trainer.** It is built in slices that
each ship standalone value, ordered by the rev 3 findings.

### Slice 1 — Lichess explorer bundle (3.2 + M1 + M2) `S–M`

One client-side integration (`explorer.lichess.ovh`), three renderings on the
detail page:

- **3.2** — rating-band selector on the stats/continuations panel: "what people
  at _your_ level play".
- **M1** — "Notable games" (3–5 `topGames` entries), deep-linked to Lichess in
  v1, replayable on the existing board in v1.1. The product currently contains
  **zero actual games**.
- **M2** — practitioner names from the same payload, render-only.

**Substitution honesty:** Lichess's own analysis board has rating bands and top
games — this is **integration value, not unique data**. The case: our reader is
mid-learning-context, not mid-analysis, and (rev 3) this same client is the
trainer's evidence engine.

**Design constraints:** one stats panel, one source at a time — live explorer
numbers _replace_ the 2025-07-15 snapshot when a band is selected, clearly
labelled. Cache per FEN+band (localStorage TTL: ~1 week masters, ~1 day lichess
DB); fetch lazily; degrade silently to snapshot on failure/429. Ship error
monitoring (S4) in the same PR — this is the first client-side external
dependency.

**Ship with it (rev 3):** the **Analyse bridge** — a small prompt on detail
pages ("See how _you_ actually play the Najdorf — free, no account") — and
**minimal usage instrumentation** (Analyse visits, username submissions, panel
interactions; a lightweight beacon or Vercel Analytics events within hobby-plan
limits). This measures whether the retention bet is landing _before_ the biggest
slice is built.

### Slice 2 — Book-deviation trainer v1 (3.1) `M`

Per opening row on Analyse: "you left known theory at move 6 in 4 of 7 games",
with the position, the book continuations, **the leak priced by slice 1's band
stats** ("book move scores 56% at your level; yours 44%"), and a link to the
deepest matching page with practice mode pre-armed. A second pass over the 500
games the browser already holds — zero new endpoints.

**Substitution honesty:** the _diagnosis_ has partial substitutes (Lichess
personal explorer, openingtree.com let a motivated user find divergence
manually). The **prescription** — automatic cross-game leak detection wired to
the fix — exists nowhere free. The prescription is the feature.

**Design constraints:**

- **Filter to user-deviations.** At club level most games leave book because the
  _opponent_ plays junk; flag only positions where the user's move left book
  while book moves were available. (Opponent-deviation data — "opponents leave
  book here; how to punish" — is its own v2.)
- **"Book" = ECO index + popular tree continuations** (the same extension
  practice mode uses), or shallow named lines produce false flags.
- Copy says "left known theory", never "mistake" — the explorer evidence carries
  the "it matters"; engine eval-deltas stay parked (J8).
- Suppress single-occurrence deviations; recurrence is the signal. v1 scope: top
  leak per colour per opening with ≥3 games, one expandable panel + CTA.

Milestone 1 (internal): the single-game book-walk — formerly standalone J3,
demoted 2026-07-11 (the motivated moment lives on chess.com/Lichess where
one-click engine review exists).

### Slice 3 — "drill your leaks" SRS — **parked pending accounts (owner decision 2026-07-11)**

A drill queue is only really useful with cross-device state — i.e. an account —
and accounts aren't justified until slices 1–2 prove the product has earned the
signup. Slice 2's returning-user metric is the accounts go/no-go input; the SRS
queue (seeded by leaks, the thing Chessable cannot build), streaks, and synced
state all revisit with that decision. Until then the drill loop is leak panel →
practice mode, stateless. See the PRD
(`docs/proposals/2026-07-11-deviation-trainer-prd.md` §7).

---

## Tier 2 — supporting structure

### 4. "My openings" v2 — merged J4 + 3.5 `S–M`

Progress tracking (J4) and repertoire v2 (3.5) were two overlapping localStorage
stores over one concept. One model: opening + colour + priority

- status (learning/learned) + last-practiced + (later) due-date. Status controls
  on pages and repertoire, "add this line" from any tree node, PGN export.
  localStorage = no cross-device sync; say so in the UI ("saved on this
  device"). Prerequisite for slice 3.

### 5. 3.4 — Family hub pages, absorbing J5's guided paths `M` _(parallel editorial track)_

A hub that re-shelves the family's videos/studies/tree duplicates the family's
_root opening page_. The hub earns its URL through what J5 was: **guidance** —
"new to the Sicilian? start with these 5 lines in this order", "what to play
against it at your level" (slice 1 data), per-step checkboxes (#4's model).
Composition is cheap (`GET /api/families`, `family-resource-service` exist); the
editorial guidance is the real cost. 28 quality SEO pages for queries people
actually search. Independent of the trainer track — run in parallel when
editorial energy exists.

---

## Tier 3 — content depth (after the loop closes)

### 6. J2 — Traps and typical tactics per opening `M content`

Survives all lenses: trap demand is proven by the matched video corpus, and
nothing lets you _replay and drill_ the trap on the page you're studying. Cheap
v1: mine trap-named ECO sub-variations, tagged "you can set this" / "avoid
this". **Pre-commit check: audit how many trap-named ECO lines exist before
scoping.** LLM+engine expansion waits for validation tooling.

### 7. J1 — Per-move "why" annotations `L content`

Biggest content upgrade to the trainer (recall → comprehension). **Creative
sourcing:** mine the 6,100+ matched study chapters first — Lichess study PGNs
carry _human_ per-move comments, already linked to our pages by study matching
v2. Grounding/attributing annotations to human commentary cuts the
common-plans-style fabrication risk. After validation tooling exists.

### 8. J9 — Board-input search `S–M` _(demoted from feature to enhancement)_

"Move pieces, see named openings + stats" is precisely the Lichess analysis
board with explorer open; internally the detail-page tree already navigates
lines. What survives: a **board input mode on search** — play moves, see which
named openings you're in or can reach, click through. Build as a search
enhancement, not a destination.

### 9. M3 — Master continuations in practice mode `S`

Fold into slice 1's integration if trivial. Mostly superseded by the shipped
popular-continuations work; the increment is master-quality depth on
heavily-theorised lines.

---

## Tier 4 — parked or cut

- **J7 — PWA with offline practice `M` — parked.** Worth it once slices 2–3 give
  a daily reason to open the app; a PWA _worsens_ the cross-device localStorage
  gap (the moment to consider optional sync).
- **J8 — Stockfish deviation analysis `M` — parked.** Natural v3 of the trainer;
  client-side WASM keeps it off Vercel. Rev 3 note: the explorer evidence covers
  most of its value ("book move scores better at your level") without the
  mobile-CPU cost — park harder.
- **3.6 — Middlegame bridge — cut.** Matched videos already explain middlegame
  plans, common plans covers page-level "what now", M1 shows real structures.
  The residual gap doesn't justify the riskiest LLM content project on the list.
  Revisit only with user evidence.
- **J6 — Side-by-side comparison — cut.** "Caro-Kann or French for my style?" is
  now a chatbot question, answered better there than any static two-column view.
  Hubs cover the residual need.

---

## Enablers (sequence alongside)

- **Usage instrumentation (new, rev 3)** — Analyse visits, username submissions,
  explorer-panel and trainer interactions. The whole Tier-1 bet assumes Analyse
  can become a retention surface; measure it from slice 1.
- **Error monitoring (S4)** — ship with slice 1 (first client-side external
  dependency; failures are otherwise invisible).
- **E2E in CI (S2)** — add before slices touch Analyse and landing flows.
- **Popularity stats refresh + freshness badge** — still `2025-07-15`; run
  quarterly, surface the date. Slice 1 mitigates but does not fix.
- **Variation-level video classification** — endorsed pipeline project; also
  builds the validation tooling gating J1/J2.

## Build order

```
Slice 1: explorer bundle + Analyse bridge + instrumentation + S4  (S–M)
Slice 2: deviation trainer v1, evidence-priced                    (M)
   #4:   My-openings v2                                           (S–M)
Slice 3: drill-your-leaks SRS + streaks                           (M)
   #5:   family hubs + guided paths — parallel editorial track
then: J2 → J1 → J9-as-search-enhancement → M3
parked: J7, J8 · cut: 3.6, J6
```

After slices 1–3, OpeningBook is the only free tool that finds where your
opening play breaks down in your own games, proves it matters at your level, and
drills exactly that. That sentence is the product; everything above either
serves it or got cut.
