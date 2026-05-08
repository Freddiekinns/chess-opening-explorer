import { describe, expect, test } from 'vitest';
import { groupByFamily, type OpeningAggInput, type FamilyMeta } from '../familyAggregation';

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
    const result = groupByFamily(input, families);
    const sicilian = result.find((r) => r.family_id === 'sicilian')!;
    expect(sicilian.games).toBe(7);
    expect(sicilian.wins).toBe(3);
    expect(sicilian.draws).toBe(2);
    expect(sicilian.losses).toBe(2);
    expect(sicilian.variation_count).toBe(2);
    expect(sicilian.score).toBeCloseTo((3 + 0.5 * 2) / 7);
  });

  test('groups missing family_id under uncategorised "Other"', () => {
    const input: OpeningAggInput[] = [
      ag({
        key: 'k1',
        family_id: undefined as any,
        family_display_name: undefined as any,
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
    ];
    const result = groupByFamily(input, families);
    expect(result).toHaveLength(1);
    expect(result[0].family_id).toBe('uncategorised');
    expect(result[0].display_name).toBe('Other');
    expect(result[0].games).toBe(5);
  });

  test('sorts by games descending', () => {
    const input: OpeningAggInput[] = [
      ag({ key: 'a', family_id: 'french', games: 1, wins: 1 }),
      ag({ key: 'b', family_id: 'sicilian', games: 9, wins: 9 }),
    ];
    const result = groupByFamily(input, families);
    expect(result.map((r) => r.family_id)).toEqual(['sicilian', 'french']);
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
    const [row] = groupByFamily(input, families);
    expect(row.variations.map((v) => v.name)).toEqual([
      'Sicilian: Dragon',
      'Sicilian: Najdorf',
      'Sicilian: Sveshnikov',
    ]);
  });

  test('preserves family display_name from families dict, falling back to family_display_name field', () => {
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
    const result = groupByFamily(input, families);
    const sicilian = result.find((r) => r.family_id === 'sicilian')!;
    expect(sicilian.display_name).toBe('Sicilian Defense'); // dict wins
    const mystery = result.find((r) => r.family_id === 'unknown-id')!;
    expect(mystery.display_name).toBe('Mystery Family'); // fallback
  });
});
