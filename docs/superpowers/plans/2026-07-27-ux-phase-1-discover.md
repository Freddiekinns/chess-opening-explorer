# UX Review Phase 1 — Discover: Close the Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the core loop — find an opening, save it, come back to it —
completable from Discover on both breakpoints, without opening a detail page.

**Architecture:** No new data layer. `useRepertoire` (localStorage,
`useSyncExternalStore`) already provides everything; `OpeningCard` already
accepts star props that nothing passes; `SearchOverlay` already is the mobile
search hub but is only reachable from detail pages. This phase wires up what
exists, adds a `/repertoire` route, extracts the toast into a shared component
with Undo, and moves search into the top bar on every page.

**Tech Stack:** React 18 + TypeScript, React Router 6, Vite, CSS Modules, Vitest

- @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
§5 Phase 1 **Visual reference:**
`design-system/handoffs/2026-07-27-ux-review/Opening Book - Proposed.dc.html` —
screens `#discover-desktop`, `#discover-mobile`, `#discover-search-desktop`,
`#repertoire-desktop`, `#repertoire-saved-mobile`, `#saved-tab-mobile`,
`#saved-tab-empty-mobile`

**Depends on:** Phase 0 (`ux/phase-0-systemic`) must be merged into
`feat/ux-review` first. This phase assumes `ResultBar` exists, `StarButton` has
`aria-pressed`, and the toast strings are already "Added to your repertoire" /
"Removed from your repertoire".

## Global Constraints

- **Branch:** `ux/phase-1-discover`, branched from `feat/ux-review` **after
  Phase 0 merges into it**. PR goes **into `feat/ux-review`**, never `main`.
- **Three mobile tabs**: Discover · Repertoire · Analyse. There is **no Search
  tab** — the spec rejected it. Search lives as a persistent icon in the app
  bar.
- **Repertoire naming**: "Your repertoire" (headings), "Repertoire" (tab, app
  bar), "Added to your repertoire" (toast).
- **Repertoire sort is fixed**: most recently saved first. **No manual
  reordering**, no Edit affordance, no Sort control beyond the fixed order.
- **No desktop repertoire page.** The row on Discover _is_ the repertoire. Do
  not add a "View all" link — it has no destination.
- **Never fabricate data.** If win rates are missing, omit the bar. Regression
  history: `OpeningCard` once invented W/D/L with `Math.random()`.
- **Cards stay real `<a>` links.** Every card grid contributes crawlable
  internal links across 12,000+ indexed pages. A star click must
  `preventDefault()` (already handled in `StarButton`).
- **Tokens only**, no raw hex. Focus outline
  `2px solid var(--color-brand-orange)`, offset 2px, on every control.
- **`--bottom-tab-bar-height` stays 60px.** The mocks say 64px; the spec
  keeps 60.
- **Do not rename the `chess-repertoire` localStorage key** or change
  `useRepertoire`'s API — renaming would orphan every existing user's saved
  openings.
- **CSS Modules for new components.** Legacy global styles live in
  `simplified.css`; do not add new global classes.
- **Animation:** never use `animation-fill-mode: both`/`forwards` with
  `transform` keyframes — a retained transform keeps a permanent stacking
  context and later siblings paint over (and click-block) the search dropdown.
  Use `backwards`. This exact bug shipped once already.
- **Prettier** before committing; ignore local `format:check` line-ending noise.

---

## File Structure

**Created:**

| File                                                                         | Responsibility                                                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `packages/web/src/components/shared/Toast.tsx`                               | One toast: message, optional Undo action, auto-dismiss. Sole owner of toast markup.                                          |
| `packages/web/src/components/shared/Toast.module.css`                        | Styles, lifted from the detail page's existing `.toast` rules.                                                               |
| `packages/web/src/hooks/useRepertoireToast.ts`                               | Toggle-with-feedback: wraps `useRepertoire.toggle`, owns the message, the timer and the undo closure.                        |
| `packages/web/src/pages/RepertoirePage.tsx`                                  | The mobile Repertoire tab — populated and empty states.                                                                      |
| `packages/web/src/pages/RepertoirePage.module.css`                           | Styles for the above.                                                                                                        |
| `packages/web/src/components/shared/SearchHub.tsx`                           | Recents + repertoire + Surprise me. Rendered inside the desktop search dropdown and reused by `SearchOverlay`'s empty state. |
| `packages/web/src/components/shared/SearchHub.module.css`                    | Styles for the above.                                                                                                        |
| `packages/web/src/components/shared/__tests__/Toast.test.tsx`                | Tests.                                                                                                                       |
| `packages/web/src/hooks/__tests__/useRepertoireToast.test.tsx`               | Tests.                                                                                                                       |
| `packages/web/src/pages/__tests__/RepertoirePage.test.tsx`                   | Tests.                                                                                                                       |
| `packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx` | Tests for star wiring.                                                                                                       |

**Modified:**

| File                                                               | Change                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `packages/web/src/components/landing/PopularOpeningsGrid.tsx`      | Pass star props to `OpeningCard`; render the toast.                      |
| `packages/web/src/components/landing/RepertoireSection.tsx`        | Empty state → one-line prompt.                                           |
| `packages/web/src/components/landing/RepertoireSection.module.css` | Drop the dashed-box empty styles; add the prompt.                        |
| `packages/web/src/components/layout/TopBar.tsx`                    | Search renders on every page; "Surprise me!" removed from the bar.       |
| `packages/web/src/components/layout/BottomTabBar.tsx`              | Three tabs, with a repertoire count badge.                               |
| `packages/web/src/components/layout/BottomTabBar.module.css`       | Badge styles.                                                            |
| `packages/web/src/pages/LandingPage.tsx`                           | "Surprise me · Paste a game" quiet links under the hero search.          |
| `packages/web/src/pages/OpeningDetailPage.tsx`                     | Adopt shared `Toast` + `useRepertoireToast`; drop the local toast state. |
| `packages/web/src/components/shared/SearchOverlay.tsx`             | Empty state renders `SearchHub`.                                         |
| `packages/web/src/App.tsx`                                         | Add the `/repertoire` route.                                             |

---

## Task 1: Shared toast with Undo

The star is about to become a single tap on a scrolling list, where mis-taps are
likely. Undo is what makes that safe. The detail page already has a toast
(`OpeningDetailPage.tsx:1472`, styles at `OpeningDetailPage.module.css:641`) —
extract it rather than write a second one.

**Files:**

- Create: `packages/web/src/components/shared/Toast.tsx`
- Create: `packages/web/src/components/shared/Toast.module.css`
- Test: `packages/web/src/components/shared/__tests__/Toast.test.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:

  ```ts
  export interface ToastProps {
    message: string;
    /** Renders an "Undo" button when provided. */
    onUndo?: () => void;
    /** Star glyph before the message. Default true. */
    showStar?: boolean;
  }
  export const Toast: React.FC<ToastProps>;
  ```

  The component is presentational — it does **not** own the dismiss timer. Task
  2 owns that.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/shared/__tests__/Toast.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('announces itself to assistive technology without stealing focus', () => {
    render(<Toast message="Added to your repertoire" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Added to your repertoire'
    );
  });

  it('offers Undo when an undo handler is given', async () => {
    const onUndo = vi.fn();
    render(<Toast message="Added to your repertoire" onUndo={onUndo} />);

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('has no Undo button when no handler is given', () => {
    render(<Toast message="Removed from your repertoire" />);

    expect(
      screen.queryByRole('button', { name: 'Undo' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- Toast` Expected: FAIL —
`Failed to resolve import "../Toast"`.

- [ ] **Step 3: Write the component**

Create `packages/web/src/components/shared/Toast.tsx`:

```tsx
import React from 'react';
import { Star } from 'lucide-react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  /** Renders an "Undo" button when provided. */
  onUndo?: () => void;
  /** Star glyph before the message. */
  showStar?: boolean;
}

/**
 * Floating confirmation above the mobile tab bar. Presentational only — the
 * caller owns the dismiss timer (see useRepertoireToast), so a toast can be
 * held open or replaced without this component tracking state.
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  onUndo,
  showStar = true,
}) => (
  <div className={styles.toast} role="status">
    {showStar && <Star size={13} className={styles.star} aria-hidden="true" />}
    <span className={styles.message}>{message}</span>
    {onUndo && (
      <button type="button" className={styles.undo} onClick={onUndo}>
        Undo
      </button>
    )}
  </div>
);

export default Toast;
```

Create `packages/web/src/components/shared/Toast.module.css` by moving the
`.toast`, `.toastStar` and `@keyframes toastIn` rules out of
`packages/web/src/pages/OpeningDetailPage.module.css` (lines 641-678), renaming
`.toastStar` to `.star`, and adding the undo button:

```css
.toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(
    var(--bottom-tab-bar-height) + env(safe-area-inset-bottom) + var(--space-3)
  );
  z-index: 150;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-lg);
  animation: toastIn 200ms ease-out;
}

.star {
  color: var(--color-brand-orange);
  fill: var(--color-brand-orange);
  flex: none;
}

.message {
  white-space: nowrap;
}

.undo {
  background: none;
  border: none;
  padding: var(--space-1) var(--space-2);
  margin-left: var(--space-1);
  color: var(--color-brand-orange);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-height: 44px;
}

.undo:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translate(-50%, 6px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}
```

**Leave `OpeningDetailPage.module.css` untouched for now.** The detail page
still renders its own toast markup until Task 10; deleting its `.toast` rules
here would leave that page's toast unstyled for the rest of the branch. Task 10
removes them once the page stops using them.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- Toast` Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/Toast.tsx packages/web/src/components/shared/Toast.module.css packages/web/src/components/shared/__tests__/Toast.test.tsx
git commit -m "feat(shared): extract Toast component with Undo"
```

---

## Task 2: `useRepertoireToast` — toggle with feedback

Every star in the product needs the same behaviour: toggle, show a message,
offer Undo, auto-dismiss. Put it in one hook so the grid, the detail page and
the repertoire page cannot drift.

**Files:**

- Create: `packages/web/src/hooks/useRepertoireToast.ts`
- Test: `packages/web/src/hooks/__tests__/useRepertoireToast.test.tsx`

**Interfaces:**

- Consumes: `useRepertoire` from `packages/web/src/hooks/useRepertoire.ts` —
  `{ repertoire, isSaved, toggle, remove, count }`.
- Produces:

  ```ts
  export interface RepertoireToastState {
    message: string;
    onUndo: () => void;
  }
  export interface UseRepertoireToastReturn {
    isSaved: (fen: string) => boolean;
    count: number;
    /** Toggle + raise the toast. */
    toggleWithToast: (opening: {
      fen: string;
      name: string;
      eco: string;
      moves: string;
      complexity?: string;
    }) => void;
    /** Null when no toast is showing. */
    toast: RepertoireToastState | null;
  }
  export function useRepertoireToast(): UseRepertoireToastReturn;
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/hooks/__tests__/useRepertoireToast.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepertoireToast } from '../useRepertoireToast';

const opening = {
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'Sicilian Defence',
  eco: 'B20',
  moves: '1. e4 c5',
};

describe('useRepertoireToast', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves and raises a toast naming the destination', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));

    expect(result.current.isSaved(opening.fen)).toBe(true);
    expect(result.current.toast?.message).toBe('Added to your repertoire');
  });

  it('undo restores the previous state', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => result.current.toast!.onUndo());

    expect(result.current.isSaved(opening.fen)).toBe(false);
    expect(result.current.toast).toBeNull();
  });

  it('reports removal in the second person', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => result.current.toggleWithToast(opening));

    expect(result.current.toast?.message).toBe('Removed from your repertoire');
  });

  it('dismisses itself after 4 seconds', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => vi.advanceTimersByTime(4000));

    expect(result.current.toast).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- useRepertoireToast` Expected: FAIL — module not
found.

- [ ] **Step 3: Write the hook**

Create `packages/web/src/hooks/useRepertoireToast.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRepertoire } from './useRepertoire';

/** Long enough to read and reach the Undo button one-handed. */
const TOAST_DURATION_MS = 4000;

interface OpeningInput {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  complexity?: string;
}

export interface RepertoireToastState {
  message: string;
  onUndo: () => void;
}

export interface UseRepertoireToastReturn {
  isSaved: (fen: string) => boolean;
  count: number;
  toggleWithToast: (opening: OpeningInput) => void;
  toast: RepertoireToastState | null;
}

/**
 * Toggle-with-feedback. Every star in the product goes through this so the
 * grid, the detail page and the repertoire page cannot drift on wording or
 * timing. Undo matters because a star is a single tap on a scrolling list.
 */
export function useRepertoireToast(): UseRepertoireToastReturn {
  const { isSaved, toggle, count } = useRepertoire();
  const [toast, setToast] = useState<RepertoireToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const toggleWithToast = useCallback(
    (opening: OpeningInput) => {
      const wasSaved = isSaved(opening.fen);
      toggle(opening);

      clearTimer();
      setToast({
        message: wasSaved
          ? 'Removed from your repertoire'
          : 'Added to your repertoire',
        onUndo: () => {
          toggle(opening);
          clearTimer();
          setToast(null);
        },
      });

      timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    },
    [clearTimer, isSaved, toggle]
  );

  return { isSaved, count, toggleWithToast, toast };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- useRepertoireToast` Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useRepertoireToast.ts packages/web/src/hooks/__tests__/useRepertoireToast.test.tsx
git commit -m "feat(hooks): useRepertoireToast — toggle with undoable feedback"
```

---

## Task 3: Star on every card

Change 08, the change that closes the loop. `OpeningCard` already accepts
`showStar`, `isStarred` and `onStarClick` (`OpeningCard.tsx:39-41`) and
**nothing passes them**.

**Files:**

- Modify: `packages/web/src/components/landing/PopularOpeningsGrid.tsx:288-301`
- Test:
  `packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx`
  (create)

**Interfaces:**

- Consumes: `useRepertoireToast` from Task 2, `Toast` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create
`packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PopularOpeningsGrid } from '../PopularOpeningsGrid';

const openings = [
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    name: 'Sicilian Defence',
    eco: 'B20',
    moves: '1. e4 c5',
    src: 'eco',
  },
];

beforeEach(() => {
  localStorage.clear();
  // The grid refetches on mount; fail the fetch so it falls back to the prop.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});

describe('PopularOpeningsGrid stars', () => {
  it('lets a user save without leaving the page', async () => {
    render(
      <MemoryRouter>
        <PopularOpeningsGrid openings={openings} />
      </MemoryRouter>
    );

    const star = await screen.findByRole('button', {
      name: 'Save to repertoire',
    });
    await userEvent.click(star);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove from repertoire' })
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Added to your repertoire'
    );
  });

  it('undo puts it back', async () => {
    render(
      <MemoryRouter>
        <PopularOpeningsGrid openings={openings} />
      </MemoryRouter>
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Save to repertoire' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(
      screen.getByRole('button', { name: 'Save to repertoire' })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- PopularOpeningsGrid` Expected: FAIL — no star
button is rendered.

- [ ] **Step 3: Wire the stars**

In `packages/web/src/components/landing/PopularOpeningsGrid.tsx`, add imports:

```tsx
import { useRepertoireToast } from '../../hooks/useRepertoireToast';
import { Toast } from '../shared/Toast';
```

Inside the component, above the return:

```tsx
const { isSaved, toggleWithToast, toast } = useRepertoireToast();
```

Pass the props in the grid map:

```tsx
{
  filteredOpenings.slice(0, displayLimit).map((opening, index) => (
    <OpeningCard
      key={opening.fen || `fallback-${opening.eco}-${opening.name}-${index}`}
      opening={opening}
      showEco={true}
      showBoard={true}
      showStar={true}
      isStarred={isSaved(opening.fen)}
      onStarClick={() =>
        toggleWithToast({
          fen: opening.fen,
          name: opening.name,
          eco: opening.eco,
          moves: opening.moves,
          complexity: opening.analysis_json?.complexity,
        })
      }
      className="opening-grid-item"
    />
  ));
}
```

Render the toast just before the section's closing tag:

```tsx
{
  toast && <Toast message={toast.message} onUndo={toast.onUndo} />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- PopularOpeningsGrid` Expected: PASS, 2 tests.

- [ ] **Step 5: Check the card header layout at 390px**

Run `npm run dev:web` and inspect a card at 390px. The star sits in
`.card-header` beside the name (`OpeningCard.tsx:155-160`). Confirm the name
truncates rather than pushing the star out of the card, and that the star's tap
target is ≥44px. Fix in `simplified.css`'s `.card-header` rules if not.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/landing/PopularOpeningsGrid.tsx packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx packages/web/src/styles/simplified.css
git commit -m "feat(discover): save any opening from its card"
```

---

## Task 4: First run leads with content

Change 03. On every first visit a dashed empty box occupies prime space and
pushes Popular openings below the fold — the page leads with something the user
has not done yet.

**Files:**

- Modify: `packages/web/src/components/landing/RepertoireSection.tsx:25-43`
- Modify: `packages/web/src/components/landing/RepertoireSection.module.css`
- Test:
  `packages/web/src/components/landing/__tests__/RepertoireSection.test.tsx`
  (create)

**Interfaces:**

- Consumes: `useRepertoire`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create
`packages/web/src/components/landing/__tests__/RepertoireSection.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RepertoireSection } from '../RepertoireSection';

beforeEach(() => localStorage.clear());

const renderSection = () =>
  render(
    <MemoryRouter>
      <RepertoireSection />
    </MemoryRouter>
  );

describe('RepertoireSection empty state', () => {
  it('is a single line of guidance, not a panel', () => {
    renderSection();

    expect(
      screen.getByText('Star openings to build your repertoire.')
    ).toBeInTheDocument();
  });

  it('offers no link, because there is nowhere to go yet', () => {
    renderSection();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no heading when empty, so Popular openings leads the page', () => {
    renderSection();

    expect(
      screen.queryByRole('heading', { name: 'Your repertoire' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- RepertoireSection` Expected: FAIL — the current
empty state renders a heading, an icon and two paragraphs.

- [ ] **Step 3: Replace the empty state**

In `packages/web/src/components/landing/RepertoireSection.tsx`, return the slim
prompt when empty and skip the header entirely:

```tsx
if (count === 0) {
  return (
    <section className={styles.repertoireSection}>
      <p className={styles.emptyPrompt}>
        Star openings to build your repertoire.
      </p>
    </section>
  );
}

return (
  <section className={`${styles.repertoireSection} ${styles.hasOpenings}`}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>Your repertoire</h2>
      <span className={styles.count}>
        {count} {count === 1 ? 'opening' : 'openings'}
      </span>
    </div>

    <div className={styles.cardScroller}>
      {/* unchanged — the existing repCard map */}
    </div>
  </section>
);
```

Keep the existing `cardScroller` block exactly as it is. Note the count now
reads "6 openings", matching the mock, rather than "(6)".

- [ ] **Step 4: Replace the empty-state styles**

In `packages/web/src/components/landing/RepertoireSection.module.css`, delete
`.emptyState`, `.emptyIcon`, `.emptyTitle` and `.emptyHint`, and add:

```css
.emptyPrompt {
  margin: 0;
  padding: var(--space-3) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:frontend -- RepertoireSection` Expected: PASS, 3 tests.

- [ ] **Step 6: Verify the fold**

Run `npm run dev:web`, clear localStorage, and load `/` at 390px and at 1360px.
"Popular openings" and at least one card must be visible without scrolling. If
not, the prompt is still too tall.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/landing/RepertoireSection.tsx packages/web/src/components/landing/RepertoireSection.module.css packages/web/src/components/landing/__tests__/RepertoireSection.test.tsx
git commit -m "feat(discover): slim empty-repertoire prompt so content leads first run"
```

---

## Task 5: Persistent search in the top bar

Change 01. Search only existed in the hero; scroll into the grid and the
product's core action was gone. `TopBar` already renders a search field — it is
gated to detail pages by `isDetailPage` (`TopBar.tsx:51`).

**Files:**

- Modify: `packages/web/src/components/layout/TopBar.tsx:19-54, 169-213`
- Test: `packages/web/src/components/layout/__tests__/TopBar.test.tsx` (create)

**Interfaces:**

- Consumes: `SearchOverlay` (existing).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/layout/__tests__/TopBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../TopBar';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar />
    </MemoryRouter>
  );

describe('TopBar search', () => {
  it('is available on Discover', () => {
    renderAt('/');

    expect(
      screen.getByPlaceholderText('Search openings...')
    ).toBeInTheDocument();
  });

  it('is available on Analyse', () => {
    renderAt('/analyse');

    expect(
      screen.getByPlaceholderText('Search openings...')
    ).toBeInTheDocument();
  });

  it('is available on a detail page', () => {
    renderAt('/opening/abc');

    expect(
      screen.getByPlaceholderText('Search openings...')
    ).toBeInTheDocument();
  });

  it('no longer carries Surprise me — it belongs in the search hub', () => {
    renderAt('/opening/abc');

    expect(
      screen.queryByRole('button', { name: /surprise me/i })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- TopBar` Expected: FAIL on the first two tests
(search absent off detail pages) and the fourth (Surprise me still present).

- [ ] **Step 3: Ungate the search**

In `packages/web/src/components/layout/TopBar.tsx`, replace the gated right
slot:

```tsx
{
  /* Search is the product's core action — it lives in the bar on every
          page, not only on detail pages (UX review change 01). */
}
<div className={styles.rightSlot}>
  <TopBarSearch />
</div>;
```

- [ ] **Step 4: Remove Surprise me from the bar**

In the same file, delete the `surpriseBtn` **button** from `TopBarSearch`, and
delete the now-unused `.surpriseBtn` rules from `TopBar.module.css`.

**Keep the `handleSurpriseMe` function.** Surprise me is a browse-y action, not
navigation, so it loses its place in the bar — but Task 7 hands the behaviour to
the search hub, which calls this same function. Deleting and re-adding it would
show up as pointless churn in review.

TypeScript will not complain about the temporarily-unused function, but ESLint
may. If it does, leave the button removal and hub adoption (Task 7) in the same
commit rather than splitting them.

- [ ] **Step 5: Fix the search field width**

In `packages/web/src/components/layout/TopBar.module.css`, set `.searchField` to
`width: 240px` at desktop. The mocks specify 240px everywhere; detail pages
currently use a different width, and the
`@media (min-width: 640px) and (max-width: 900px)` override to 160px stays as
the narrow-viewport accommodation.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:frontend -- TopBar` Expected: PASS, 4 tests.

- [ ] **Step 7: Check the landing hero does not now have two searches
      competing**

Run `npm run dev:web` and load `/` at 1360px. The hero search is large and
central; the bar search is small and to the right. If they read as competing,
the bar search is too prominent — reduce its weight, do not remove it.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/components/layout/TopBar.tsx packages/web/src/components/layout/TopBar.module.css packages/web/src/components/layout/__tests__/TopBar.test.tsx
git commit -m "feat(chrome): persistent search on every page, Surprise me out of the bar"
```

---

## Task 6: One primary action in the hero

Change 02. Three unequal actions competed at the same level, and a beginner
could not tell which was primary.

**Files:**

- Modify: `packages/web/src/pages/LandingPage.tsx:163-179`
- Modify: `packages/web/src/styles/simplified.css` (`.pgn-search-link` and its
  wrapper)

**Interfaces:**

- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Add the quiet links**

In `packages/web/src/pages/LandingPage.tsx`, add a handler above the return:

```tsx
const handleSurpriseMe = async () => {
  try {
    const response = await fetch('/api/openings/random');
    const data = await response.json();
    if (data.success && data.data) {
      navigate(`/opening/${encodeURIComponent(data.data.fen)}`);
    }
  } catch {
    // A failed surprise is not worth an error state — the search is right there.
  }
};
```

Replace the `pgn-search-link-wrapper` block with both links, Surprise first:

```tsx
<div className="hero-secondary-links">
  <button className="hero-quiet-link" onClick={handleSurpriseMe}>
    Surprise me
  </button>
  <span className="hero-link-separator" aria-hidden="true">
    ·
  </span>
  <button className="hero-quiet-link" onClick={() => setIsPGNModalOpen(true)}>
    Paste a game
  </button>
</div>
```

- [ ] **Step 2: Style them as quiet links**

In `packages/web/src/styles/simplified.css`, replace the
`.pgn-search-link-wrapper` and `.pgn-search-link` rules with:

```css
.hero-secondary-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.hero-quiet-link {
  background: none;
  border: none;
  padding: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: 44px;
}

.hero-quiet-link:hover {
  color: var(--color-text-primary);
}

.hero-quiet-link:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

.hero-link-separator {
  color: var(--color-text-muted);
}
```

Neither link may be orange or filled — search is the only prominent element in
the hero.

- [ ] **Step 3: Verify**

Run: `npm run test:frontend` Expected: PASS. Update any test asserting the old
"Search by pasting PGN" label.

Run `npm run dev:web`, load `/`, click **Surprise me** and confirm it navigates
to a random opening; click **Paste a game** and confirm the PGN modal opens.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/pages/LandingPage.tsx packages/web/src/styles/simplified.css
git commit -m "feat(discover): one primary hero action, Surprise and Paste as quiet links"
```

---

## Task 7: Extract the search hub, and give it to desktop

Change 09. `SearchOverlay` already renders recents + repertoire + Surprise me on
mobile. Desktop's focused search shows nothing until you type.

**Files:**

- Create: `packages/web/src/components/shared/SearchHub.tsx`
- Create: `packages/web/src/components/shared/SearchHub.module.css`
- Modify: `packages/web/src/components/shared/SearchOverlay.tsx` (empty state
  renders `SearchHub`)
- Modify: `packages/web/src/components/layout/TopBar.tsx` (dropdown shows
  `SearchHub` when the query is empty)
- Test: `packages/web/src/components/shared/__tests__/SearchHub.test.tsx`
  (create)

**Interfaces:**

- Consumes: `getRecentOpenings` and `RecentOpening` from
  `packages/web/src/lib/recentOpenings.ts`; `useRepertoire`.
- Produces:

  ```ts
  export interface SearchHubProps {
    /** Called with the chosen opening's FEN. The caller navigates and closes. */
    onSelect: (fen: string) => void;
    /** Called when Surprise me is chosen; the caller fetches and navigates. */
    onSurprise: () => void;
    recentsLimit?: number; // default 4
    repertoireLimit?: number; // default 5
  }
  export const SearchHub: React.FC<SearchHubProps>;
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/shared/__tests__/SearchHub.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchHub } from '../SearchHub';

const saved = [
  {
    fen: 'fen-sicilian',
    name: 'Sicilian Defence',
    eco: 'B20',
    moves: '1. e4 c5',
    savedAt: 1,
  },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('chess-repertoire', JSON.stringify(saved));
  localStorage.setItem(
    'chess-recent-openings',
    JSON.stringify([
      {
        fen: 'fen-french',
        name: 'French Defence',
        eco: 'C00',
        moves: '1. e4 e6',
        viewedAt: 2,
      },
    ])
  );
});

describe('SearchHub', () => {
  it('answers "where was I?" before the user types', () => {
    render(<SearchHub onSelect={() => {}} onSurprise={() => {}} />);

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('French Defence')).toBeInTheDocument();
  });

  it('surfaces the repertoire', () => {
    render(<SearchHub onSelect={() => {}} onSurprise={() => {}} />);

    expect(screen.getByText('Your repertoire')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  it('reports the chosen opening by fen', async () => {
    const onSelect = vi.fn();
    render(<SearchHub onSelect={onSelect} onSurprise={() => {}} />);

    await userEvent.click(screen.getByText('French Defence'));

    expect(onSelect).toHaveBeenCalledWith('fen-french');
  });

  it('offers Surprise me', async () => {
    const onSurprise = vi.fn();
    render(<SearchHub onSelect={() => {}} onSurprise={onSurprise} />);

    await userEvent.click(screen.getByRole('button', { name: /surprise me/i }));

    expect(onSurprise).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- SearchHub` Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `packages/web/src/components/shared/SearchHub.tsx`. Lift the
recents/repertoire/Surprise markup out of `SearchOverlay.tsx` — read
`SearchOverlay.tsx` first and reuse its row structure and section-label classes
so the two surfaces stay identical:

```tsx
import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, Star } from 'lucide-react';
import { useRepertoire } from '../../hooks/useRepertoire';
import {
  getRecentOpenings,
  type RecentOpening,
} from '../../lib/recentOpenings';
import styles from './SearchHub.module.css';

export interface SearchHubProps {
  /** Called with the chosen opening's FEN; the caller navigates and closes. */
  onSelect: (fen: string) => void;
  onSurprise: () => void;
  recentsLimit?: number;
  repertoireLimit?: number;
}

const movesPreview = (moves: string) =>
  moves?.split(' ').slice(0, 6).join(' ') ?? '';

/**
 * The pre-typing state of every search surface: recently viewed, the user's
 * repertoire, and a way out to a random opening. Shared so the desktop
 * dropdown and the mobile overlay cannot drift.
 */
export const SearchHub: React.FC<SearchHubProps> = ({
  onSelect,
  onSurprise,
  recentsLimit = 4,
  repertoireLimit = 5,
}) => {
  const [recents, setRecents] = useState<RecentOpening[]>([]);
  const { repertoire } = useRepertoire();

  useEffect(() => {
    setRecents(getRecentOpenings().slice(0, recentsLimit));
  }, [recentsLimit]);

  const saved = repertoire.slice(0, repertoireLimit);

  return (
    <div className={styles.hub}>
      {recents.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Recent</h3>
          {recents.map((entry) => (
            <button
              key={entry.fen}
              type="button"
              className={styles.row}
              onClick={() => onSelect(entry.fen)}
            >
              <Clock size={14} className={styles.rowIcon} aria-hidden="true" />
              <span className={styles.rowText}>
                <span className={styles.rowName}>{entry.name}</span>
                <span className={styles.rowMeta}>
                  {movesPreview(entry.moves)}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {saved.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Your repertoire</h3>
          {saved.map((entry) => (
            <button
              key={entry.fen}
              type="button"
              className={styles.row}
              onClick={() => onSelect(entry.fen)}
            >
              <Star
                size={14}
                className={styles.rowIconStar}
                aria-hidden="true"
              />
              <span className={styles.rowText}>
                <span className={styles.rowName}>{entry.name}</span>
                <span className={styles.rowMeta}>
                  {movesPreview(entry.moves)}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      <button type="button" className={styles.surprise} onClick={onSurprise}>
        <Sparkles size={14} aria-hidden="true" />
        <span className={styles.rowText}>
          <span className={styles.rowName}>Surprise me</span>
          <span className={styles.rowMeta}>Jump to a random opening</span>
        </span>
      </button>
    </div>
  );
};

export default SearchHub;
```

Create `SearchHub.module.css` by copying the corresponding row, section-label
and surprise rules out of `SearchOverlay.module.css`. Keep every value
token-based. Ensure `.row` has `min-height: 44px` and a `:focus-visible`
outline.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- SearchHub` Expected: PASS, 4 tests.

- [ ] **Step 5: Adopt it in `SearchOverlay`**

In `packages/web/src/components/shared/SearchOverlay.tsx`, replace the
hand-rolled recents/repertoire/Surprise block in the empty state with:

```tsx
<SearchHub
  onSelect={(fen) => {
    navigate(`/opening/${encodeURIComponent(fen)}`);
    close();
  }}
  onSurprise={handleSurpriseMe}
/>
```

Delete the now-dead local recents state and repertoire slicing. Run the existing
overlay tests:

Run: `npm run test:frontend -- SearchOverlay` Expected: PASS. If a test asserted
markup that moved into `SearchHub`, update it to assert behaviour instead.

- [ ] **Step 6: Adopt it in the desktop dropdown**

In `packages/web/src/components/layout/TopBar.tsx`, render the hub in the
dropdown when the field is focused and the query is empty. Replace
`dropdownMarkup` with:

```tsx
const showHub = showDropdown && query.trim().length < 2;

const dropdownMarkup = showDropdown && (
  <div className={styles.dropdown}>
    {showHub ? (
      <SearchHub
        onSelect={(fen) => {
          navigate(`/opening/${encodeURIComponent(fen)}`);
          setQuery('');
          setShowDropdown(false);
        }}
        onSurprise={handleSurpriseMe}
      />
    ) : (
      <ul className={styles.results}>
        {results.map((r, i) => (
          <li
            key={`${r.fen}-${i}`}
            className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ''}`}
            onMouseDown={() => selectResult(r)}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <span className={styles.dropdownName}>{r.name}</span>
            <span className={styles.dropdownMeta}>
              {r.eco} &middot; {r.moves?.split(' ').slice(0, 6).join(' ')}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

`handleSurpriseMe` is still in `TopBarSearch` — Task 5 removed the button, not
the behaviour, and the hub now owns the affordance. Change the field's `onFocus`
to open the dropdown unconditionally:

```tsx
            onFocus={() => setShowDropdown(true)}
```

`.dropdown` was a `<ul>` and is now a `<div>` — move any `list-style` or padding
rules from `.dropdown` onto the new `.results` class in `TopBar.module.css`.

- [ ] **Step 7: Verify the dropdown is not click-blocked**

Run `npm run dev:web`, load `/`, focus the top-bar search and click a hub row.
It must navigate. If clicks pass through, check for an element with a retained
`transform` painting over it — the landing reveal animation must use
`animation-fill-mode: backwards`, never `both`/`forwards`. This exact regression
shipped once before.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/components/shared/SearchHub.tsx packages/web/src/components/shared/SearchHub.module.css packages/web/src/components/shared/__tests__/SearchHub.test.tsx packages/web/src/components/shared/SearchOverlay.tsx packages/web/src/components/layout/TopBar.tsx packages/web/src/components/layout/TopBar.module.css
git commit -m "feat(search): shared SearchHub for desktop dropdown and mobile overlay"
```

---

## Task 8: The Repertoire tab

Change 10. The prompt, the star and the tab bar all promised a repertoire; the
destination was never drawn.

**Files:**

- Create: `packages/web/src/pages/RepertoirePage.tsx`
- Create: `packages/web/src/pages/RepertoirePage.module.css`
- Modify: `packages/web/src/App.tsx:48-53`
- Test: `packages/web/src/pages/__tests__/RepertoirePage.test.tsx` (create)

**Interfaces:**

- Consumes: `useRepertoireToast` (Task 2), `Toast` (Task 1), `MiniBoard`,
  `StarButton`, `ResultBar` (Phase 0).
- Produces: route `/repertoire`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/pages/__tests__/RepertoirePage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RepertoirePage from '../RepertoirePage';

const entries = [
  {
    fen: 'fen-a',
    name: 'Sicilian Defence',
    eco: 'B20',
    moves: '1. e4 c5',
    savedAt: 100,
  },
  {
    fen: 'fen-b',
    name: 'French Defence',
    eco: 'C00',
    moves: '1. e4 e6',
    savedAt: 200,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <RepertoirePage />
    </MemoryRouter>
  );

describe('RepertoirePage', () => {
  beforeEach(() => localStorage.clear());

  it('invites the user to start when nothing is saved', () => {
    renderPage();

    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse openings' })
    ).toHaveAttribute('href', '/');
  });

  it('lists saved openings, most recently saved first', () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    const names = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(['French Defence', 'Sicilian Defence']);
  });

  it('counts what is saved', () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    expect(screen.getByText('2 openings saved.')).toBeInTheDocument();
  });

  it('unsaving from the page offers undo', async () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Remove from repertoire' })[0]
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Removed from your repertoire'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- RepertoirePage` Expected: FAIL — module not
found.

- [ ] **Step 3: Write the page**

Create `packages/web/src/pages/RepertoirePage.tsx`:

```tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MiniBoard } from '../components/shared/MiniBoard';
import { StarButton } from '../components/shared/StarButton';
import { Toast } from '../components/shared/Toast';
import { useRepertoire } from '../hooks/useRepertoire';
import { useRepertoireToast } from '../hooks/useRepertoireToast';
import { buildSiteUrl, SITE_NAME } from '../lib/siteConfig';
import styles from './RepertoirePage.module.css';

const firstMoves = (moves: string): string => {
  const matches = moves.trim().match(/(\d+\.\s*\S+(?:\s+\S+)?)/g) || [];
  return matches.slice(0, 2).join(' ');
};

/**
 * The mobile Repertoire tab. Desktop has no equivalent page by design — the
 * row on Discover is the repertoire. Sort is fixed at most recently saved
 * first; there is no manual reordering.
 */
const RepertoirePage: React.FC = () => {
  const { repertoire, count } = useRepertoire();
  const { toggleWithToast, toast } = useRepertoireToast();

  useEffect(() => {
    document.body.className = 'repertoire-page';
    return () => {
      document.body.className = '';
    };
  }, []);

  return (
    <main className={styles.page}>
      <title>{`Your repertoire — ${SITE_NAME}`}</title>
      <link rel="canonical" href={buildSiteUrl('/repertoire')} />
      {/* Personal, device-local and thin — not a page worth indexing. */}
      <meta name="robots" content="noindex" />

      {count === 0 ? (
        <div className={styles.empty}>
          <h1 className={styles.emptyTitle}>Nothing saved yet</h1>
          <p className={styles.emptyText}>
            Star an opening anywhere in the app and it lands here for quick
            access.
          </p>
          <Link to="/" className={styles.emptyCta}>
            Browse openings
          </Link>
        </div>
      ) : (
        <>
          <header className={styles.header}>
            <h1 className={styles.title}>Your repertoire</h1>
            <p className={styles.count}>
              {count} {count === 1 ? 'opening' : 'openings'} saved.
            </p>
          </header>

          <ul className={styles.list}>
            {repertoire.map((entry) => (
              <li key={entry.fen} className={styles.item}>
                <Link
                  to={`/opening/${encodeURIComponent(entry.fen)}`}
                  className={styles.itemLink}
                >
                  <MiniBoard fen={entry.fen} size={72} />
                  <span className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{entry.name}</h3>
                    <span className={styles.itemMeta}>
                      {entry.complexity && (
                        <span
                          className={`complexity-pill complexity-${entry.complexity.toLowerCase()}`}
                        >
                          {entry.complexity}
                        </span>
                      )}
                      {entry.eco && (
                        <span className="eco-pill">{entry.eco}</span>
                      )}
                    </span>
                    <span className={styles.itemMoves}>
                      {firstMoves(entry.moves)}
                    </span>
                  </span>
                  <StarButton
                    filled
                    size="sm"
                    onClick={() =>
                      toggleWithToast({
                        fen: entry.fen,
                        name: entry.name,
                        eco: entry.eco,
                        moves: entry.moves,
                        complexity: entry.complexity,
                      })
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </main>
  );
};

export default RepertoirePage;
```

Create `packages/web/src/pages/RepertoirePage.module.css` following the patterns
in `RepertoireSection.module.css`. `.emptyCta` uses the **primary** button spec
from Phase 0 (filled orange, `--radius-md`, `--color-text-inverse`). `.itemLink`
needs `min-height: 44px` and a `:focus-visible` outline. The page needs
`padding-bottom: calc(var(--bottom-tab-bar-height) + env(safe-area-inset-bottom))`
so the last row clears the tab bar.

- [ ] **Step 4: Add the route**

In `packages/web/src/App.tsx`, add the lazy import beside the others:

```tsx
const RepertoirePage = lazy(() => import('./pages/RepertoirePage'));
```

and the route before the catch-all:

```tsx
<Route path="/repertoire" element={<RepertoirePage />} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:frontend -- RepertoirePage` Expected: PASS, 4 tests.

- [ ] **Step 6: Confirm the route is excluded from the sitemap**

Run:

```bash
grep -rn "repertoire" scripts/ middleware.ts vercel.json
```

`/repertoire` is personal and `noindex`. If the sitemap generator enumerates
routes, exclude it. Also confirm `middleware.ts`'s matcher still excludes
`sitemap.xml` and `robots.txt` — dropping those exclusions has caused Search
Console "Couldn't fetch" failures before.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/pages/RepertoirePage.tsx packages/web/src/pages/RepertoirePage.module.css packages/web/src/pages/__tests__/RepertoirePage.test.tsx packages/web/src/App.tsx
git commit -m "feat(repertoire): mobile Repertoire tab with populated and empty states"
```

---

## Task 9: Three mobile tabs with a count badge

Change 06, as amended by the spec: **three** tabs, not four. The bar offered
only Discover and Analyse, so the repertoire was several taps deep.

**Files:**

- Modify: `packages/web/src/components/layout/BottomTabBar.tsx`
- Modify: `packages/web/src/components/layout/BottomTabBar.module.css`
- Test: `packages/web/src/components/layout/__tests__/BottomTabBar.test.tsx`
  (create)

**Interfaces:**

- Consumes: `useRepertoire` for the count.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/layout/__tests__/BottomTabBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomTabBar from '../BottomTabBar';

beforeEach(() => localStorage.clear());

const renderBar = () =>
  render(
    <MemoryRouter>
      <BottomTabBar />
    </MemoryRouter>
  );

describe('BottomTabBar', () => {
  it('offers three destinations', () => {
    renderBar();

    expect(screen.getByRole('link', { name: /discover/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /repertoire/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /analyse/i })).toBeInTheDocument();
  });

  it('has no Search tab — search lives in the app bar', () => {
    renderBar();

    expect(
      screen.queryByRole('link', { name: /^search$/i })
    ).not.toBeInTheDocument();
  });

  it('badges the repertoire count once something is saved', () => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'a', name: 'X', eco: 'B20', moves: '1. e4', savedAt: 1 },
      ])
    );
    renderBar();

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows no badge when the repertoire is empty', () => {
    renderBar();

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- BottomTabBar` Expected: FAIL — there is no
Repertoire tab.

- [ ] **Step 3: Rewrite the component**

Replace `packages/web/src/components/layout/BottomTabBar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { Compass, Star, BarChart3 } from 'lucide-react';
import { useRepertoire } from '../../hooks/useRepertoire';
import styles from './BottomTabBar.module.css';

const tabItems = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/repertoire', label: 'Repertoire', icon: Star, end: false },
  { to: '/analyse', label: 'Analyse', icon: BarChart3, end: false },
];

export default function BottomTabBar() {
  const { count } = useRepertoire();

  return (
    <nav className={styles.bottomTabBar}>
      {tabItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          <span className={styles.iconWrap}>
            <Icon size={20} />
            {to === '/repertoire' && count > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {count}
              </span>
            )}
          </span>
          <span className={styles.tabLabel}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

The badge is `aria-hidden` because the count is already conveyed by the
Repertoire page itself; announcing a bare number on a nav link is noise.

- [ ] **Step 4: Style the badge**

Add to `packages/web/src/components/layout/BottomTabBar.module.css`:

```css
.iconWrap {
  position: relative;
  display: inline-flex;
}

.badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--color-brand-orange);
  color: var(--color-text-inverse);
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  line-height: 16px;
  text-align: center;
}
```

Orange is correct here — the star and its count are one of the reserved uses.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:frontend -- BottomTabBar` Expected: PASS, 4 tests.

- [ ] **Step 6: Check the three-tab layout at 390px**

Run `npm run dev:web` at 390px. Three tabs share the bar width; each must be
≥44px tall and the labels must not truncate. `--bottom-tab-bar-height` stays
60px.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/layout/BottomTabBar.tsx packages/web/src/components/layout/BottomTabBar.module.css packages/web/src/components/layout/__tests__/BottomTabBar.test.tsx
git commit -m "feat(chrome): three mobile tabs with repertoire count badge"
```

---

## Task 10: Adopt the shared toast on the detail page

The detail page has its own toast state and markup. Now that Tasks 1-2 exist, it
must use them — otherwise the wording and timing will drift.

**Files:**

- Modify: `packages/web/src/pages/OpeningDetailPage.tsx:156, 960-970, 1470-1478`

**Interfaces:**

- Consumes: `Toast` (Task 1), `useRepertoireToast` (Task 2).
- Produces: nothing.

- [ ] **Step 1: Replace the local state**

In `packages/web/src/pages/OpeningDetailPage.tsx`, remove `repertoireToast`,
`setRepertoireToast` and `toastTimerRef`, and replace the `useRepertoire` usage
with:

```tsx
const { isSaved, toggleWithToast, toast } = useRepertoireToast();
```

Replace the body of `handleToggleRepertoire` with a single call:

```tsx
const handleToggleRepertoire = () => {
  toggleWithToast({
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves,
    complexity: opening.analysis_json?.complexity,
  });
};
```

- [ ] **Step 2: Render the shared toast**

Replace the inline toast JSX with:

```tsx
{
  toast && <Toast message={toast.message} onUndo={toast.onUndo} />;
}
```

The toast is no longer gated behind `isMobile` — the detail-page star deserves
the same undo affordance at every width.

- [ ] **Step 3: Delete the page's now-dead toast styles**

The page no longer renders toast markup, so remove from
`packages/web/src/pages/OpeningDetailPage.module.css`: the `.toast` rule (~line
641), `.toastStar`, `@keyframes toastIn`, and the `prefers-reduced-motion`
override for `.toast` (~line 723). Task 1 deliberately left them in place so the
page kept working mid-branch.

Confirm nothing else references them:

```bash
grep -n "toast" packages/web/src/pages/OpeningDetailPage.module.css packages/web/src/pages/OpeningDetailPage.tsx
```

Expected: no matches.

- [ ] **Step 4: Verify**

Run: `npm run test:frontend` Expected: PASS. Update any detail-page test
asserting the old toast markup or the `isMobile` gate.

Run: `npm run build` Expected: clean. TypeScript will flag any leftover
reference to the removed state.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/OpeningDetailPage.tsx packages/web/src/pages/OpeningDetailPage.module.css
git commit -m "refactor(detail): use shared toast and useRepertoireToast"
```

---

## Task 11: Phase verification and PR

**Files:**

- Modify: `.github/memory-bank/activeContext.md`
- Modify: `.github/memory-bank/progress.md`
- Modify: `design-system/` (preview cards for `Toast`, `SearchHub`, the
  repertoire list row)

- [ ] **Step 1: Run everything**

```bash
npm run test:frontend
```

Expected: PASS.

```bash
npm test -- --testPathIgnorePatterns='\.worktrees'
```

Expected: PASS.

```bash
npm run build
```

Expected: clean.

```bash
npm run format
```

- [ ] **Step 2: Walk the loop by hand**

Run `npm run dev:web`. With localStorage cleared, at **390px**:

1. Load `/` — Popular openings is visible without scrolling
2. Tap a card's star — the star fills, the toast says "Added to your
   repertoire", Undo is present
3. Wait 4s — the toast goes
4. Tap the Repertoire tab — the opening is listed, badge reads 1
5. Tap the search icon in the app bar — recents and repertoire are shown before
   typing
6. Tap Surprise me — a random opening loads

Repeat 1-2 and 5-6 at **1360px**, where the repertoire row on `/` replaces the
tab.

- [ ] **Step 3: Verify the star does not navigate**

On the grid, click precisely on a star. The page must **not** navigate to the
opening. If it does, `StarButton`'s `preventDefault` has been bypassed by a
wrapper.

- [ ] **Step 4: Update the design-system bundle**

Add preview cards under `design-system/project/preview/` for `Toast` (with and
without Undo), `SearchHub`, and the repertoire list row. Follow the format in
`design-system/README.md`. This is the CLAUDE.md lockstep requirement and the PR
is incomplete without it.

- [ ] **Step 5: Update the memory bank**

Replace the current-task section of `.github/memory-bank/activeContext.md` (keep
it under 50 lines; move the displaced task to `archive.md`). Add one line to
`.github/memory-bank/progress.md` (under 100 lines).

- [ ] **Step 6: Screenshots**

Capture `/`, `/repertoire` (populated and empty) and an opening detail page at
1360px and 390px. Attach to the PR.

- [ ] **Step 7: Open the PR**

```bash
git add design-system .github/memory-bank
git commit -m "docs: design-system lockstep + memory bank for UX phase 1"
git push -u origin ux/phase-1-discover
gh pr create --base feat/ux-review --title "UX phase 1: Discover — close the loop" --body "$(cat <<'EOF'
Star on every card, slim empty-repertoire prompt, persistent top-bar search,
shared SearchHub, /repertoire route, three mobile tabs.

The core loop — find, save, revisit — is now completable from Discover without
opening a detail page.

Implements Phase 1 of docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md

## Verification
- Frontend + backend suites green, clean build
- Loop walked by hand at 390px and 1360px
- Screenshots attached

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Base is `feat/ux-review`.** A PR into `main` is wrong.

---

## Phase 1 Definition of Done

- [ ] A user can save an opening from the Discover grid without opening a detail
      page
- [ ] Every save is confirmed by a toast offering Undo
- [ ] `useRepertoireToast` is the only place that decides toast wording or
      timing
- [ ] With an empty repertoire, Popular openings is above the fold at 390px and
      1360px
- [ ] Search is present in the top bar on `/`, `/analyse` and `/opening/*`
- [ ] "Surprise me!" no longer appears in the top bar; "Surprise me" is a quiet
      hero link and a hub row
- [ ] The hero has exactly one prominent element: the search field
- [ ] Focusing search shows recents + repertoire + Surprise me before any
      typing, on both breakpoints
- [ ] `/repertoire` exists with populated and empty states, `noindex`, excluded
      from the sitemap
- [ ] Three mobile tabs — Discover · Repertoire · Analyse — with a count badge
      and no Search tab
- [ ] Clicking a star never navigates the card
- [ ] Frontend and backend suites green, clean build
- [ ] Design-system preview cards added for `Toast`, `SearchHub` and the
      repertoire row
- [ ] PR is open against `feat/ux-review`, not `main`
