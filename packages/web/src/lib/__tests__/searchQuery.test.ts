import { describe, it, expect } from 'vitest';
import { isChessMove } from '../searchQuery';

describe('isChessMove', () => {
  it.each(['e4', 'd4', 'Nf3', 'nf3', 'O-O', 'o-o-o', 'exd5', 'Nxe5'])('accepts %s', (move) => {
    expect(isChessMove(move)).toBe(true);
  });

  it.each(['sicilian', 'B90', 'qgd', '1.e4', 'aggressive openings', ''])('rejects %s', (query) => {
    expect(isChessMove(query)).toBe(false);
  });
});
