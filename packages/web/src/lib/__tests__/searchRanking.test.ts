import { describe, it, expect } from 'vitest';
import { promoteSaved } from '../searchRanking';

const result = (name: string, searchScore: number, saved = false) => ({
  name,
  searchScore,
  saved,
});

const names = (list: { name: string }[]) => list.map((entry) => entry.name);

describe('promoteSaved', () => {
  it('lifts a saved opening above one it is tied with', () => {
    const ranked = [result('Najdorf', 1.5), result('Dragon', 1.5, true), result('Classical', 1.2)];

    expect(names(promoteSaved(ranked))).toEqual(['Dragon', 'Najdorf', 'Classical']);
  });

  it('leaves a saved opening where a better match beat it', () => {
    const ranked = [result('Najdorf', 5.4), result('Dragon', 1.2, true)];

    expect(names(promoteSaved(ranked))).toEqual(['Najdorf', 'Dragon']);
  });

  // The band is measured from the leader, not the previous row, so a long
  // gentle decay cannot chain a whole list into one tie.
  it('does not chain a slow decay into a single band', () => {
    const ranked = [
      result('A', 1.0),
      result('B', 0.99),
      result('C', 0.98),
      result('D', 0.97, true),
    ];

    expect(names(promoteSaved(ranked))).toEqual(['A', 'B', 'C', 'D']);
  });

  it('keeps the server order among saved openings in the same band', () => {
    const ranked = [
      result('First', 1.0),
      result('SavedEarly', 1.0, true),
      result('SavedLate', 0.99, true),
    ];

    expect(names(promoteSaved(ranked))).toEqual(['SavedEarly', 'SavedLate', 'First']);
  });

  // Scoreless results carry nothing that says which pairs are close. Guessing
  // would be inventing a ranking signal, so the server's order stands.
  it('returns an unscored list untouched', () => {
    const ranked = [
      { name: 'Najdorf', saved: false },
      { name: 'Dragon', saved: true },
    ];

    expect(names(promoteSaved(ranked))).toEqual(['Najdorf', 'Dragon']);
  });

  it('returns a list with nothing saved untouched', () => {
    const ranked = [result('Najdorf', 1.5), result('Dragon', 1.5)];

    expect(promoteSaved(ranked)).toBe(ranked);
  });
});
