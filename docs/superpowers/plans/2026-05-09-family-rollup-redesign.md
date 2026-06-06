# Family Rollup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1 family-rollup UI on the Analyse page with the
editorial leader-dot row treatment, inline-link toolbar, and footnote-strip
"Other" bucket — committed to the Warm Editorial Dark brand and using only
existing design tokens.

**Architecture:** Bottom-up assembly. Refactor the data layer
(`familyAggregation` returns `{rows, uncategorised}` with best/weak fields and a
sortMode). Add a small motion hook (`useCountUp`). Build a shared
`InlineLinkSwitch` primitive that powers two toolbars (`AnalyseToolbar` for
VIEW, `SectionToolbar` for ORDER). Build `FamilyRow` (leader-dot row) and
`UncategorisedFootnote`. Wire it all into `PersonalOpeningStats.tsx`, deleting
the broken Phase 1 family-rollup CSS block.

**Tech Stack:** React 18 + TypeScript, CSS Modules, Vitest + React Testing
Library, hand-rolled inline SVG icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-09-family-rollup-redesign.md`

**Branch:** `feature/opening-family-rollups` (continues existing work; the spec
and bundle adoption are already committed).

**Test command throughout:** `npm run test:frontend` (Vitest). Run a single file
via `npm --workspace=packages/web exec vitest run -- <path>`.

---

## Pre-flight

Before starting Task 1:

- [ ] **Confirm branch and clean tree.**

  ```bash
  git rev-parse --abbrev-ref HEAD     # → feature/opening-family-rollups
  git status --short                   # → clean (or only ignorable noise)
  npm run test:frontend                # → existing 30+ tests pass
  ```

- [ ] **Read the spec end-to-end** at
      `docs/superpowers/specs/2026-05-09-family-rollup-redesign.md`. The
      "Aesthetic direction" section is non-negotiable; deviating during
      implementation produces the wrong surface.

- [ ] **Skim `design-system/README.md`** for the brand rules — orange is a
      bookmark ribbon (CTAs only), result colours are mandatory, hover never
      colour-shifts to orange, sentence case for headings, British English. The
      redesign relies on `--color-result-white-text` and
      `--color-result-black-text` for the WR% tinting.

---

## Task 1: `familyAggregation.ts` — return shape, best/weak, sortMode

**Files:**

- Modify: `packages/web/src/components/personal/familyAggregation.ts`
- Modify:
  `packages/web/src/components/personal/__tests__/familyAggregation.test.ts`

This is the data-layer refactor. The function changes its return shape from
`FamilyRollupRow[]` to
`{ rows: FamilyRollupRow[]; uncategorised: UncategorisedSummary | null }`, adds
`best_variation` / `weak_variation` per family, and accepts a `sortMode`
parameter.

- [ ] **Step 1: Update the existing test file to expect the new shape (failing
      tests).**

  Replace the contents of
  `packages/web/src/components/personal/__tests__/familyAggregation.test.ts`
  with:

  ```ts
  import { describe, expect, test } from 'vitest';
  import {
    groupByFamily,
    type OpeningAggInput,
    type FamilyMeta,
    type SortMode,
  } from '../familyAggregation';

  const families: Record<string, FamilyMeta> = {
    sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
    french: { id: 'french', display_name: 'French Defense' },
  };

  const ag = (overrides: Partial<OpeningAggInput>): OpeningAggInput => ({
    key: 'unset',
    name: 'unset',
    eco: 'X00',
    family_id: 'sicilian',
    family_display_name: 'Sicilian Defense',
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    ...overrides,
  });

  describe('groupByFamily', () => {
    test('returns { rows, uncategorised } shape', () => {
      const result = groupByFamily([], families);
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('uncategorised');
      expect(result.rows).toEqual([]);
      expect(result.uncategorised).toBeNull();
    });

    test('sums games/wins/draws/losses per family', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'k1',
          family_id: 'sicilian',
          games: 5,
          wins: 3,
          draws: 1,
          losses: 1,
        }),
        ag({
          key: 'k2',
          family_id: 'sicilian',
          games: 2,
          wins: 0,
          draws: 1,
          losses: 1,
        }),
        ag({
          key: 'k3',
          family_id: 'french',
          games: 4,
          wins: 2,
          draws: 0,
          losses: 2,
        }),
      ];
      const { rows } = groupByFamily(input, families);
      const sicilian = rows.find((r) => r.family_id === 'sicilian')!;
      expect(sicilian.games).toBe(7);
      expect(sicilian.wins).toBe(3);
      expect(sicilian.draws).toBe(2);
      expect(sicilian.losses).toBe(2);
      expect(sicilian.variation_count).toBe(2);
      expect(sicilian.score).toBeCloseTo((3 + 0.5 * 2) / 7);
    });

    test('separates uncategorised into its own field, never in rows', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'k1',
          family_id: undefined as unknown as string,
          family_display_name: undefined,
          games: 3,
          wins: 1,
          draws: 1,
          losses: 1,
        }),
        ag({
          key: 'k2',
          family_id: 'uncategorised',
          family_display_name: null,
          games: 2,
          wins: 0,
          draws: 1,
          losses: 1,
        }),
        ag({
          key: 'k3',
          family_id: 'sicilian',
          games: 4,
          wins: 2,
          draws: 1,
          losses: 1,
        }),
      ];
      const { rows, uncategorised } = groupByFamily(input, families);
      expect(rows.map((r) => r.family_id)).toEqual(['sicilian']);
      expect(uncategorised).not.toBeNull();
      expect(uncategorised!.games).toBe(5);
      expect(uncategorised!.wins).toBe(1);
      expect(uncategorised!.draws).toBe(2);
      expect(uncategorised!.losses).toBe(2);
      expect(uncategorised!.variation_count).toBe(2);
      expect(uncategorised!.win_rate).toBeCloseTo((1 + 0.5 * 2) / 5);
    });

    test('uncategorised is null when no uncategorised openings present', () => {
      const input: OpeningAggInput[] = [
        ag({ key: 'k1', family_id: 'sicilian', games: 3, wins: 2 }),
      ];
      const { uncategorised } = groupByFamily(input, families);
      expect(uncategorised).toBeNull();
    });

    test('sortMode "frequency" (default) sorts by games desc', () => {
      const input: OpeningAggInput[] = [
        ag({ key: 'a', family_id: 'french', games: 1, wins: 1 }),
        ag({ key: 'b', family_id: 'sicilian', games: 9, wins: 9 }),
      ];
      const { rows } = groupByFamily(input, families);
      expect(rows.map((r) => r.family_id)).toEqual(['sicilian', 'french']);
    });

    test('sortMode "best" sorts by win rate desc', () => {
      const input: OpeningAggInput[] = [
        ag({ key: 'a', family_id: 'french', games: 4, wins: 4 }), // 100%
        ag({ key: 'b', family_id: 'sicilian', games: 10, wins: 5 }), // 50%
      ];
      const { rows } = groupByFamily(input, families, 'best' as SortMode);
      expect(rows.map((r) => r.family_id)).toEqual(['french', 'sicilian']);
    });

    test('sortMode "worst" sorts by win rate asc', () => {
      const input: OpeningAggInput[] = [
        ag({ key: 'a', family_id: 'french', games: 4, wins: 4 }), // 100%
        ag({ key: 'b', family_id: 'sicilian', games: 10, wins: 1 }), // 10%
      ];
      const { rows } = groupByFamily(input, families, 'worst' as SortMode);
      expect(rows.map((r) => r.family_id)).toEqual(['sicilian', 'french']);
    });

    test('exposes underlying variations sorted by games desc', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'k1',
          name: 'Sicilian: Najdorf',
          family_id: 'sicilian',
          games: 2,
        }),
        ag({
          key: 'k2',
          name: 'Sicilian: Dragon',
          family_id: 'sicilian',
          games: 5,
        }),
        ag({
          key: 'k3',
          name: 'Sicilian: Sveshnikov',
          family_id: 'sicilian',
          games: 1,
        }),
      ];
      const { rows } = groupByFamily(input, families);
      expect(rows[0].variations.map((v) => v.name)).toEqual([
        'Sicilian: Dragon',
        'Sicilian: Najdorf',
        'Sicilian: Sveshnikov',
      ]);
    });

    test('preserves display_name from families dict, falling back to family_display_name field', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'k1',
          family_id: 'sicilian',
          family_display_name: 'WRONG',
          games: 1,
        }),
        ag({
          key: 'k2',
          family_id: 'unknown-id',
          family_display_name: 'Mystery Family',
          games: 1,
        }),
      ];
      const { rows } = groupByFamily(input, families);
      expect(rows.find((r) => r.family_id === 'sicilian')!.display_name).toBe(
        'Sicilian Defense'
      );
      expect(rows.find((r) => r.family_id === 'unknown-id')!.display_name).toBe(
        'Mystery Family'
      );
    });

    test('derives best_variation as highest win rate where games >= 2', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'najdorf',
          name: 'Sicilian: Najdorf',
          family_id: 'sicilian',
          games: 6,
          wins: 4,
        }), // 67%
        ag({
          key: 'dragon',
          name: 'Sicilian: Dragon',
          family_id: 'sicilian',
          games: 8,
          wins: 3,
        }), // 38%
        ag({
          key: 'one-off',
          name: 'Sicilian: Sveshnikov',
          family_id: 'sicilian',
          games: 1,
          wins: 1,
        }), // disqualified
      ];
      const { rows } = groupByFamily(input, families);
      const sicilian = rows[0];
      expect(sicilian.best_variation?.name).toBe('Sicilian: Najdorf');
      expect(sicilian.weak_variation?.name).toBe('Sicilian: Dragon');
    });

    test('best/weak both null when no variation has games >= 2', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'a',
          name: 'Sicilian: A',
          family_id: 'sicilian',
          games: 1,
          wins: 1,
        }),
        ag({
          key: 'b',
          name: 'Sicilian: B',
          family_id: 'sicilian',
          games: 1,
          wins: 0,
        }),
      ];
      const { rows } = groupByFamily(input, families);
      expect(rows[0].best_variation).toBeNull();
      expect(rows[0].weak_variation).toBeNull();
    });

    test('best/weak coincide when only one variation qualifies', () => {
      const input: OpeningAggInput[] = [
        ag({
          key: 'q',
          name: 'Sicilian: Q',
          family_id: 'sicilian',
          games: 4,
          wins: 2,
        }),
        ag({
          key: 'one',
          name: 'Sicilian: One',
          family_id: 'sicilian',
          games: 1,
        }),
      ];
      const { rows } = groupByFamily(input, families);
      expect(rows[0].best_variation?.name).toBe('Sicilian: Q');
      expect(rows[0].weak_variation?.name).toBe('Sicilian: Q');
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail with the expected shape errors.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/familyAggregation.test.ts
  ```

  Expected: most tests fail with `result.rows is undefined` /
  `result.uncategorised is undefined` / `best_variation is undefined`.

- [ ] **Step 3: Update `familyAggregation.ts` to the new shape.**

  Replace the contents of
  `packages/web/src/components/personal/familyAggregation.ts` with:

  ```ts
  export interface OpeningAggInput {
    key: string;
    name: string;
    eco: string;
    family_id?: string;
    family_display_name?: string | null;
    games: number;
    wins: number;
    draws: number;
    losses: number;
  }

  export interface FamilyMeta {
    id: string;
    display_name: string;
  }

  export interface FamilyVariationRow {
    key: string;
    name: string;
    eco: string;
    games: number;
    wins: number;
    draws: number;
    losses: number;
  }

  export interface FamilyRollupRow {
    family_id: string;
    display_name: string;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    score: number;
    variation_count: number;
    variations: FamilyVariationRow[];
    best_variation: FamilyVariationRow | null;
    weak_variation: FamilyVariationRow | null;
  }

  export interface UncategorisedSummary {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    variation_count: number;
    win_rate: number;
  }

  export interface GroupByFamilyResult {
    rows: FamilyRollupRow[];
    uncategorised: UncategorisedSummary | null;
  }

  export type SortMode = 'frequency' | 'best' | 'worst';

  const UNCATEGORISED = 'uncategorised';
  const QUALIFY_THRESHOLD = 2;

  function winRate(games: number, wins: number, draws: number): number {
    return games === 0 ? 0 : (wins + 0.5 * draws) / games;
  }

  export function groupByFamily(
    input: OpeningAggInput[],
    families: Record<string, FamilyMeta>,
    sortMode: SortMode = 'frequency'
  ): GroupByFamilyResult {
    const buckets = new Map<string, FamilyRollupRow>();
    let uncategorised: UncategorisedSummary | null = null;

    const ensureUncategorised = (): UncategorisedSummary => {
      if (!uncategorised) {
        uncategorised = {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          variation_count: 0,
          win_rate: 0,
        };
      }
      return uncategorised;
    };

    for (const row of input) {
      const id =
        row.family_id && row.family_id.length > 0
          ? row.family_id
          : UNCATEGORISED;

      if (id === UNCATEGORISED) {
        const u = ensureUncategorised();
        u.games += row.games;
        u.wins += row.wins;
        u.draws += row.draws;
        u.losses += row.losses;
        u.variation_count += 1;
        continue;
      }

      const fromDict = families[id]?.display_name;
      const display = fromDict || row.family_display_name || id;

      let bucket = buckets.get(id);
      if (!bucket) {
        bucket = {
          family_id: id,
          display_name: display,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          score: 0,
          variation_count: 0,
          variations: [],
          best_variation: null,
          weak_variation: null,
        };
        buckets.set(id, bucket);
      }
      bucket.games += row.games;
      bucket.wins += row.wins;
      bucket.draws += row.draws;
      bucket.losses += row.losses;
      bucket.variations.push({
        key: row.key,
        name: row.name,
        eco: row.eco,
        games: row.games,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
      });
    }

    for (const bucket of buckets.values()) {
      bucket.variation_count = bucket.variations.length;
      bucket.score = winRate(bucket.games, bucket.wins, bucket.draws);
      bucket.variations.sort(
        (a, b) => b.games - a.games || a.name.localeCompare(b.name)
      );

      const qualified = bucket.variations.filter(
        (v) => v.games >= QUALIFY_THRESHOLD
      );
      if (qualified.length > 0) {
        const ranked = [...qualified].sort((a, b) => {
          const wrDiff =
            winRate(b.games, b.wins, b.draws) -
            winRate(a.games, a.wins, a.draws);
          if (wrDiff !== 0) return wrDiff;
          return b.games - a.games;
        });
        bucket.best_variation = ranked[0];
        bucket.weak_variation = ranked[ranked.length - 1];
      }
    }

    if (uncategorised) {
      uncategorised.win_rate = winRate(
        uncategorised.games,
        uncategorised.wins,
        uncategorised.draws
      );
    }

    const rows = Array.from(buckets.values());
    rows.sort((a, b) => {
      if (sortMode === 'best') {
        const diff = b.score - a.score;
        if (diff !== 0) return diff;
      } else if (sortMode === 'worst') {
        const diff = a.score - b.score;
        if (diff !== 0) return diff;
      }
      const games = b.games - a.games;
      if (games !== 0) return games;
      return a.display_name.localeCompare(b.display_name);
    });

    return { rows, uncategorised };
  }
  ```

- [ ] **Step 4: Run tests to verify they pass.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/familyAggregation.test.ts
  ```

  Expected: all 11 tests pass.

- [ ] **Step 5: Run the full frontend suite to catch consumers of the old return
      shape.**

  ```bash
  npm run test:frontend
  ```

  Expected: `PersonalOpeningStats.test.tsx` family-rollup test will fail
  (consumes the old `FamilyRollupRow[]` shape). Note the failures — Task 8 fixes
  them when wiring the consumer.

- [ ] **Step 6: Commit.**

  ```bash
  git add packages/web/src/components/personal/familyAggregation.ts \
          packages/web/src/components/personal/__tests__/familyAggregation.test.ts
  git commit -m "refactor(personal): familyAggregation returns {rows, uncategorised} with best/weak"
  ```

---

## Task 2: `useCountUp` hook

**Files:**

- Create: `packages/web/src/components/personal/useCountUp.ts`
- Create: `packages/web/src/components/personal/__tests__/useCountUp.test.ts`

A small hook that ramps a numeric value from 0 to `target` over a duration,
honouring `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test.**

  Create `packages/web/src/components/personal/__tests__/useCountUp.test.ts`:

  ```ts
  import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
  import { renderHook, act } from '@testing-library/react';
  import { useCountUp } from '../useCountUp';

  describe('useCountUp', () => {
    let originalMatchMedia: typeof window.matchMedia;
    let rafCallbacks: FrameRequestCallback[] = [];

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
      rafCallbacks = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      vi.restoreAllMocks();
    });

    const mockMatchMedia = (reduced: boolean) => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('reduce') ? reduced : false,
        media: q,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    };

    test('returns target immediately when prefers-reduced-motion is reduce', () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useCountUp(67, 350));
      expect(result.current).toBe(67);
    });

    test('starts at 0 and ramps to target over duration', () => {
      mockMatchMedia(false);
      let now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);

      const { result } = renderHook(() => useCountUp(100, 350));
      expect(result.current).toBe(0);

      act(() => {
        now = 1000 + 175; // halfway
        rafCallbacks.shift()?.(now);
      });
      expect(result.current).toBeGreaterThan(0);
      expect(result.current).toBeLessThan(100);

      act(() => {
        now = 1000 + 350;
        rafCallbacks.shift()?.(now);
      });
      expect(result.current).toBe(100);
    });

    test('returns 0 when target is 0', () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useCountUp(0, 350));
      expect(result.current).toBe(0);
    });

    test('cancels raf on unmount', () => {
      mockMatchMedia(false);
      const cancel = vi.mocked(window.cancelAnimationFrame);
      const { unmount } = renderHook(() => useCountUp(100, 350));
      unmount();
      expect(cancel).toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails (module does not exist).**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/useCountUp.test.ts
  ```

  Expected: FAIL — `Cannot find module '../useCountUp'`.

- [ ] **Step 3: Implement the hook.**

  Create `packages/web/src/components/personal/useCountUp.ts`:

  ```ts
  import { useEffect, useState } from 'react';

  function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Animate a numeric value from 0 to `target` over `durationMs` using rAF.
   * Honours `prefers-reduced-motion: reduce` by returning the target immediately.
   * Restarts the animation when `target` changes.
   */
  export function useCountUp(target: number, durationMs: number): number {
    const reduced = prefersReducedMotion();
    const [value, setValue] = useState<number>(reduced ? target : 0);

    useEffect(() => {
      if (reduced) {
        setValue(target);
        return;
      }
      if (target === 0) {
        setValue(0);
        return;
      }

      let rafId = 0;
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - progress, 2); // ease-out quadratic
        setValue(target * eased);
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setValue(target);
        }
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, [target, durationMs, reduced]);

    return value;
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/useCountUp.test.ts
  ```

  Expected: 4/4 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/useCountUp.ts \
          packages/web/src/components/personal/__tests__/useCountUp.test.ts
  git commit -m "feat(personal): useCountUp hook with prefers-reduced-motion"
  ```

---

## Task 3: `InlineLinkSwitch` shared primitive

**Files:**

- Create: `packages/web/src/components/personal/InlineLinkSwitch.tsx`
- Create: `packages/web/src/components/personal/InlineLinkSwitch.module.css`
- Create:
  `packages/web/src/components/personal/__tests__/InlineLinkSwitch.test.tsx`

The shared editorial switcher: a tracked-out small-caps label, N inline-link
options, brand middle-dot separators, `radiogroup`/`radio` ARIA. Used by both
`AnalyseToolbar` (VIEW) and `SectionToolbar` (ORDER).

- [ ] **Step 1: Write the failing test.**

  Create
  `packages/web/src/components/personal/__tests__/InlineLinkSwitch.test.tsx`:

  ```tsx
  import { describe, expect, test, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { InlineLinkSwitch } from '../InlineLinkSwitch';

  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ] as const;

  describe('InlineLinkSwitch', () => {
    test('renders label and all options', () => {
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={() => {}}
          ariaLabel="Test"
        />
      );
      expect(screen.getByText('VIEW')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Option A' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Option B' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Option C' })
      ).toBeInTheDocument();
    });

    test('uses radiogroup role on the container', () => {
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={() => {}}
          ariaLabel="Test group"
        />
      );
      expect(
        screen.getByRole('radiogroup', { name: 'Test group' })
      ).toBeInTheDocument();
    });

    test('aria-checked reflects the value prop', () => {
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="b"
          onChange={() => {}}
          ariaLabel="Test"
        />
      );
      expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    test('clicking an option calls onChange with its value', async () => {
      const onChange = vi.fn();
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={onChange}
          ariaLabel="Test"
        />
      );
      await userEvent.click(screen.getByRole('radio', { name: 'Option C' }));
      expect(onChange).toHaveBeenCalledWith('c');
    });

    test('clicking the active option does not call onChange', async () => {
      const onChange = vi.fn();
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={onChange}
          ariaLabel="Test"
        />
      );
      await userEvent.click(screen.getByRole('radio', { name: 'Option A' }));
      expect(onChange).not.toHaveBeenCalled();
    });

    test('arrow right moves focus and selection to next option', async () => {
      const onChange = vi.fn();
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={onChange}
          ariaLabel="Test"
        />
      );
      const first = screen.getByRole('radio', { name: 'Option A' });
      first.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledWith('b');
    });

    test('arrow left from first wraps to last', async () => {
      const onChange = vi.fn();
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="a"
          onChange={onChange}
          ariaLabel="Test"
        />
      );
      screen.getByRole('radio', { name: 'Option A' }).focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(onChange).toHaveBeenCalledWith('c');
    });

    test('home jumps to first, end jumps to last', async () => {
      const onChange = vi.fn();
      render(
        <InlineLinkSwitch
          label="VIEW"
          options={options}
          value="b"
          onChange={onChange}
          ariaLabel="Test"
        />
      );
      screen.getByRole('radio', { name: 'Option B' }).focus();
      await userEvent.keyboard('{End}');
      expect(onChange).toHaveBeenLastCalledWith('c');
      await userEvent.keyboard('{Home}');
      expect(onChange).toHaveBeenLastCalledWith('a');
    });
  });
  ```

- [ ] **Step 2: Run to verify it fails.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/InlineLinkSwitch.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component.**

  Create `packages/web/src/components/personal/InlineLinkSwitch.tsx`:

  ```tsx
  import React, { useRef } from 'react';
  import styles from './InlineLinkSwitch.module.css';

  export interface InlineLinkSwitchOption<T extends string> {
    value: T;
    label: string;
  }

  interface Props<T extends string> {
    label: string;
    options: ReadonlyArray<InlineLinkSwitchOption<T>>;
    value: T;
    onChange: (value: T) => void;
    /** Accessible name announced for the radiogroup. */
    ariaLabel: string;
  }

  export function InlineLinkSwitch<T extends string>({
    label,
    options,
    value,
    onChange,
    ariaLabel,
  }: Props<T>) {
    const refs = useRef<Array<HTMLButtonElement | null>>([]);

    const indexOf = (v: T) => options.findIndex((o) => o.value === v);

    const focusAndSelect = (newIndex: number) => {
      const wrapped = (newIndex + options.length) % options.length;
      const next = options[wrapped];
      refs.current[wrapped]?.focus();
      if (next.value !== value) onChange(next.value);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const current = indexOf(value);
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusAndSelect(current + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusAndSelect(current - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusAndSelect(0);
          break;
        case 'End':
          e.preventDefault();
          focusAndSelect(options.length - 1);
          break;
      }
    };

    return (
      <div className={styles.root} role="radiogroup" aria-label={ariaLabel}>
        <span className={styles.label}>{label}</span>
        <span className={styles.options}>
          {options.map((opt, i) => {
            const active = opt.value === value;
            return (
              <React.Fragment key={opt.value}>
                {i > 0 && (
                  <span className={styles.separator} aria-hidden="true">
                    ·
                  </span>
                )}
                <button
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  className={active ? styles.optionActive : styles.option}
                  onClick={() => {
                    if (!active) onChange(opt.value);
                  }}
                  onKeyDown={onKeyDown}
                >
                  {opt.label}
                </button>
              </React.Fragment>
            );
          })}
        </span>
      </div>
    );
  }
  ```

  Create `packages/web/src/components/personal/InlineLinkSwitch.module.css`:

  ```css
  .root {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .label {
    font-family: var(--font-family-primary);
    font-size: var(--text-3xs);
    font-weight: var(--font-weight-semibold, 600);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .options {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .option,
  .optionActive {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font-family: var(--font-family-primary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium, 500);
    line-height: 1.2;
    transition: color var(--transition-fast);
  }

  .option {
    color: var(--color-text-muted);
  }
  .option:hover,
  .option:focus-visible {
    color: var(--color-text-primary);
    outline: none;
  }
  .option:focus-visible {
    outline: 2px solid var(--color-brand-orange);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .optionActive {
    color: var(--color-text-primary);
  }
  .optionActive:focus-visible {
    outline: 2px solid var(--color-brand-orange);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .separator {
    color: var(--color-text-muted);
    user-select: none;
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/InlineLinkSwitch.test.tsx
  ```

  Expected: 8/8 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/InlineLinkSwitch.tsx \
          packages/web/src/components/personal/InlineLinkSwitch.module.css \
          packages/web/src/components/personal/__tests__/InlineLinkSwitch.test.tsx
  git commit -m "feat(personal): InlineLinkSwitch editorial radiogroup primitive"
  ```

---

## Task 4: `AnalyseToolbar` (VIEW switcher)

**Files:**

- Create: `packages/web/src/components/personal/AnalyseToolbar.tsx`
- Create: `packages/web/src/components/personal/AnalyseToolbar.module.css`
- Create:
  `packages/web/src/components/personal/__tests__/AnalyseToolbar.test.tsx`

Page-global VIEW switcher (Variation / Family). Wraps `InlineLinkSwitch`.

- [ ] **Step 1: Write the failing test.**

  Create
  `packages/web/src/components/personal/__tests__/AnalyseToolbar.test.tsx`:

  ```tsx
  import { describe, expect, test, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { AnalyseToolbar } from '../AnalyseToolbar';

  describe('AnalyseToolbar', () => {
    test('renders VIEW label and Variation/Family options', () => {
      render(<AnalyseToolbar value="variation" onChange={() => {}} />);
      expect(screen.getByText('VIEW')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Variation' })
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Family' })).toBeInTheDocument();
    });

    test('aria-checked reflects current view', () => {
      render(<AnalyseToolbar value="family" onChange={() => {}} />);
      expect(screen.getByRole('radio', { name: 'Family' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('radio', { name: 'Variation' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    test('clicking a different option calls onChange', async () => {
      const onChange = vi.fn();
      render(<AnalyseToolbar value="variation" onChange={onChange} />);
      await userEvent.click(screen.getByRole('radio', { name: 'Family' }));
      expect(onChange).toHaveBeenCalledWith('family');
    });
  });
  ```

- [ ] **Step 2: Run to verify it fails.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/AnalyseToolbar.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

  Create `packages/web/src/components/personal/AnalyseToolbar.tsx`:

  ```tsx
  import React from 'react';
  import { InlineLinkSwitch } from './InlineLinkSwitch';
  import styles from './AnalyseToolbar.module.css';

  export type GroupBy = 'variation' | 'family';

  interface Props {
    value: GroupBy;
    onChange: (value: GroupBy) => void;
  }

  const OPTIONS: ReadonlyArray<{ value: GroupBy; label: string }> = [
    { value: 'variation', label: 'Variation' },
    { value: 'family', label: 'Family' },
  ];

  export const AnalyseToolbar: React.FC<Props> = ({ value, onChange }) => (
    <div className={styles.toolbar}>
      <InlineLinkSwitch
        label="VIEW"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        ariaLabel="Group openings"
      />
    </div>
  );
  ```

  Create `packages/web/src/components/personal/AnalyseToolbar.module.css`:

  ```css
  .toolbar {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: var(--space-5);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/AnalyseToolbar.test.tsx
  ```

  Expected: 3/3 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/AnalyseToolbar.tsx \
          packages/web/src/components/personal/AnalyseToolbar.module.css \
          packages/web/src/components/personal/__tests__/AnalyseToolbar.test.tsx
  git commit -m "feat(personal): AnalyseToolbar VIEW switcher"
  ```

---

## Task 5: `SectionToolbar` (ORDER switcher)

**Files:**

- Create: `packages/web/src/components/personal/SectionToolbar.tsx`
- Create: `packages/web/src/components/personal/SectionToolbar.module.css`
- Create:
  `packages/web/src/components/personal/__tests__/SectionToolbar.test.tsx`

Per-column ORDER switcher. Three inline-link options.

- [ ] **Step 1: Write the failing test.**

  Create
  `packages/web/src/components/personal/__tests__/SectionToolbar.test.tsx`:

  ```tsx
  import { describe, expect, test, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { SectionToolbar } from '../SectionToolbar';

  describe('SectionToolbar', () => {
    test('renders ORDER label with three options', () => {
      render(
        <SectionToolbar
          value="frequency"
          onChange={() => {}}
          ariaLabel="Order white"
        />
      );
      expect(screen.getByText('ORDER')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Most played' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Highest win rate' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Lowest win rate' })
      ).toBeInTheDocument();
    });

    test('default highlight is Most played', () => {
      render(
        <SectionToolbar
          value="frequency"
          onChange={() => {}}
          ariaLabel="Order white"
        />
      );
      expect(
        screen.getByRole('radio', { name: 'Most played' })
      ).toHaveAttribute('aria-checked', 'true');
    });

    test('selecting an option calls onChange with its mode', async () => {
      const onChange = vi.fn();
      render(
        <SectionToolbar
          value="frequency"
          onChange={onChange}
          ariaLabel="Order white"
        />
      );
      await userEvent.click(
        screen.getByRole('radio', { name: 'Highest win rate' })
      );
      expect(onChange).toHaveBeenCalledWith('best');
    });

    test('two SectionToolbars maintain independent state', async () => {
      const onWhite = vi.fn();
      const onBlack = vi.fn();
      render(
        <>
          <SectionToolbar
            value="frequency"
            onChange={onWhite}
            ariaLabel="Order white"
          />
          <SectionToolbar
            value="best"
            onChange={onBlack}
            ariaLabel="Order black"
          />
        </>
      );
      const whiteFreq = screen.getByRole('radiogroup', { name: 'Order white' });
      const blackBest = screen.getByRole('radiogroup', { name: 'Order black' });
      expect(
        whiteFreq.querySelector('[aria-checked="true"]')?.textContent
      ).toBe('Most played');
      expect(
        blackBest.querySelector('[aria-checked="true"]')?.textContent
      ).toBe('Highest win rate');
    });
  });
  ```

- [ ] **Step 2: Run to verify it fails.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/SectionToolbar.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

  Create `packages/web/src/components/personal/SectionToolbar.tsx`:

  ```tsx
  import React from 'react';
  import { InlineLinkSwitch } from './InlineLinkSwitch';
  import type { SortMode } from './familyAggregation';
  import styles from './SectionToolbar.module.css';

  interface Props {
    value: SortMode;
    onChange: (value: SortMode) => void;
    ariaLabel: string;
  }

  const OPTIONS: ReadonlyArray<{ value: SortMode; label: string }> = [
    { value: 'frequency', label: 'Most played' },
    { value: 'best', label: 'Highest win rate' },
    { value: 'worst', label: 'Lowest win rate' },
  ];

  export const SectionToolbar: React.FC<Props> = ({
    value,
    onChange,
    ariaLabel,
  }) => (
    <div className={styles.bar}>
      <InlineLinkSwitch
        label="ORDER"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </div>
  );
  ```

  Create `packages/web/src/components/personal/SectionToolbar.module.css`:

  ```css
  .bar {
    display: flex;
    align-items: baseline;
    margin-top: var(--space-2);
    margin-bottom: var(--space-3);
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/SectionToolbar.test.tsx
  ```

  Expected: 4/4 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/SectionToolbar.tsx \
          packages/web/src/components/personal/SectionToolbar.module.css \
          packages/web/src/components/personal/__tests__/SectionToolbar.test.tsx
  git commit -m "feat(personal): SectionToolbar ORDER switcher"
  ```

---

## Task 6: `UncategorisedFootnote`

**Files:**

- Create: `packages/web/src/components/personal/UncategorisedFootnote.tsx`
- Create:
  `packages/web/src/components/personal/UncategorisedFootnote.module.css`
- Create:
  `packages/web/src/components/personal/__tests__/UncategorisedFootnote.test.tsx`

Single-line footnote-strip below the family list. Renders nothing when summary
is null.

- [ ] **Step 1: Write the failing test.**

  Create
  `packages/web/src/components/personal/__tests__/UncategorisedFootnote.test.tsx`:

  ```tsx
  import { describe, expect, test } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { UncategorisedFootnote } from '../UncategorisedFootnote';

  describe('UncategorisedFootnote', () => {
    test('renders nothing when summary is null', () => {
      const { container } = render(<UncategorisedFootnote summary={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('renders count, games, percentage when summary has 1 variation', () => {
      render(
        <UncategorisedFootnote
          summary={{
            games: 4,
            wins: 2,
            draws: 0,
            losses: 2,
            variation_count: 1,
            win_rate: 0.5,
          }}
        />
      );
      expect(screen.getByText(/1 uncategorised opening/)).toBeInTheDocument();
      expect(screen.getByText(/4 games/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    test('uses plural "openings" when more than one', () => {
      render(
        <UncategorisedFootnote
          summary={{
            games: 6,
            wins: 3,
            draws: 0,
            losses: 3,
            variation_count: 12,
            win_rate: 0.5,
          }}
        />
      );
      expect(screen.getByText(/12 uncategorised openings/)).toBeInTheDocument();
    });

    test('rounds the percentage to nearest integer', () => {
      render(
        <UncategorisedFootnote
          summary={{
            games: 7,
            wins: 4,
            draws: 1,
            losses: 2,
            variation_count: 5,
            win_rate: (4 + 0.5 * 1) / 7,
          }}
        />
      );
      // (4 + 0.5) / 7 ≈ 64.28% → 64%
      expect(screen.getByText(/64%/)).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run to verify it fails.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/UncategorisedFootnote.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

  Create `packages/web/src/components/personal/UncategorisedFootnote.tsx`:

  ```tsx
  import React from 'react';
  import type { UncategorisedSummary } from './familyAggregation';
  import styles from './UncategorisedFootnote.module.css';

  interface Props {
    summary: UncategorisedSummary | null;
  }

  export const UncategorisedFootnote: React.FC<Props> = ({ summary }) => {
    if (!summary) return null;
    const pct = Math.round(summary.win_rate * 100);
    const count = summary.variation_count;
    const noun = count === 1 ? 'opening' : 'openings';
    return (
      <p className={styles.footnote}>
        + {count} uncategorised {noun} · {summary.games} games · {pct}%
      </p>
    );
  };
  ```

  Create
  `packages/web/src/components/personal/UncategorisedFootnote.module.css`:

  ```css
  .footnote {
    margin: var(--space-6) 0 0 0;
    padding: 0;
    font-family: var(--font-family-primary);
    font-style: italic;
    font-weight: 400;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/UncategorisedFootnote.test.tsx
  ```

  Expected: 4/4 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/UncategorisedFootnote.tsx \
          packages/web/src/components/personal/UncategorisedFootnote.module.css \
          packages/web/src/components/personal/__tests__/UncategorisedFootnote.test.tsx
  git commit -m "feat(personal): UncategorisedFootnote footnote-strip"
  ```

---

## Task 7: `FamilyRow`

**Files:**

- Create: `packages/web/src/components/personal/FamilyRow.tsx`
- Create: `packages/web/src/components/personal/FamilyRow.module.css`
- Create: `packages/web/src/components/personal/__tests__/FamilyRow.test.tsx`

The leader-dot row. Hairline rule above; family name on the left; dotted leader;
result-coloured display-weight WR% on the right; Best/Weak sub-meta below the
name; games count to the far right; expanded variations indent below.

- [ ] **Step 1: Write the failing test.**

  Create `packages/web/src/components/personal/__tests__/FamilyRow.test.tsx`:

  ```tsx
  import { describe, expect, test, vi, beforeEach } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { MemoryRouter } from 'react-router-dom';
  import { FamilyRow } from '../FamilyRow';
  import type { FamilyRollupRow } from '../familyAggregation';

  beforeEach(() => {
    // Force prefers-reduced-motion: reduce so the count-up returns the target immediately
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  const variation = (
    overrides: Partial<FamilyRollupRow['variations'][number]> = {}
  ): FamilyRollupRow['variations'][number] => ({
    key: 'v1',
    name: 'Sicilian: Najdorf',
    eco: 'B90',
    games: 6,
    wins: 4,
    draws: 1,
    losses: 1,
    ...overrides,
  });

  const row = (overrides: Partial<FamilyRollupRow> = {}): FamilyRollupRow => ({
    family_id: 'sicilian',
    display_name: 'Sicilian Defence',
    games: 14,
    wins: 7,
    draws: 1,
    losses: 6,
    score: (7 + 0.5) / 14,
    variation_count: 2,
    variations: [
      variation({
        key: 'v1',
        name: 'Sicilian: Najdorf',
        games: 6,
        wins: 4,
        draws: 1,
        losses: 1,
      }),
      variation({
        key: 'v2',
        name: 'Sicilian: Dragon',
        games: 8,
        wins: 3,
        draws: 0,
        losses: 5,
      }),
    ],
    best_variation: variation({
      key: 'v1',
      name: 'Sicilian: Najdorf',
      games: 6,
      wins: 4,
      draws: 1,
      losses: 1,
    }),
    weak_variation: variation({
      key: 'v2',
      name: 'Sicilian: Dragon',
      games: 8,
      wins: 3,
      draws: 0,
      losses: 5,
    }),
    ...overrides,
  });

  const renderRow = (
    props: Partial<React.ComponentProps<typeof FamilyRow>> = {}
  ) =>
    render(
      <MemoryRouter>
        <FamilyRow
          colour="white"
          row={row()}
          isExpanded={false}
          onToggle={() => {}}
          openingLink={() => '/opening/test'}
          {...props}
        />
      </MemoryRouter>
    );

  describe('FamilyRow', () => {
    test('renders family display name', () => {
      renderRow();
      expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
    });

    test('renders rounded win-rate percentage', () => {
      renderRow();
      // (7 + 0.5) / 14 ≈ 0.5357 → 54%
      expect(screen.getByText(/54%/)).toBeInTheDocument();
    });

    test('renders games count', () => {
      renderRow();
      expect(screen.getByText('14 games')).toBeInTheDocument();
    });

    test('renders best and weak sub-meta when both exist', () => {
      renderRow();
      expect(screen.getByText(/Best/)).toBeInTheDocument();
      expect(screen.getByText(/Najdorf/)).toBeInTheDocument();
      expect(screen.getByText(/67%/)).toBeInTheDocument();
      expect(screen.getByText(/Needs work/)).toBeInTheDocument();
      expect(screen.getByText(/Dragon/)).toBeInTheDocument();
      expect(screen.getByText(/38%/)).toBeInTheDocument();
    });

    test('omits sub-meta entirely when both best and weak are null', () => {
      renderRow({ row: row({ best_variation: null, weak_variation: null }) });
      expect(screen.queryByText(/Best/)).toBeNull();
      expect(screen.queryByText(/Needs work/)).toBeNull();
    });

    test('renders only best when weak is null', () => {
      const r = row({
        best_variation: variation({ name: 'Sicilian: A', games: 4, wins: 3 }),
        weak_variation: null,
      });
      renderRow({ row: r });
      expect(screen.getByText(/Best/)).toBeInTheDocument();
      expect(screen.queryByText(/Needs work/)).toBeNull();
    });

    test('disclosure: aria-expanded reflects isExpanded prop', () => {
      const { rerender } = renderRow({ isExpanded: false });
      expect(
        screen.getByRole('button', { name: /Sicilian Defence/ })
      ).toHaveAttribute('aria-expanded', 'false');
      rerender(
        <MemoryRouter>
          <FamilyRow
            colour="white"
            row={row()}
            isExpanded={true}
            onToggle={() => {}}
            openingLink={() => '/opening/test'}
          />
        </MemoryRouter>
      );
      expect(
        screen.getByRole('button', { name: /Sicilian Defence/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    test('clicking the row calls onToggle', async () => {
      const onToggle = vi.fn();
      renderRow({ onToggle });
      await userEvent.click(
        screen.getByRole('button', { name: /Sicilian Defence/ })
      );
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('expanded state renders variations with links', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByRole('link', { name: /Najdorf/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Dragon/ })).toBeInTheDocument();
    });

    test('collapsed state does not render variations', () => {
      renderRow({ isExpanded: false });
      expect(screen.queryByRole('link', { name: /Najdorf/ })).toBeNull();
    });

    test('white-side row uses white result-colour token on win-rate', () => {
      renderRow({ colour: 'white' });
      const pct = screen.getByText(/54%/);
      // We assert the class is applied; CSS resolves the variable.
      expect(pct.className).toMatch(/winRateWhite/);
    });

    test('black-side row uses black result-colour token on win-rate', () => {
      renderRow({ colour: 'black' });
      const pct = screen.getByText(/54%/);
      expect(pct.className).toMatch(/winRateBlack/);
    });
  });
  ```

- [ ] **Step 2: Run to verify it fails.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/FamilyRow.test.tsx
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

  Create `packages/web/src/components/personal/FamilyRow.tsx`:

  ```tsx
  import React from 'react';
  import { Link } from 'react-router-dom';
  import type {
    FamilyRollupRow,
    FamilyVariationRow,
  } from './familyAggregation';
  import { useCountUp } from './useCountUp';
  import styles from './FamilyRow.module.css';

  interface Props {
    colour: 'white' | 'black';
    row: FamilyRollupRow;
    isExpanded: boolean;
    onToggle: () => void;
    /** Returns the route to navigate to when a variation row is clicked. */
    openingLink: (variationKey: string) => string;
  }

  function pct(games: number, wins: number, draws: number): number {
    if (games === 0) return 0;
    return Math.round(((wins + 0.5 * draws) / games) * 100);
  }

  /** Disclosure chevron — single-path, 1.5px stroke, 16x16 viewbox. */
  const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <svg
      className={open ? styles.chevronOpen : styles.chevron}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M 6 4 L 10 8 L 6 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SubMeta: React.FC<{
    best: FamilyVariationRow | null;
    weak: FamilyVariationRow | null;
  }> = ({ best, weak }) => {
    if (!best && !weak) return null;
    const showBoth = best && weak && best.key !== weak.key;
    return (
      <div className={styles.subMeta}>
        {best && (
          <span className={styles.subMetaPart}>
            <span className={styles.subMetaLabel}>Best</span>{' '}
            <span className={styles.subMetaName}>
              {stripFamilyPrefix(best.name)}
            </span>
            <span className={styles.subMetaDash}> — </span>
            <span className={styles.subMetaPct}>
              {pct(best.games, best.wins, best.draws)}%
            </span>
          </span>
        )}
        {showBoth && (
          <>
            <span className={styles.subMetaSep} aria-hidden="true">
              ·
            </span>
            <span className={styles.subMetaPart}>
              <span className={styles.subMetaLabel}>Needs work</span>{' '}
              <span className={styles.subMetaName}>
                {stripFamilyPrefix(weak!.name)}
              </span>
              <span className={styles.subMetaDash}> — </span>
              <span className={styles.subMetaPct}>
                {pct(weak!.games, weak!.wins, weak!.draws)}%
              </span>
            </span>
          </>
        )}
      </div>
    );
  };

  /** "Sicilian: Najdorf" → "Najdorf"; passes through if no colon. */
  function stripFamilyPrefix(name: string): string {
    const idx = name.indexOf(':');
    return idx === -1 ? name : name.slice(idx + 1).trimStart();
  }

  export const FamilyRow: React.FC<Props & { rowIndex?: number }> = ({
    colour,
    row,
    isExpanded,
    onToggle,
    openingLink,
    rowIndex = 0,
  }) => {
    const target = pct(row.games, row.wins, row.draws);
    const animated = useCountUp(target, 350);
    const display = Math.round(animated);
    const variationsId = `variations-${colour}-${row.family_id}`;
    const wrClass =
      colour === 'white' ? styles.winRateWhite : styles.winRateBlack;

    return (
      <div
        className={styles.familyRow}
        style={{ ['--row-index' as never]: Math.min(rowIndex, 12) }}
      >
        <button
          type="button"
          className={styles.header}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={variationsId}
        >
          <span className={styles.chevronCell}>
            <ChevronIcon open={isExpanded} />
          </span>
          <span className={styles.nameCol}>
            <span className={styles.familyName}>{row.display_name}</span>
            <SubMeta best={row.best_variation} weak={row.weak_variation} />
          </span>
          <span className={styles.leader} aria-hidden="true" />
          <span className={`${styles.winRate} ${wrClass}`}>{display}%</span>
          <span className={styles.gamesMeta}>{row.games} games</span>
        </button>
        {isExpanded && (
          <ul id={variationsId} className={styles.variations}>
            {row.variations.map((v, i) => (
              <li
                key={v.key}
                className={styles.variationItem}
                style={{ ['--child-index' as never]: i }}
              >
                <Link className={styles.variationLink} to={openingLink(v.key)}>
                  <span className={styles.variationName}>
                    {stripFamilyPrefix(v.name)}
                  </span>
                  <span className={styles.variationLeader} aria-hidden="true" />
                  <span className={`${styles.variationPct} ${wrClass}`}>
                    {pct(v.games, v.wins, v.draws)}%
                  </span>
                  <span className={styles.variationGames}>{v.games}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  ```

  Create `packages/web/src/components/personal/FamilyRow.module.css`:

  ```css
  .familyRow {
    border-top: 1px solid var(--border-default);
  }
  .familyRow:last-child {
    border-bottom: 1px solid var(--border-default);
  }

  .header {
    display: grid;
    grid-template-columns: 24px 1fr auto auto auto;
    align-items: baseline;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) 0;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: background var(--transition-fast);
  }
  .header:hover {
    background: var(--surface-overlay);
  }
  .header:focus-visible {
    outline: 2px solid var(--color-brand-orange);
    outline-offset: 2px;
  }

  .chevronCell {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-muted);
  }

  .chevron,
  .chevronOpen {
    transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .chevronOpen {
    transform: rotate(90deg);
  }

  .nameCol {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .familyName {
    font-family: var(--font-family-headline);
    font-weight: 700;
    font-size: var(--text-lg);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subMeta {
    margin-top: 2px;
    font-family: var(--font-family-primary);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .subMetaLabel {
    color: var(--color-text-muted);
  }
  .subMetaName {
    font-style: italic;
    color: var(--color-text-secondary);
  }
  .subMetaDash {
    color: var(--color-text-muted);
  }
  .subMetaPct {
    font-family: var(--font-family-mono);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
  }
  .subMetaSep {
    margin: 0 var(--space-2);
    color: var(--color-text-muted);
  }
  .subMetaPart {
    white-space: nowrap;
  }

  .leader {
    align-self: end;
    height: 1px;
    border-bottom: 1px dotted var(--border-default);
    transform: translateY(-6px);
    min-width: var(--space-6);
  }

  .winRate {
    font-family: var(--font-family-headline);
    font-weight: 800;
    font-size: clamp(28px, 2.4vw, 32px);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .winRateWhite {
    color: var(--color-result-white-text);
  }
  .winRateBlack {
    color: var(--color-result-black-text);
  }

  .gamesMeta {
    font-family: var(--font-family-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    margin-left: var(--space-3);
  }

  .variations {
    list-style: none;
    margin: 0 0 var(--space-3) calc(24px + var(--space-3));
    padding: 0 0 0 var(--space-4);
    border-left: 1px solid var(--border-subtle);
  }

  .variationItem {
    margin: 0;
    padding: 0;
  }

  .variationLink {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-1-5) 0;
    text-decoration: none;
    color: inherit;
    transition: color var(--transition-fast);
  }
  .variationLink:hover .variationName {
    color: var(--color-text-primary);
  }

  .variationName {
    font-family: var(--font-family-primary);
    font-style: italic;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .variationLeader {
    align-self: end;
    height: 1px;
    border-bottom: 1px dotted var(--border-subtle);
    transform: translateY(-4px);
    min-width: var(--space-4);
  }

  .variationPct {
    font-family: var(--font-family-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-sm);
  }

  .variationGames {
    font-family: var(--font-family-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 2ch;
    text-align: right;
  }

  /* Row reveal — reuses the codebase-wide cardSlideIn keyframe declared in
     packages/web/src/styles/simplified.css. The parent applies a custom
     property --row-index so each row staggers 80ms behind the previous. */
  .familyRow {
    animation: cardSlideIn 500ms ease-out backwards;
    animation-delay: calc(var(--row-index, 0) * 80ms);
  }

  /* Variation children fade-in stagger when the family expands. Each <li>
     consumes its own --child-index, so the parent can set it inline. */
  .variationItem {
    animation: cardSlideIn 220ms ease-out backwards;
    animation-delay: calc(var(--child-index, 0) * 60ms);
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron,
    .chevronOpen,
    .header,
    .variationLink {
      transition: none;
    }
    .familyRow,
    .variationItem {
      animation: none;
    }
  }
  ```

- [ ] **Step 4: Run tests.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal/__tests__/FamilyRow.test.tsx
  ```

  Expected: 12/12 pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add packages/web/src/components/personal/FamilyRow.tsx \
          packages/web/src/components/personal/FamilyRow.module.css \
          packages/web/src/components/personal/__tests__/FamilyRow.test.tsx
  git commit -m "feat(personal): FamilyRow leader-dot row with result-coloured WR%"
  ```

---

## Task 8: Wire into `PersonalOpeningStats.tsx` + remove old code

**Files:**

- Modify: `packages/web/src/components/personal/PersonalOpeningStats.tsx` (drop
  inline FamilyRow, drop desktop side toggle, drop standalone groupByToggle,
  integrate AnalyseToolbar + SectionToolbar + new FamilyRow +
  UncategorisedFootnote, update consumer of `groupByFamily` for new return
  shape)
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`
  (delete broken family-rollup block at lines 2037–2123, remove desktop
  `.pillToggle` rules)
- Modify:
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`
  (update family-rollup test for new structure)

This task is the integration. It's bigger than the others, so split into
sub-steps with intermediate test runs.

- [ ] **Step 1: Locate the existing inline FamilyRow + the family-rollup
      block.**

  ```bash
  grep -nE "FamilyRow|familyRow|groupByToggle|groupByActive|groupByOption" \
    packages/web/src/components/personal/PersonalOpeningStats.tsx | head -40
  grep -n "FAMILY ROLLUP\|familyRow\|groupByToggle" \
    packages/web/src/components/personal/PersonalOpeningStats.module.css | head -20
  ```

  Note the line ranges:
  - `PersonalOpeningStats.tsx`: inline `FamilyRow` component (around lines
    343–383); `groupByToggle` markup blocks in mobile (~1138–1159) and desktop
    (~1377–1398); `pillToggle` (~1106–1135).
  - `PersonalOpeningStats.module.css`: `.groupByToggle` and family rollup (lines
    2037–2123).

  These are the targets for deletion in this task.

- [ ] **Step 2: Update imports and remove the inline FamilyRow.**

  In `PersonalOpeningStats.tsx`:

  At the top, after the existing imports, add:

  ```tsx
  import { AnalyseToolbar, type GroupBy } from './AnalyseToolbar';
  import { SectionToolbar } from './SectionToolbar';
  import { FamilyRow } from './FamilyRow';
  import { UncategorisedFootnote } from './UncategorisedFootnote';
  ```

  Update the existing `familyAggregation` import to add the type:

  ```tsx
  import {
    groupByFamily,
    type FamilyRollupRow,
    type OpeningAggInput,
    type SortMode,
  } from './familyAggregation';
  ```

  Delete the inline `FamilyRow` component (the one starting
  `const FamilyRow: React.FC<...>` and ending at the matching closing `};`). The
  new component is imported above.

  Update the `groupBy` state type to use the imported `GroupBy`:

  ```tsx
  const [groupBy, setGroupBy] = useState<GroupBy>('variation');
  ```

- [ ] **Step 3: Update consumers of `groupByFamily()` for the new return
      shape.**

  In `PersonalOpeningStats.tsx`, find the two existing `groupByFamily` call
  sites (one for white, one for black, inside the dashboard render block):

  ```tsx
  const familyRowsWhite = groupByFamily(
    dashboard.asWhite.map(toAggInput),
    familiesDict
  );
  const familyRowsBlack = groupByFamily(
    dashboard.asBlack.map(toAggInput),
    familiesDict
  );
  ```

  Replace with sortMode-aware calls that destructure the new shape:

  ```tsx
  const whiteFamily = groupByFamily(
    dashboard.asWhite.map(toAggInput),
    familiesDict,
    whiteSortMode
  );
  const blackFamily = groupByFamily(
    dashboard.asBlack.map(toAggInput),
    familiesDict,
    blackSortMode
  );
  ```

  Then replace every reference to `familyRowsWhite` with `whiteFamily.rows` and
  every reference to `familyRowsBlack` with `blackFamily.rows`. (You'll surface
  the `.uncategorised` field in the next step.)

- [ ] **Step 4: Replace the old toolbar + side toggle markup.**

  In `PersonalOpeningStats.tsx`, find the **desktop** dashboard render block
  (inside the `<div className={styles.desktopDashboard}>`).

  Locate the standalone `.groupByToggle` block (the segmented pill that says
  Variation/Family). Delete it entirely.

  Above the `<div className={styles.openingSections}>` grid, insert the new
  toolbar:

  ```tsx
  <AnalyseToolbar value={groupBy} onChange={setGroupBy} />
  ```

  Locate the `<SortBar>` rendered inside each section header (one for white, one
  for black). Replace each with `<SectionToolbar>`:

  ```tsx
  {
    /* White section header */
  }
  <div className={styles.sectionHeader}>
    <h3 className={styles.sectionTitle}>
      Performance as White
      <span className={styles.sectionBadge}>{dashboard.whiteGames} games</span>
    </h3>
    <SectionToolbar
      value={whiteSortMode}
      onChange={setWhiteSortMode}
      ariaLabel="Order white openings"
    />
  </div>;

  {
    /* Black section header */
  }
  <div className={styles.sectionHeader}>
    <h3 className={styles.sectionTitle}>
      Performance as Black
      <span className={styles.sectionBadge}>{dashboard.blackGames} games</span>
    </h3>
    <SectionToolbar
      value={blackSortMode}
      onChange={setBlackSortMode}
      ariaLabel="Order black openings"
    />
  </div>;
  ```

  Remove the existing variation-only guard around `<SortBar>` (the spec
  re-enables sort in family view, and `SectionToolbar` is unconditional now).

  Below the family list in each section, render the footnote:

  ```tsx
  <UncategorisedFootnote summary={whiteFamily.uncategorised} />
  ```

  …only inside the family-view branch. Same for black with
  `blackFamily.uncategorised`.

  Replace the family-list render in each section to use the new `FamilyRow`
  import:

  ```tsx
  {groupBy === 'family' ? (
    whiteFamily.rows.length === 0 && !whiteFamily.uncategorised ? (
      <div className={styles.emptyList}>No classified openings.</div>
    ) : (
      <>
        <div className={styles.openingList}>
          {whiteFamily.rows.map((r, i) => {
            const key = `white:${r.family_id}`;
            return (
              <FamilyRow
                key={key}
                colour="white"
                row={r}
                rowIndex={i}
                isExpanded={expanded.has(key)}
                onToggle={() => toggleExpanded(key)}
                openingLink={(variationKey) =>
                  `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                }
              />
            );
          })}
        </div>
        <UncategorisedFootnote summary={whiteFamily.uncategorised} />
      </>
    )
  ) : (
    /* …existing variation list, unchanged… */
  )}
  ```

  Mirror the same change for the black section using `blackFamily`.

- [ ] **Step 5: On the desktop branch, drop the As White/As Black side toggle.**

  Find the **desktop** dashboard render. The desktop layout already shows both
  columns side-by-side (`<div className={styles.openingSections}>` is a 2-column
  grid). It does **not** currently render `.pillToggle` on desktop — that toggle
  is rendered only inside `<div className={styles.mobileDashboard}>`. **Confirm
  by inspection:** search for `pillToggle` references in the desktop branch and
  remove them if present. If they're absent already, the only desktop change in
  this step is conceptual (the toolbar is unified above both columns).

  ```bash
  grep -n "pillToggle\b" packages/web/src/components/personal/PersonalOpeningStats.tsx
  ```

  Expected: occurrences are inside the `mobileDashboard` block only. No deletion
  needed for the desktop branch.

- [ ] **Step 6: On the mobile branch, replace the standalone groupByToggle with
      AnalyseToolbar.**

  In the `<div className={styles.mobileDashboard}>` block, locate the
  `.groupByToggle` segmented pill (the one with role="tablist"). Replace it
  with:

  ```tsx
  <AnalyseToolbar value={groupBy} onChange={setGroupBy} />
  ```

  Replace the mobile `<SortBar>` (rendered when `groupBy === 'variation'`) with
  an unconditional `<SectionToolbar>`:

  ```tsx
  <SectionToolbar
    value={activeSortMode}
    onChange={setActiveSortMode}
    ariaLabel={`Order ${activeTab} openings`}
  />
  ```

  When `groupBy === 'family'` on mobile, render `FamilyRow`s for the active tab
  using the same pattern as desktop:

  ```tsx
  {groupBy === 'family' ? (
    (() => {
      const fam = activeTab === 'white' ? whiteFamily : blackFamily;
      if (fam.rows.length === 0 && !fam.uncategorised) {
        return <div className={styles.emptyList}>No classified openings.</div>;
      }
      return (
        <>
          <div className={styles.mobileOpeningList}>
            {fam.rows.map((r, i) => {
              const key = `${activeTab}:${r.family_id}`;
              return (
                <FamilyRow
                  key={key}
                  colour={activeTab}
                  row={r}
                  rowIndex={i}
                  isExpanded={expanded.has(key)}
                  onToggle={() => toggleExpanded(key)}
                  openingLink={(variationKey) =>
                    `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                  }
                />
              );
            })}
          </div>
          <UncategorisedFootnote summary={fam.uncategorised} />
        </>
      );
    })()
  ) : (
    /* …existing variation list, unchanged… */
  )}
  ```

- [ ] **Step 7: Delete the broken family-rollup CSS block.**

  In `packages/web/src/components/personal/PersonalOpeningStats.module.css`,
  delete lines 2037 through 2123 inclusive. These contain the `.groupByToggle`,
  `.groupByOption`, `.groupByActive`, `.familyRow`, `.familyHeader`,
  `.familyName`, `.familyMeta`, `.chevron`, `.chevronOpen`, `.familyVariations`,
  `.familyVariationItem`, `.variationMeta` rules — all replaced by
  component-scoped CSS in `FamilyRow.module.css`, `AnalyseToolbar.module.css`,
  and `SectionToolbar.module.css`.

  Verify after deletion:

  ```bash
  grep -nE "groupByToggle|familyRow\b|familyHeader|familyName|familyMeta|chevron|familyVariations|variationMeta" \
    packages/web/src/components/personal/PersonalOpeningStats.module.css
  ```

  Expected: **no matches.**

- [ ] **Step 8: Update the existing PersonalOpeningStats family-rollup test.**

  The existing test at
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`
  (around the `describe('family rollup', ...)` block, line ~335) references the
  old segmented `groupByToggle` markup. Update it to the new toolbar.

  Find the existing `family rollup` describe block and replace its body with:

  ```tsx
  describe('family rollup', () => {
    test('VIEW switcher renders Variation and Family options', async () => {
      // Standard render harness — see existing tests for the helper that mounts
      // PersonalOpeningStats with a primed sessionStorage cache. Reuse it here.
      mountWithCachedDashboard();
      expect(screen.getByText('VIEW')).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Variation' })
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Family' })).toBeInTheDocument();
    });

    test('switching to Family renders FamilyRow components', async () => {
      mountWithCachedDashboard();
      await userEvent.click(screen.getByRole('radio', { name: 'Family' }));
      // Family display name appears as a row header button
      expect(
        screen
          .getAllByRole('button', { expanded: false })
          .some((b) => /Sicilian|French|Caro/.test(b.textContent || ''))
      ).toBe(true);
    });

    test('expanding a family reveals its variations', async () => {
      mountWithCachedDashboard();
      await userEvent.click(screen.getByRole('radio', { name: 'Family' }));
      const firstFamily = screen.getAllByRole('button', { expanded: false })[0];
      await userEvent.click(firstFamily);
      expect(firstFamily).toHaveAttribute('aria-expanded', 'true');
    });

    test('per-column sort: changing white ORDER does not affect black', async () => {
      mountWithCachedDashboard();
      const groups = screen.getAllByRole('radiogroup', {
        name: /Order .* openings/,
      });
      // Assume two groups present (white, black). Arrow-right on the first.
      const whiteFreq = groups[0].querySelector(
        'button[aria-checked="true"]'
      ) as HTMLButtonElement;
      whiteFreq.focus();
      await userEvent.keyboard('{ArrowRight}');
      const black = groups[1];
      // Black still has Most played selected
      expect(black.querySelector('[aria-checked="true"]')?.textContent).toBe(
        'Most played'
      );
    });
  });
  ```

  If the test file already has a `mountWithCachedDashboard` helper (or
  equivalent name), reuse it. If not, factor out a helper inline at the top of
  the file so it can be reused — its job is to seed `sessionStorage` with a
  known dashboard payload, render
  `<PersonalOpeningStats openingsData={[...]} />` inside `<MemoryRouter>`, and
  return the rendered handle. The exact shape of the cached payload matches what
  `saveToCache` writes today; copy from a passing test in the same file as the
  template.

- [ ] **Step 9: Run the personal tests to verify integration.**

  ```bash
  npm --workspace=packages/web exec vitest run -- src/components/personal
  ```

  Expected: all family-aggregation, hook, primitive, toolbar, footnote, and
  FamilyRow tests pass; PersonalOpeningStats family-rollup tests pass;
  pre-existing PersonalOpeningStats tests pass.

  If a pre-existing PersonalOpeningStats test fails because it asserted on the
  old `groupByToggle` / `pillToggle` desktop markup, update the assertion to the
  new structure (VIEW radiogroup) — but **do not weaken assertions** that
  exercise non-rollup behaviour.

- [ ] **Step 10: Run the full frontend suite + build.**

  ```bash
  npm run test:frontend
  npm run build
  ```

  Expected: all tests pass; TypeScript build clean.

- [ ] **Step 11: Manual smoke test.**

  ```bash
  npm run dev:web
  ```

  Open `http://localhost:3000/analyse` and verify:
  1. Enter a Chess.com or Lichess username with known games; click Analyse (or
     load from cache).
  2. Dashboard renders with Performance as White / Performance as Black columns.
  3. **No "As White / As Black" toggle on desktop.**
  4. **VIEW switcher** appears above both columns with `Variation · Family`.
  5. **ORDER switcher** appears in each section header with
     `Most played · Highest win rate · Lowest win rate`.
  6. Switching VIEW to Family renders leader-dot family rows: hairline rule
     above each, dotted leader between the family name and the WR%, WR% in cream
     (white side) or amber (black side) at display weight, "Best <name> — <pct>%
     · Needs work <name> — <pct>%" beneath.
  7. WR% counts up from 0 on first render (skipped under reduced-motion).
  8. Clicking a family row expands it; variations appear indented below with
     their own dotted leaders.
  9. Changing white ORDER to "Lowest win rate" reorders only the white column.
  10. If the player has uncategorised openings, the _"+ N uncategorised openings
      · X games · YY%"_ footnote appears below each section's family list,
      italic and muted.
  11. Mobile (resize <960px or use devtools): As White / As Black toggle still
      present, VIEW + ORDER switchers still present, family rows render at full
      column width.

- [ ] **Step 12: Commit.**

  ```bash
  git add packages/web/src/components/personal/PersonalOpeningStats.tsx \
          packages/web/src/components/personal/PersonalOpeningStats.module.css \
          packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx
  git commit -m "feat(personal): wire family rollup redesign + drop legacy CSS"
  ```

---

## Task 9: Verification & memory bank update

- [ ] **Step 1: Run the full repo test suite.**

  ```bash
  npm run test:all
  ```

  Expected: backend Jest suite (652+ tests) passes; frontend Vitest suite
  passes.

- [ ] **Step 2: Check formatting and run Prettier.**

  ```bash
  npm run format
  npm run format:check
  ```

  Expected: clean.

- [ ] **Step 3: Update memory bank.**

  Edit `.github/memory-bank/activeContext.md` to replace the current task
  description with a one-paragraph summary of what landed:

  ```markdown
  ## Current task

  **Family rollup redesign (Phase 1 follow-up).** Replaced Phase 1's broken
  family-rollup UI with the editorial leader-dot row pattern. New shared
  `InlineLinkSwitch` primitive powers `AnalyseToolbar` (VIEW) and
  `SectionToolbar` (ORDER); `FamilyRow` renders the leader-dot row with
  result-coloured WR%, best/weak sub-meta, and Best/Needs-work editorial
  phrasing; `UncategorisedFootnote` replaces the "Other" peer-row with a
  footnote-strip; `useCountUp` animates the WR% on first render with
  reduced-motion handling. `familyAggregation` now returns
  `{ rows, uncategorised }` and accepts a sortMode. The broken Phase 1 CSS block
  (PersonalOpeningStats.module.css:2037–2123) is deleted.
  ```

  Edit `.github/memory-bank/progress.md` to add a one-liner under the
  most-recent-completed list:

  ```markdown
  - 2026-05-09 — Family rollup redesign: editorial leader-dot rows, inline-link
    toolbars, footnote-strip Other, count-up animation.
  ```

- [ ] **Step 4: Commit memory bank.**

  ```bash
  git add .github/memory-bank/activeContext.md .github/memory-bank/progress.md
  git commit -m "docs(memory): record family rollup redesign completion"
  ```

- [ ] **Step 5: Push the branch.**

  ```bash
  git push origin feature/opening-family-rollups
  ```

- [ ] **Step 6: Final sanity check.**

  ```bash
  git log --oneline feature/opening-family-rollups...origin/main | head -20
  git status --short
  ```

  Expected: clean working tree, branch ahead of main by N+9 commits (where N is
  whatever Phase 1 added).

---

## Out of scope reminder

These are NOT part of this plan; resist the temptation:

- Migrating `.platformToggle` (Chess.com / Lichess) to `InlineLinkSwitch`.
- Adding tooltips to the WR% explaining the score formula.
- Phase 2 family-lens routes (`/family/:slug`), chip system, family search
  filter.
- Phase 3 repertoire grouping.
- Hero-card changes (Top-performing / Needs work cards above the columns).
- Pawn-glyph disclosure marker (stretch goal — pursue only if Task 7 finishes
  ahead of estimate; the chevron is shippable).
