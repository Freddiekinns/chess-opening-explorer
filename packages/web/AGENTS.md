# Frontend rules

React 19 + TypeScript, Vite, CSS Modules + design tokens, Vitest + React Testing
Library. Tests go in `packages/web/src/**/__tests__/`.

## Styling

**When you modify a component's styles, extract them into a `.module.css` file
next to the component as part of the same change.** No standalone migration PRs
— piggyback on work you're already doing. Roughly 30 components are migrated;
the rest still use the global `src/styles/simplified.css`.

Design tokens stay global in the `:root` block of `simplified.css` — reference
them as `var(--space-6)` from module files, never hardcode hex values. Also
staying global: base element styles, `@keyframes` shared across components,
`prefers-reduced-motion` rules, and shared base classes (`.btn`, `.eco-pill`,
`.complexity-tag`, `.style-pill`) until every consumer is migrated. A component
can mix global and module classes: ``className={`eco-pill ${styles.badge}`}``.

When removing rules from `simplified.css`, watch for comma-separated selectors
shared with other components — only remove the selectors you're migrating.

## Search

All three search surfaces — the landing hero (`SearchBar`), `TopBarSearch` and
the mobile `SearchOverlay` — call `hooks/useOpeningSearch.ts`. **Do not add a
fetch, a debounce, a local index or a no-results string to a search component.**
Query shape (abbreviations, ECO codes, moves, the debounce constant) lives in
`lib/searchQuery.ts`; the shared index slice in `lib/searchIndex.ts`; local
ranking in `lib/localSearch.ts`; the saved-opening tie-break in
`lib/searchRanking.ts`; Surprise me in `lib/randomOpening.ts`. Rows come from
`SearchRow`, the blank state from `SearchHub`, the dead end from
`SearchNoResults`.

Each surface keeps only what genuinely differs: focus and teardown, the keyboard
cursor, and where a chosen result goes. `search-surface-parity.test.tsx` pins
that the three ask the same question, give the same answer, and take the same
time to do it.

### The two halves, and why they have to agree

A query paints twice. `useOpeningSearch` ranks the locally held slice on the
keystroke, then replaces that list with the server's a few hundred milliseconds
later. The slice is fetched once per page from
`/api/openings/search-index?limit=1000` on the first character typed anywhere —
never on mount, and never per surface. It used to be a prop only the landing
page supplied, which is the whole reason the hero felt instant and the top bar
felt broken.

`lib/localSearch.ts` implements the server's bands
(`packages/api/src/services/search/NameIndex.js`) deliberately, and
`lib/__tests__/local-server-parity.test.ts` imports that CommonJS module and
runs both over the same openings. If the two rankings drift the results
reshuffle under the cursor while the user is reading them, which is worse than
the wait it replaced. **Change one ranking and you change both.**

The local pass is paint-ahead and never the final answer — the server sees all
12,377 openings against the slice's popular thousand, and it can read a
misspelling. One request per query: the plain-search fallback that used to
follow an empty semantic search is gone (see the `search-ranking` skill).

## Imports

**Use relative imports for the shared package, not the package name.**

```ts
import { SomeType } from '../../../../shared/src'; // works on Vercel
import { SomeType } from '@chess-trainer/shared'; // fails the Vercel build
```

## CSS traps that have caused regressions

- **Never use `animation-fill-mode: both` or `forwards` with `transform`
  keyframes.** A retained transform (even `translateY(0)`) keeps a permanent
  stacking context, so later DOM siblings paint over — and click-block —
  overlays like the search dropdown. The `sectionReveal` entrance animation must
  use `backwards`; the end state equals the base state, so it looks identical.

- **Never let an entrance animation be the only thing that makes an element
  visible.** `.opening-card` sets `opacity: 0` and relies on
  `cardSlideIn … forwards` to bring it back, while the `prefers-reduced-motion`
  block sets `animation: none` on the same selector — so the whole Discover grid
  rendered invisible for anyone with reduced motion on. Fixed by restoring
  `opacity: 1` in that block, but the rule is: if you animate `opacity` from 0,
  either the base value is visible or the reduced-motion branch restores it.

- **Use `overflow: clip`, not `hidden`, on a card containing a sticky child.**
  `hidden` makes the element a scroll container, which becomes the containing
  block for any `position: sticky` descendant, so the child sticks to that box
  instead of the viewport. `clip` clips without establishing a scroll container.

## SPA scroll traps

React Router does not reset scroll on navigation, so a new page inherits the
previous page's offset and opens mid-page. The route-change `ScrollToTop` in
`App.tsx` handles this — don't remove it.

`element.scrollIntoView()` scrolls **every** scrollable ancestor including the
document, so using it to reveal the active move in a horizontal strip yanks the
whole page down. Scroll horizontal strips by setting the container's own
`scrollLeft`.

## Mobile

At ≤767px `OpeningDetailPage` renders a distinct mobile tree via `useIsMobile()`
(`hooks/useMediaQuery.ts`). Mobile components live in
`components/detail/mobile/`; shared move-list rules live in `lib/openingBook.ts`
so both trees render from one source. Data hooks stay page-level and are shared
by both trees — never duplicate fetches per layout.

## Sample reports (Analyse blank state)

`src/data/sample-reports/*.json` are committed fixtures of real public games, so
they go stale. Regenerate with `npm run sample:generate`, which builds
`packages/shared` first — its `dist/` is not committed. The Analyse page prints
each fixture's `generatedAt` date beside the report so staleness is visible
rather than silent. See `tools/sample-reports/README.md`.

The generator and the page share one `analyseGames` in
`packages/shared/src/utils/personal-analysis.ts`. **Never reimplement the
reduction in the script** — the fixtures would drift from what the page renders
and nothing would catch it.

**An abort is not an error.** `usePersonalGames` aborts its `AbortController`
both on Cancel and when a second run supersedes the first, and the games fetch
then rejects with an `AbortError`. Reporting that put "signal is aborted without
reason" in front of the user under a red alert. Check
`controller.signal.aborted` at the top of the catch and return; the
`if (!data) return` guard after `analyseGames` only covers the classification
phase, not the fetch that Cancel usually interrupts.

Two traps in `packages/shared`: its `tests/` directory is run by **neither**
Jest nor Vitest, so tests for shared modules belong in the web Vitest suite; and
its top-level barrels re-export without file extensions, so `dist/index.js` is
unimportable from Node ESM — import `dist/utils/<module>.js` directly. Vite
rewrites the extensions for the web build, which is why this only bites in
scripts.

## Conventions

- Functional components only
- Named exports for utilities, default export for page components
- Respect `prefers-reduced-motion` for animations
- Measure `scrollHeight` for expand/collapse animations rather than CSS
  `max-height`
