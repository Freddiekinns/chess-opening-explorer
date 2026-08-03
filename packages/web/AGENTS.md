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
fetch, a debounce or a no-results string to a search component.** Query shape
(abbreviations, ECO codes, moves, the debounce constant) lives in
`lib/searchQuery.ts`; local ranking in `lib/localSearch.ts`; the saved-opening
tie-break in `lib/searchRanking.ts`. Rows come from `SearchRow`, the blank state
from `SearchHub`, the dead end from `SearchNoResults`.

Each surface keeps only what genuinely differs: focus and teardown, the keyboard
cursor, and where a chosen result goes. `search-surface-parity.test.tsx` pins
that the three ask the same question and give the same answer.

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
