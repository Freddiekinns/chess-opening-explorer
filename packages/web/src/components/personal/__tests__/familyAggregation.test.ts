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
    const input: OpeningAggInput[] = [ag({ key: 'k1', family_id: 'sicilian', games: 3, wins: 2 })];
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
    expect(rows.find((r) => r.family_id === 'sicilian')!.display_name).toBe('Sicilian Defense');
    expect(rows.find((r) => r.family_id === 'unknown-id')!.display_name).toBe('Mystery Family');
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

  test('sortMode "best" with identical scores tie-breaks by games desc', () => {
    const input: OpeningAggInput[] = [
      // Both score 50%; french has more games so it should win the tie-break.
      ag({ key: 'a', family_id: 'sicilian', games: 4, wins: 2, draws: 0, losses: 2 }),
      ag({ key: 'b', family_id: 'french', games: 10, wins: 5, draws: 0, losses: 5 }),
    ];
    const { rows } = groupByFamily(input, families, 'best' as SortMode);
    expect(rows.map((r) => r.family_id)).toEqual(['french', 'sicilian']);
  });

  test('best/weak are isolated copies — mutating bucket.variations does not affect them', () => {
    const input: OpeningAggInput[] = [
      ag({ key: 'a', name: 'Sicilian: A', family_id: 'sicilian', games: 4, wins: 3 }),
      ag({ key: 'b', name: 'Sicilian: B', family_id: 'sicilian', games: 4, wins: 1 }),
    ];
    const { rows } = groupByFamily(input, families);
    const sicilian = rows[0];
    const originalBest = { ...sicilian.best_variation! };
    sicilian.variations[0].wins = 999;
    expect(sicilian.best_variation).toEqual(originalBest);
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
