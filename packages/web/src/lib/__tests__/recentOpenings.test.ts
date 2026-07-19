import { beforeEach, describe, expect, test } from 'vitest';
import { getRecentOpenings, recordRecentOpening } from '../recentOpenings';

function entry(fen: string, name = `Opening ${fen}`) {
  return { fen, name, eco: 'B02', moves: '1. e4 Nf6' };
}

beforeEach(() => {
  localStorage.clear();
});

describe('recentOpenings', () => {
  test('records newest first', () => {
    recordRecentOpening(entry('fen-1'));
    recordRecentOpening(entry('fen-2'));
    expect(getRecentOpenings().map((r) => r.fen)).toEqual(['fen-2', 'fen-1']);
  });

  test('re-viewing an opening moves it to the front without duplicating', () => {
    recordRecentOpening(entry('fen-1'));
    recordRecentOpening(entry('fen-2'));
    recordRecentOpening(entry('fen-1'));
    expect(getRecentOpenings().map((r) => r.fen)).toEqual(['fen-1', 'fen-2']);
  });

  test('caps the stored list at eight', () => {
    for (let i = 0; i < 12; i++) recordRecentOpening(entry(`fen-${i}`));
    const fens = getRecentOpenings().map((r) => r.fen);
    expect(fens).toHaveLength(8);
    expect(fens[0]).toBe('fen-11');
  });

  test('corrupt storage degrades to an empty list', () => {
    localStorage.setItem('chess-recent-openings', 'not json');
    expect(getRecentOpenings()).toEqual([]);
  });
});
