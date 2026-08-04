# UX Review Phase 0 — Systemic Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one button spec, one repertoire name, sentence-case copy,
self-labelling result bars and the accessibility fixes across the whole product,
with no behaviour change — so every later phase inherits a consistent base.

**Architecture:** Mostly CSS and copy edits against existing tokens, plus one
component extraction (`ResultBar`) because change 05 touches four duplicated
copies of the same win/draw/loss markup. No new routes, no new data, no new
dependencies.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules (new work) over a
legacy global stylesheet (`packages/web/src/styles/simplified.css`), Vitest +
@testing-library/react for frontend tests, Prettier for formatting.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
§5 Phase 0 **Visual reference:**
`design-system/handoffs/2026-07-27-ux-review/Opening Book - Proposed.dc.html`

## Global Constraints

- **Branch:** work on `ux/phase-0-systemic`, branched from `feat/ux-review`.
  Open the PR **into `feat/ux-review`**, never into `main`.
- **Tokens only.** Never write a raw hex value. Every colour, space, radius and
  shadow comes from `packages/web/src/styles/simplified.css`.
- **Button spec.** Primary = `background: var(--color-brand-orange)`,
  `color: var(--color-text-inverse)`, `border-radius: var(--radius-md)`.
  Secondary = transparent background, neutral border. Tertiary = neutral
  surface, neutral text, **no orange at all**.
- **Orange is reserved** for primary CTAs, active nav, the star, and the word
  "Book" in the hero. Never for hover, emphasis, data values or decoration.
- **Result colours** are `--color-result-white`, `--color-result-draw`,
  `--color-result-black`. Never substitute generic chart colours.
- **Sentence case** for all headings. Title Case is reserved for proper nouns
  and ECO codes.
- **British spelling**: analyse, colour, practise.
- **Repertoire naming**: "Your repertoire" for headings, "Repertoire" for tab
  and app bar, "Added to your repertoire" for the toast. "My repertoire" and
  "Saved" must not survive.
- **Focus outline** on every interactive control:
  `outline: 2px solid var(--color-brand-orange); outline-offset: 2px`. Never the
  browser default.
- **Design-system lockstep** (CLAUDE.md): if you change a token, change it in
  **both** `packages/web/src/styles/simplified.css` and
  `design-system/project/colors_and_type.css` in the same commit.
- **No `console.log`** in production code.
- **Prettier**: run `npm run format` before committing. Ignore local
  `npm run format:check` line-ending failures — with `core.autocrlf=true` the
  working tree is CRLF while `.prettierrc` sets `endOfLine: lf`, so dozens of
  files false-fail locally and are clean on CI. Trust CI.
- **Do not change behaviour in this phase.** If a step tempts you to move, add
  or remove a feature, stop — it belongs to a later phase.

---

## File Structure

**Created:**

| File                                                               | Responsibility                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `packages/web/src/components/shared/ResultBar.tsx`                 | The one win/draw/loss segmented bar + its labels. Sole owner of result-bar markup. |
| `packages/web/src/components/shared/ResultBar.module.css`          | Styles for the above.                                                              |
| `packages/web/src/components/shared/__tests__/ResultBar.test.tsx`  | Tests for label text, segment widths, and the omit-when-absent rule.               |
| `packages/web/src/components/shared/__tests__/StarButton.test.tsx` | Tests for `aria-pressed` and the click guard.                                      |

**Modified:**

| File                                                                   | Change                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/web/src/components/shared/OpeningCard.tsx`                   | Both variants consume `ResultBar` instead of inlining bar markup.                                              |
| `packages/web/src/components/shared/StarButton.tsx`                    | Add `aria-pressed`.                                                                                            |
| `packages/web/src/components/landing/RepertoireSection.tsx`            | "My repertoire" → "Your repertoire".                                                                           |
| `packages/web/src/pages/OpeningDetailPage.tsx`                         | Toast strings → "Added to your repertoire" / "Removed from your repertoire". Practice button to primary class. |
| `packages/web/src/pages/LandingPage.tsx`                               | PGN link label → "Paste a game".                                                                               |
| `packages/web/src/pages/AnalyseGamesPage.tsx`                          | SEO title → sentence case.                                                                                     |
| `packages/web/src/components/personal/PersonalOpeningStats.tsx`        | Hero `h1` → sentence case.                                                                                     |
| `packages/web/src/components/personal/PersonalOpeningStats.module.css` | `.analyseBtn` radius pill → `--radius-md`; dashboard mobile CTA colour token.                                  |
| `packages/web/src/styles/simplified.css`                               | `.load-more-btn` → tertiary; `.section-title::after` gradient removed; practice button primary spec.           |
| `design-system/project/colors_and_type.css`                            | Lockstep, only if a token changes.                                                                             |

---

## Task 1: Extract the shared `ResultBar`

Change 05: bars must read "White 31% · Draw 39% · Black 30%" instead of "W 31% /
D 39% / B 30%". The markup is currently duplicated in `OpeningCard`'s card
variant (`OpeningCard.tsx:180-202`) and its list-item variant
(`OpeningCard.tsx:113-135`). Extract once, then change the labels in one place.

**Files:**

- Create: `packages/web/src/components/shared/ResultBar.tsx`
- Create: `packages/web/src/components/shared/ResultBar.module.css`
- Test: `packages/web/src/components/shared/__tests__/ResultBar.test.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:

  ```ts
  export interface ResultStats {
    white: number; // whole percent, 0-100
    draw: number;
    black: number;
  }
  export interface ResultBarProps {
    stats: ResultStats | null;
    /** Omit the "White 31% · Draw 39% · Black 30%" line, bar only. */
    hideLabels?: boolean;
    className?: string;
  }
  export const ResultBar: React.FC<ResultBarProps>;
  ```

  Returns `null` when `stats` is `null` — callers must not guard.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/shared/__tests__/ResultBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultBar } from '../ResultBar';

describe('ResultBar', () => {
  it('names each segment so the bar needs no legend', () => {
    render(<ResultBar stats={{ white: 31, draw: 39, black: 30 }} />);

    expect(screen.getByText('White 31%')).toBeInTheDocument();
    expect(screen.getByText('Draw 39%')).toBeInTheDocument();
    expect(screen.getByText('Black 30%')).toBeInTheDocument();
  });

  it('renders nothing when stats are absent rather than inventing numbers', () => {
    const { container } = render(<ResultBar stats={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('sizes each segment to its percentage', () => {
    const { container } = render(
      <ResultBar stats={{ white: 50, draw: 20, black: 30 }} />
    );
    const segments = container.querySelectorAll('[data-segment]');

    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveStyle({ width: '50%' });
    expect(segments[1]).toHaveStyle({ width: '20%' });
    expect(segments[2]).toHaveStyle({ width: '30%' });
  });

  it('can render the bar without labels', () => {
    render(<ResultBar stats={{ white: 31, draw: 39, black: 30 }} hideLabels />);

    expect(screen.queryByText('White 31%')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- ResultBar` Expected: FAIL —
`Failed to resolve import "../ResultBar"`.

- [ ] **Step 3: Write the component**

Create `packages/web/src/components/shared/ResultBar.tsx`:

```tsx
import React from 'react';
import styles from './ResultBar.module.css';

export interface ResultStats {
  /** Whole percent, 0-100. */
  white: number;
  draw: number;
  black: number;
}

export interface ResultBarProps {
  /** Real stats or null. Never synthesise numbers for a data product. */
  stats: ResultStats | null;
  /** Bar only, no "White 31% · Draw 39% · Black 30%" line. */
  hideLabels?: boolean;
  className?: string;
}

/**
 * The one win/draw/loss bar. Segments name themselves ("White 31%") so the
 * bar needs no legend — the single cheapest high-value change in the 2026-07
 * UX review.
 */
export const ResultBar: React.FC<ResultBarProps> = ({
  stats,
  hideLabels = false,
  className = '',
}) => {
  if (!stats) return null;

  return (
    <div className={`${styles.resultBar} ${className}`}>
      <div className={styles.track} aria-hidden="true">
        <div
          data-segment="white"
          className={styles.white}
          style={{ width: `${stats.white}%` }}
        />
        <div
          data-segment="draw"
          className={styles.draw}
          style={{ width: `${stats.draw}%` }}
        />
        <div
          data-segment="black"
          className={styles.black}
          style={{ width: `${stats.black}%` }}
        />
      </div>
      {!hideLabels && (
        <div className={styles.labels}>
          <span className={styles.labelWhite}>White {stats.white}%</span>
          <span className={styles.labelDraw}>Draw {stats.draw}%</span>
          <span className={styles.labelBlack}>Black {stats.black}%</span>
        </div>
      )}
    </div>
  );
};

export default ResultBar;
```

Create `packages/web/src/components/shared/ResultBar.module.css`:

```css
.resultBar {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}

.track {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  gap: 2px;
}

.white {
  background-color: var(--color-result-white);
}

.draw {
  background-color: var(--color-result-draw);
}

.black {
  background-color: var(--color-result-black);
}

.labels {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.labelWhite {
  color: var(--color-result-white);
}

.labelDraw {
  color: var(--color-text-muted);
}

.labelBlack {
  color: var(--color-result-black);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- ResultBar` Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/ResultBar.tsx packages/web/src/components/shared/ResultBar.module.css packages/web/src/components/shared/__tests__/ResultBar.test.tsx
git commit -m "feat(shared): add self-labelling ResultBar component"
```

---

## Task 2: Adopt `ResultBar` in `OpeningCard`

**Files:**

- Modify: `packages/web/src/components/shared/OpeningCard.tsx` (list-item
  variant at lines 113-135; card variant at lines 180-202)
- Test: `packages/web/src/components/shared/__tests__/OpeningCard.test.tsx`
  (create)

**Interfaces:**

- Consumes: `ResultBar`, `ResultStats` from Task 1.
- Produces: no API change to `OpeningCard`. Its existing props are unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/shared/__tests__/OpeningCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OpeningCard } from '../OpeningCard';

const opening = {
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'Sicilian Defence',
  eco: 'B20',
  moves: '1. e4 c5',
  src: 'eco',
  white_win_rate: 0.31,
  draw_rate: 0.39,
  black_win_rate: 0.3,
};

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <OpeningCard opening={opening} {...props} />
    </MemoryRouter>
  );

describe('OpeningCard result bars', () => {
  it('names the segments on the card variant', () => {
    renderCard();

    expect(screen.getByText('White 31%')).toBeInTheDocument();
    expect(screen.getByText('Draw 39%')).toBeInTheDocument();
    expect(screen.getByText('Black 30%')).toBeInTheDocument();
  });

  it('names the segments on the list-item variant', () => {
    renderCard({ variant: 'list-item' });

    expect(screen.getByText('White 31%')).toBeInTheDocument();
  });

  it('omits the bar entirely when rates are missing', () => {
    render(
      <MemoryRouter>
        <OpeningCard
          opening={{
            ...opening,
            white_win_rate: undefined,
            draw_rate: undefined,
            black_win_rate: undefined,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/White \d+%/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- OpeningCard` Expected: FAIL — the card renders "W
31%", not "White 31%".

- [ ] **Step 3: Replace both inline bars**

In `packages/web/src/components/shared/OpeningCard.tsx`, add the import beside
the existing ones:

```tsx
import { ResultBar } from './ResultBar';
```

Replace the list-item variant's stats block (the
`{gameStats && (<div className="list-item-stats">…</div>)}` expression) with:

```tsx
{
  gameStats && <ResultBar stats={gameStats} className="list-item-stats" />;
}
```

Replace the card variant's stats block (the
`{gameStats && (<div className="card-winrate">…</div>)}` expression) with:

```tsx
{
  gameStats && <ResultBar stats={gameStats} className="card-winrate" />;
}
```

Leave `getGameStats()` exactly as it is — it already returns `null` rather than
fabricating numbers, which is the rule.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- OpeningCard` Expected: PASS, 3 tests.

- [ ] **Step 5: Remove the now-dead CSS**

In `packages/web/src/styles/simplified.css`, delete the `.segmented-bar`,
`.bar-segment`, `.white-segment`, `.draw-segment`, `.black-segment`,
`.winrate-labels`, `.list-item-stat-labels`, `.white-label`, `.draw-label` and
`.black-label` rules **only if** nothing else references them.

Verify first:

```bash
grep -rn "segmented-bar\|white-segment\|winrate-labels\|white-label" packages/web/src --include=*.tsx
```

Expected: no matches outside tests. If a match remains, leave that class alone
and note it in the PR.

- [ ] **Step 6: Run the full frontend suite**

Run: `npm run test:frontend` Expected: PASS. If a snapshot or an existing test
asserts "W 31%", update it to "White 31%" — the new copy is correct.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/shared/OpeningCard.tsx packages/web/src/components/shared/__tests__/OpeningCard.test.tsx packages/web/src/styles/simplified.css
git commit -m "refactor(card): use shared ResultBar with self-labelling segments"
```

---

## Task 3: Star button accessibility

**Files:**

- Modify: `packages/web/src/components/shared/StarButton.tsx:31-36`
- Test: `packages/web/src/components/shared/__tests__/StarButton.test.tsx`
  (create)

**Interfaces:**

- Consumes: nothing.
- Produces: `StarButton` gains `aria-pressed`. Props are unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/shared/__tests__/StarButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarButton } from '../StarButton';

describe('StarButton', () => {
  it('exposes its saved state to assistive technology', () => {
    const { rerender } = render(
      <StarButton filled={false} onClick={() => {}} />
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<StarButton filled onClick={() => {}} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('has an accessible name that reflects the action', () => {
    render(<StarButton filled={false} onClick={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'Save to repertoire' })
    ).toBeInTheDocument();
  });

  it('does not navigate the card it sits inside', () => {
    const onClick = vi.fn();
    render(
      <a href="/somewhere">
        <StarButton filled={false} onClick={onClick} />
      </a>
    );

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getByRole('button').dispatchEvent(event);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- StarButton` Expected: FAIL on the first test —
`aria-pressed` is absent.

- [ ] **Step 3: Add the attribute**

In `packages/web/src/components/shared/StarButton.tsx`, add `aria-pressed` to
the `<button>`:

```tsx
    <button
      className={`${styles.starButton} ${className}`}
      onClick={handleClick}
      aria-label={filled ? 'Remove from repertoire' : 'Save to repertoire'}
      aria-pressed={filled}
      type="button"
    >
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- StarButton` Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/StarButton.tsx packages/web/src/components/shared/__tests__/StarButton.test.tsx
git commit -m "fix(a11y): expose star saved state via aria-pressed"
```

---

## Task 4: One button spec

Findings 1 and 5. Today the same job is drawn five ways, and the effect is
inverted priority: `Load more` (pagination) looks stronger than
`Practice this opening` (the most valuable action in the product).

**Files:**

- Modify: `packages/web/src/styles/simplified.css:2446-2471` (`.load-more-btn`)
- Modify:
  `packages/web/src/components/personal/PersonalOpeningStats.module.css:350-377`
  (`.analyseBtn`)
- Modify: `packages/web/src/styles/simplified.css` (`.practice-toggle-btn`)

**Interfaces:**

- Consumes: nothing.
- Produces: no code API. Visual contract only.

- [ ] **Step 1: Make `Load more` tertiary**

Replace the `.load-more-btn` rules in `packages/web/src/styles/simplified.css`
(currently orange text, orange border, `999px` radius) with:

```css
.load-more-btn {
  background-color: var(--surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-8);
  cursor: pointer;
  transition: var(--transition-base);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.load-more-btn:hover {
  background-color: var(--surface-overlay);
  transform: translateY(-1px);
}

.load-more-btn:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}
```

Then delete the `@media (max-width: 767px)` override for `.load-more-btn` that
immediately follows it — the base rule now already carries neutral colours and
an 8px radius, so the override only needs to keep the full-width behaviour:

```css
@media (max-width: 767px) {
  .load-more-btn {
    width: 100%;
  }
}
```

- [ ] **Step 2: De-pill the Analyse CTA**

In `packages/web/src/components/personal/PersonalOpeningStats.module.css`,
change one line in `.analyseBtn`:

```css
border-radius: var(--radius-md);
```

(was `var(--radius-full)`). Pill shape now survives only on the platform toggle,
which is what the system intends.

- [ ] **Step 3: Make Practice primary**

Find `.practice-toggle-btn` in `packages/web/src/styles/simplified.css` and give
it the primary spec:

```css
.practice-toggle-btn {
  background-color: var(--color-brand-orange);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-bold);
}

.practice-toggle-btn:hover {
  background-color: var(--color-brand-orange-hover);
  box-shadow: var(--shadow-brand);
  transform: translateY(-1px);
}

.practice-toggle-btn:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}
```

Keep any existing layout properties on the class (display, gap, padding) — only
the colour, border, radius and weight are being specified here.

- [ ] **Step 4: Find any remaining white-on-orange**

Run:

```bash
grep -rn "#fff\|#ffffff\|white" packages/web/src --include=*.module.css --include=simplified.css
```

For every hit that sets text on an orange background, replace it with
`var(--color-text-inverse)`. The known one is the dashboard's mobile CTA in
`PersonalOpeningStats.module.css`. Near-black on `#e85d04` is both on-system and
the higher-contrast pairing.

- [ ] **Step 5: Verify nothing broke**

Run: `npm run test:frontend` Expected: PASS.

Run: `npm run build` Expected: clean TypeScript build.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/styles/simplified.css packages/web/src/components/personal/PersonalOpeningStats.module.css
git commit -m "style(buttons): one button spec — Practice primary, Load more tertiary"
```

---

## Task 5: Remove the last decorative orange

Finding 9. `.section-title::after` draws a 60px orange gradient rule under
section headings. It is the only remaining use of orange as decoration rather
than action, which the system's "bookmark ribbon, not wallpaper" rule prohibits.

**Files:**

- Modify: `packages/web/src/styles/simplified.css:2233-2243`

- [ ] **Step 1: Delete the rule**

Remove the entire `.section-title::after` block from
`packages/web/src/styles/simplified.css`:

```css
.section-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-brand-orange) 0%,
    var(--accent-a30) 100%
  );
  border-radius: 2px;
}
```

Also remove the now-pointless `position: relative;` and `display: inline-block;`
from `.section-title` **only if** no other rule depends on them. Check with:

```bash
grep -n "section-title" packages/web/src/styles/simplified.css
```

If `.section-title--sub::after` exists and already sets `content: none`, delete
that override too — it now has nothing to override.

- [ ] **Step 2: Check for other decorative orange**

Run:

```bash
grep -n "linear-gradient" packages/web/src/styles/simplified.css
```

Review each hit. Gradients on **data** (the popularity bar) and on **surfaces**
(card backgrounds) stay. Gradients that decorate a **heading** go. Record in the
PR description which ones you kept and why.

- [ ] **Step 3: Verify**

Run: `npm run test:frontend` Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/styles/simplified.css
git commit -m "style: remove decorative orange heading rule"
```

---

## Task 6: One name for the repertoire, and sentence-case copy

Findings 4 and 8. Four names for one feature; the Analyse hero is the only Title
Case heading in the product and it is the largest text on the screen.

**Files:**

- Modify: `packages/web/src/components/landing/RepertoireSection.tsx:21`
- Modify: `packages/web/src/pages/OpeningDetailPage.tsx:967`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.tsx:254`
- Modify: `packages/web/src/pages/AnalyseGamesPage.tsx:11`
- Modify: `packages/web/src/pages/LandingPage.tsx:176`

**Interfaces:**

- Consumes: nothing.
- Produces: the strings later phases assert against. Phase 1's toast test
  expects `Added to your repertoire` exactly.

- [ ] **Step 1: Rename the repertoire heading**

In `packages/web/src/components/landing/RepertoireSection.tsx`, change the
section title:

```tsx
<h2 className={styles.sectionTitle}>Your repertoire</h2>
```

- [ ] **Step 2: Fix the toast strings**

In `packages/web/src/pages/OpeningDetailPage.tsx`, change the toast message
line:

```tsx
setRepertoireToast(
  saved ? 'Removed from your repertoire' : 'Added to your repertoire'
);
```

- [ ] **Step 3: Sentence-case the Analyse hero**

In `packages/web/src/components/personal/PersonalOpeningStats.tsx`:

```tsx
<h1 className={styles.heroTitle}>Analyse your games</h1>
```

In `packages/web/src/pages/AnalyseGamesPage.tsx`:

```tsx
const seoTitle = `Analyse your games — ${SITE_NAME}`;
```

- [ ] **Step 4: Plain-language the PGN link**

In `packages/web/src/pages/LandingPage.tsx`, change the link label:

```tsx
<button className="pgn-search-link" onClick={() => setIsPGNModalOpen(true)}>
  Paste a game
</button>
```

PGN is an acronym most players will not know; it belongs inside the panel the
link opens, not on the link.

- [ ] **Step 5: Sweep for survivors**

Run:

```bash
grep -rn "My repertoire\|Analyse Your Games\|pasting PGN\|Saved to repertoire" packages/web/src
```

Expected: no matches outside test files. Update any test that asserts an old
string — the new copy is correct. Do **not** rename the `chess-repertoire`
localStorage key or the `useRepertoire` API; those are internal and renaming
them would silently orphan every user's saved openings.

- [ ] **Step 6: Sentence-case audit**

Run:

```bash
grep -rn "<h1\|<h2\|<h3" packages/web/src --include=*.tsx
```

Read each heading. Any that is Title Case and is not a proper noun or an ECO
code becomes sentence case. Known offenders to check: "Show All Openings" in
`PopularOpeningsGrid.tsx`, and the ECO category labels ("All Openings", "Flank
Openings (A)") — those become "All openings", "Flank openings (A)".

- [ ] **Step 7: Verify**

Run: `npm run test:frontend` Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src
git commit -m "copy: one repertoire name, sentence case throughout"
```

---

## Task 7: Focus outlines and hit targets

**Files:**

- Modify: `packages/web/src/styles/simplified.css`
- Modify: any `.module.css` with an interactive class lacking `:focus-visible`

- [ ] **Step 1: Find controls with no focus style**

Run:

```bash
grep -rln "cursor: pointer" packages/web/src --include=*.css
```

For each file, check whether every interactive class has a `:focus-visible`
rule. `TopBar.module.css` and `StarButton.module.css` already do — use them as
the reference.

- [ ] **Step 2: Add the standard outline where missing**

For each control missing one:

```css
.someControl:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}
```

Never `outline: none` without a replacement. Never rely on the browser default.

- [ ] **Step 3: Check mobile hit targets**

Run the dev server and inspect on a 390px viewport:

```bash
npm run dev:web
```

Every tappable control must be ≥44px in its smallest dimension. Known candidates
to measure: the star button at `size="sm"` (16px icon — the _button_ needs the
padding, not the icon), the mobile nav chevrons on the detail page, and the
filter pills.

Where a control is too small, add padding rather than growing the icon:

```css
.smallControl {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 4: Verify**

Run: `npm run test:frontend` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src
git commit -m "fix(a11y): focus outlines on every control, 44px mobile targets"
```

---

## Task 8: Design-system lockstep and phase verification

CLAUDE.md requires the `design-system/` bundle to move with production code in
the same PR.

**Files:**

- Modify: `design-system/project/colors_and_type.css` (only if a token changed)
- Create: `design-system/project/preview/result-bar.html` (preview card for the
  new component)
- Modify: `.github/memory-bank/activeContext.md`
- Modify: `.github/memory-bank/progress.md`

- [ ] **Step 1: Check whether any token changed**

Run:

```bash
git diff feat/ux-review -- packages/web/src/styles/simplified.css | grep "^[+-].*--[a-z]"
```

If the diff shows a changed custom property **definition** (not a usage), make
the same change in `design-system/project/colors_and_type.css`. Phase 0 should
not need any token change — if it does, that is worth flagging in the PR.

- [ ] **Step 2: Add a preview card for `ResultBar`**

Read `design-system/README.md` for the preview-card format, then add one for
`ResultBar` under `design-system/project/preview/` following the existing cards'
structure. It must show the labelled state and demonstrate the three result
colours.

- [ ] **Step 3: Run the full verification set**

```bash
npm run test:frontend
```

Expected: PASS.

```bash
npm test -- --testPathIgnorePatterns='\.worktrees'
```

Expected: PASS. The ignore pattern is required — `.worktrees/` tests fail with
module-resolution errors and are not yours.

```bash
npm run build
```

Expected: clean.

```bash
npm run format
```

Expected: files rewritten in place. Do **not** run `format:check` and act on its
output — see Global Constraints.

- [ ] **Step 4: Capture before/after screenshots**

Screenshot at 1360px and 390px for: Discover (`/`), an opening detail page, and
Analyse (`/analyse`). Attach them to the PR. Phase 0 changes nothing functional,
so the diff should be **only**: bar labels, button colours and radii, the
missing heading rule, and the copy changes. Anything else in the screenshots is
a bug you introduced.

- [ ] **Step 5: Update the memory bank**

In `.github/memory-bank/activeContext.md`, replace the current-task section (do
not append — the file must stay under 50 lines) with a Phase 0 summary. Move the
displaced previous task to `.github/memory-bank/archive.md`.

In `.github/memory-bank/progress.md`, add one line for Phase 0. The file must
stay under 100 lines.

- [ ] **Step 6: Commit and open the PR**

```bash
git add design-system .github/memory-bank
git commit -m "docs: design-system lockstep + memory bank for UX phase 0"
git push -u origin ux/phase-0-systemic
gh pr create --base feat/ux-review --title "UX phase 0: systemic pass" --body "$(cat <<'EOF'
One button spec, one repertoire name, sentence-case copy, self-labelling result
bars, focus outlines. No behaviour change.

Implements Phase 0 of docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md

## Verification
- Frontend + backend suites green
- Clean TypeScript build
- Screenshots at 1360 and 390 for Discover, detail and Analyse attached

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Note the `--base feat/ux-review`.** A PR into `main` is wrong and must be
closed and reopened against the integration branch.

---

## Phase 0 Definition of Done

- [ ] Every button in the product is primary, secondary or tertiary per the spec
      — no fourth variant survives
- [ ] `Practice` reads as more important than `Load more`, not less
- [ ] No orange appears anywhere it is not a primary CTA, active nav, the star,
      or the word "Book"
- [ ] Every result bar reads "White N% · Draw N% · Black N%"
- [ ] `ResultBar` is the only component rendering result-bar markup
- [ ] `grep -rn "My repertoire\|Analyse Your Games\|pasting PGN" packages/web/src`
      returns nothing outside tests
- [ ] Every interactive control has an orange focus outline
- [ ] `aria-pressed` on `StarButton`
- [ ] Frontend and backend suites green, clean build
- [ ] Screenshots show only the intended visual deltas
- [ ] PR is open against `feat/ux-review`, not `main`
