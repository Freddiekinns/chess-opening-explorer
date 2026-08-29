---
name: search-ranking
description:
  How opening search matches and ranks, across the client and the server. Use
  when changing search behaviour, ranking or scoring, adding a query shape (ECO
  codes, moves, abbreviations), touching Fuse or NameIndex, or debugging why a
  query returns the wrong openings or feels slow.
---

# Search and ranking

One rule implemented twice: `packages/web/src/lib/localSearch.ts` paints on the
keystroke from a held index slice, and `packages/api/src/services/search/`
replaces that list a moment later. They must agree — see
`packages/web/AGENTS.md` for the client half's file map, and
`packages/api/AGENTS.md` for route and caching rules.

## Invariants

- **Search query shape is decided on the client, ranking on the server.**
  `packages/web/src/lib/searchQuery.ts` owns abbreviation expansion ("qgd" →
  "Queen's Gambit Declined"), the ECO-code and chess-move tests, and the one
  debounce constant; `hooks/useOpeningSearch.ts` owns the fetch and the local
  index. All three search surfaces (hero `SearchBar`, `TopBarSearch`, mobile
  `SearchOverlay`) call that hook — **do not add a fetch, a debounce or a local
  index to a search component.** They each had their own until 2026-08-03, and
  only the hero expanded abbreviations, so "kid" gave the King's Indian in one
  box and the Kiddie Countergambit in another. Surprise me is
  `lib/randomOpening.ts`, shared the same way by the same three plus the landing
  page.

- **Search matches names literally before it does anything fuzzy.**
  `search/NameIndex.js` bands a query against normalised opening names (exact
  phrase → whole words → last word still being typed → substring) and orders
  each band by `games_analyzed`. `search()` runs move, ECO, name, meaning,
  spelling in that order and returns the first pass with anything to say. Fuse
  is the typo net only. Until 2026-08-04 every text query went through Fuse over
  name/moves/style_tags/**description**, which cost 850–2,800ms and scored a
  third of the corpus as matches — "sicilian" hit 4,269 of 12,377 openings, and
  every re-ranking pass downstream existed to undo that. Literal matching
  answers the same queries in 2–5ms. **Do not put `description` back in
  `FUSE_OPTIONS.keys`**, and do not add routing heuristics that guess what a
  query is before trying to match it: the deleted `looksLikeOpeningName` and
  `isAmbiguousSemanticTerm` sent "aggressive openings" to a 2.4s fuzzy name
  search that returned the Andersspike.

- **Both halves of the search rank by the same bands, and a test says so.**
  `lib/localSearch.ts` (client, paints on the keystroke from the shared index
  slice) and `search/NameIndex.js` + `searchByMove` (server, replaces it a
  moment later) implement one rule twice. `local-server-parity.test.ts` imports
  the server module directly and runs both over the same openings. If they
  drift, the results reshuffle under the cursor mid-read.

- **A band plus `log10(games)/10` is the score shape.** It keeps the popularity
  term under 1 so a result can never climb a band, and gives `promoteSaved` a
  tie band that means something. Flat multipliers do not: the semantic path's
  `Math.min(0.1, games / 10000)` saturated at a thousand games, so style
  searches fell back to corpus order and "aggressive openings" led with the Amar
  Gambit.

- **Clearing a debounce timer does not cancel a request that already left.**
  Anything that fetches per keystroke needs a monotonic request id checked
  before every `setState`, the way `useBrowse` and `useOpeningSearch` do it.
  Without one, a slow query resolves after the query that replaced it and
  repaints the older list under the newer one. Clearing the field must bump the
  id too, or the list comes back a moment after the user emptied it.

- **`eco` is not a Fuse key, so ECO codes need `searchByEcoCode`.** Before the
  explicit branch in `search-service.js`, `B90` returned **0** results against
  31 openings carrying the code — while the UI told users to "try an ECO code".
  If you add a query shape the fuzzy index cannot see, it needs its own branch,
  not a hope that Fuse copes.
