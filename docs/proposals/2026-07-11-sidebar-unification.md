# Sidebar unification — design review and decision record

**Date:** 2026-07-11 · **Status:** proposed (awaiting Fred's go/no-go per phase)
**Amends:** `2026-07-11-deviation-trainer-prd.md` §5 (evidence engine UI)
**Mock:**
[`assets/2026-07-11-sidebar-unification-mock.html`](assets/2026-07-11-sidebar-unification-mock.html)
(rev 2, also published as a Claude artifact during the design session)

## Context

Slice 1 shipped the evidence engine as a self-contained `WinRatePanel`: Elo band
pills, live W/D/L stats, a "next moves" list from the explorer, notable games,
plus a separate `AnalyseBridgeCard`. Fred's review of the live result found:
unlabelled pills, an undecodable bar/legend, a one-off style for the move list,
a bridge card that overpromised, and — the structural finding — **two lists of
next moves on one page** (the panel's explorer list vs the Opening book's
Continuations), distinguishable only by data provenance, which users neither
know nor care about.

An intermediate proposal (rev 1) kept both lists and differentiated them
visually. Fred correctly rejected the premise: same subject, two surfaces, is an
information-architecture bug, not a styling problem.

## The approach (rev 2)

One column, distinct roles, one list of next moves:

1. **Elo lens** (top of column): the band selector, labelled "Elo", lowest →
   highest, persisting site-wide as "my level". It governs everything below —
   the win-rate stats _and_ the book's move stats change together.
2. **Win rates** (evidence): level-check strip, stats card (sentence-case
   labels, legend with colour swatches and verbs — "White wins 48%"), notable
   games (three + "Show more"), closing link "These are everyone's results —
   analyse your own games in this opening". **No move list.** The standalone
   bridge card is deleted.
3. **Overview** (meaning): unchanged.
4. **Opening book** (navigation): absorbs the explorer data. "Continuations"
   becomes **"Next moves"**: tree children remain the backbone (always render,
   local data, links). When explorer data for the active band is available, rows
   re-rank by actual play, gain a W/D/L mini bar in the result colours + games
   count, and popular moves absent from the book join as inert data rows
   labelled "not in the book". Alternatives get the same treatment from the
   parent position's explorer data. The orange popularity bar retires.

## Critical assessment

### What it genuinely fixes

- **One subject, one surface.** The strongest argument is empirical: at
  1400–1800 the most played move after the Slav 3.e3 Nf6 is Nc3 (662k games) — a
  move with no page in our book. The old Continuations list structurally could
  not show a club player their own main line. The merge fixes a data blind spot,
  not just a duplication.
- **The dead-switch problem.** Band clicks previously changed one card's numbers
  (often to nearly identical values — see risk 1). With the lens governing the
  whole column, a click visibly transforms stats _and_ the move list ranking.
  Feedback is unmistakable.
- **Role clarity.** Lens → evidence → meaning → navigation is explainable in one
  sentence per panel; the bridge card, which had no role, disappears.
- **Resilience preserved.** Navigation never depends on Lichess: no band or
  explorer failure ⇒ named rows with counts, i.e. today's book. Explorer data is
  strictly progressive enhancement.

### Where it is weak (risks, ranked)

1. **Club-band W/D/L splits are near-uniform — the mini bars may carry little
   information exactly where the feature is aimed.** At 1400–1800 every reply
   here scores ≈48/5/47; the _informative_ dimension at club level is volume,
   which the retired popularity bar encoded preattentively and the count now
   carries only as text. At masters the splits diverge strongly (34/48/19) and
   the bars earn their place. **Mitigation:** accepted trade-off, for two
   reasons: (a) it matches the Lichess explorer convention (bar = outcomes,
   number = volume) that most of our audience already reads fluently; (b) the
   rows are rank-ordered by volume, so ordinal volume survives. A hybrid bar
   (width ∝ volume, fill = W/D/L) was considered and rejected as too clever for
   a 4px bar — revisit only if user feedback shows volume scanning suffers.
2. **Inert rows inside a navigation panel invite dead clicks.** "Not in the
   book" rows look like their link siblings. Users will click Nc3 and nothing
   will happen. **Mitigation:** no hover state, no chevron, `cursor: default`,
   muted name text; cap unnamed rows (proposal: 3) so most rows stay links.
   Residual risk accepted; a future option is deep-linking unnamed moves to the
   analysis board FEN.
3. **Re-ranking breaks positional memory.** A reference book whose line order
   changes with a filter is less calm than one that doesn't. **Mitigation:**
   default (no band) keeps today's canonical order; re-ranking happens only
   after an explicit lens choice, which is the user asking for exactly that.
   Rows keep stable identity (same key/fen) so switches animate rather than
   teleport.
4. **SAN matching is fragile at the edges.** Tree rows carry `child.move` (SAN
   with move-number prefix, already stripped via `stripMoveNumber`); explorer
   returns bare SAN. Castling glyphs (O-O vs 0-0), check/mate suffixes, and
   disambiguation could mis-match, producing a duplicated row (named row
   bar-less + unnamed twin with stats). **Mitigation:** normalise both sides
   (strip `+`/`#`, unify castling), dedupe by normalised SAN with tree row
   winning, and extend `scripts/audit-video-matches.js`-style spot-checks with a
   small audit script over the top-200 pages before ship.
5. **Explorer budget rises from ~2 to ~3 requests per cold page view** (the
   Alternatives enrichment needs the parent position at the active band). Within
   the 25 req/min token budget given CDN caching, but crawler-wave headroom
   shrinks ~⅓. **Mitigation:** parent fetch is lazy (only when a band is active)
   and shares every cache layer; 429 degrades to bar-less rows invisibly.
6. **`OpeningNavigator` is high-blast-radius.** It renders on all 12,377
   SEO-indexed pages and is stable/tested. The merge touches its data flow,
   sorting, and row markup. **Mitigation:** phasing (below); explorer data
   arrives as an optional prop, with the no-prop path rendering byte-identical
   to today; snapshot the no-band DOM in tests.
7. **Lens scope is not literally the whole column** — Overview doesn't react to
   it. Judged acceptable: prose is evidently level-agnostic, and the two data
   panels responding in unison is the signal that matters.

### Rejected alternatives

- **Two differentiated lists (rev 1):** provenance is not a user-facing
  distinction; rejected by the owner, agreed.
- **Merge into the Win rates panel instead** (evidence list becomes partially
  navigable, book loses Continuations): makes primary navigation dependent on a
  third-party API and level filter. Navigation must be boring and reliable;
  rejected.
- **Hybrid volume×outcome bar:** see risk 1.

### Open questions (not blockers)

- Should Overview move below the Opening book once the book carries the page's
  most-consulted list? Decide with scroll/interaction beacons after Phase B
  ships, not by intuition.
- Exact cap for unnamed rows (proposed 3) and whether they appear for the
  masters band (masters "not in the book" rows are rarer but sharper).

## Phasing

- **Phase A — panel polish (low risk, independently shippable).** Panel title
  "Win rates", "Elo" tag on the pills (still inside the panel), source line,
  legend swatches + verbs, sentence-case labels, notable games collapse to
  three, bridge card → closing link. No `OpeningNavigator` changes. Rev 1's
  useful subset, all inside components shipped this week.
- **Phase B — unification (the structural change).** Lift band state to
  `OpeningDetailPage`, move the lens above the panels, pass explorer results
  into `OpeningNavigator` (optional prop), SAN-normalised merge + re-rank +
  unnamed rows, Alternatives via parent-FEN fetch, retire the panel's move list
  and the popularity bar. Ships with the audit script and a no-band DOM-parity
  test.

Copy decisions locked: "Next moves" (book section), "not in the book" (never "no
name in theory" — our book's coverage is not the whole of theory), legend verbs
("White wins 48%", "Draws 5%"), "Total games" / "Average Elo".

## References

- PRD: `docs/proposals/2026-07-11-deviation-trainer-prd.md` (§5)
- Slice 1 plan: `docs/superpowers/plans/2026-07-11-slice1-evidence-engine.md`
- Explorer auth constraint: Lichess requires authentication since 2026-03; live
  data flows through `/api/explorer` (see CLAUDE.md gotcha)
- Design system: `design-system/README.md` ("Warm Editorial Dark"); the existing
  preview card `design-system/project/preview/components-level-check.html` must
  be updated in lockstep with whichever phase ships
