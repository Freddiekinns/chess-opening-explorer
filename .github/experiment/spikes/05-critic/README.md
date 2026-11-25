# Spike 05 — the critic's checks on spikes 01–04 (night 8)

An independent critic (Opus, medium) re-ran the numbers. Its scripts are here
(`r.js` reach ceilings, `m.js` stricter mistake rule, `o.js` coverage on obscure
pages). What it changed:

## Named-line reach does not weaken idea 1 (retracted)

- Following the opponent's **most played** move at every step of the same lines
  reaches a median 4.0% (p90 11%). Any 9+ ply line is "rarely reached", idea 7's
  band path included. The named line gets ~a third of that ceiling (median ratio
  0.34).
- Counted from the page's own family (opponent steps after ply 4 only), the
  named line's median is 4.9% against a 10.8% ceiling.
- Books teach main lines for structures and plans, not for replay. Fair finding:
  the splits matter more than the moves — which Revision 1 already does by
  pausing at splits. "Weakened" is withdrawn.

## The common-mistake rule, tightened

- The fixed 44% cut-off leans on Black (110 of 164). 74 of 164 compare against a
  "best" move under 15% share (the 5...b5 effect).
- Stricter rule: against the most played other move (15%+ share), gap 8+ points,
  move 6+ points below the rest of the position: **89 of 164 survive**. 95 of
  136 replicate at u1400 (still ≤44%), 121 of 158 keep the gap at 1800. Mostly
  real bad moves, not noise.
- The "1400" band's average rating is ~1628: copy must say what it is.

## The test that nearly kills idea 8 as a page feature

- 8,513 of 12,377 pages (69%) have under 2,000 games at 1400. Of those, 0 have a
  mistake on the page and 2 have one within 4 ply.
- Relaxed (300+ games, 100+ for the move, 10-point gap vs the most played
  alternative): 99 of 2,456 mid-sized pages. 6,057 pages have under 300 games or
  no band data and get nothing at any threshold.
- For 157 of the 500 covered pages the move is already in the page's own Next
  moves list; only the look-ahead (343 pages) and "try it" are new.

Verdict: a trap-awareness feature for ~500 popular pages, or a family-level trap
set reachable from any page in the family — not the experiment's main direction
unless visitors actually reach popular family pages (PostHog, `[local]`).
