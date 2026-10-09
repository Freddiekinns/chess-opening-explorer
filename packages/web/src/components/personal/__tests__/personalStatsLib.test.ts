import { describe, it, expect } from 'vitest';
import { findBestOpening, findWeakestOpening, type OpeningAgg } from '../personalStatsLib';

const line = (name: string, win: number, draw: number, loss: number): OpeningAgg => ({
  fen: name,
  name,
  eco: 'A00',
  moves: '',
  games: win + draw + loss,
  win,
  draw,
  loss,
});

// The highlight cards headline one variation each. Players spread their games
// thin — the 100-game sample reports have 3–4 lines with 3+ games — so the
// floor is 3, and below it the card is omitted rather than filled with noise.
describe('findBestOpening', () => {
  it('returns null when no line has 3 games, rather than headlining the first one', () => {
    expect(findBestOpening([line('A', 2, 0, 0), line('B', 1, 0, 0)])).toBeNull();
  });

  it('headlines a 3-game line', () => {
    expect(findBestOpening([line('A', 2, 0, 0), line('B', 3, 0, 0)])?.name).toBe('B');
  });

  it('breaks a win-rate tie in favour of the line with more games', () => {
    expect(findBestOpening([line('A', 4, 0, 0), line('B', 9, 0, 0)])?.name).toBe('B');
  });
});

describe('findWeakestOpening', () => {
  it('returns null when no line has 3 games', () => {
    expect(findWeakestOpening([line('A', 0, 0, 2)])).toBeNull();
  });

  it('ranks by games lost, not loss rate', () => {
    const sideline = line('Sideline', 0, 0, 4);
    const mainLine = line('Main line', 6, 1, 5);
    expect(findWeakestOpening([sideline, mainLine])?.name).toBe('Main line');
  });

  it('never calls a line without a loss "needs work"', () => {
    expect(findWeakestOpening([line('A', 3, 1, 0)])).toBeNull();
  });

  it('breaks a games-lost tie on loss rate', () => {
    expect(findWeakestOpening([line('A', 5, 0, 3), line('B', 0, 0, 3)])?.name).toBe('B');
  });
});
