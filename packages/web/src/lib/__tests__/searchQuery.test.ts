import { describe, it, expect } from 'vitest';
import { expandAbbreviations, isChessMove, isEcoCode } from '../searchQuery';

describe('isChessMove', () => {
  it.each(['e4', 'd4', 'Nf3', 'nf3', 'O-O', 'o-o-o', 'exd5', 'Nxe5'])('accepts %s', (move) => {
    expect(isChessMove(move)).toBe(true);
  });

  it.each(['sicilian', 'B90', 'qgd', '1.e4', 'aggressive openings', ''])('rejects %s', (query) => {
    expect(isChessMove(query)).toBe(false);
  });
});

describe('isEcoCode', () => {
  it.each(['B90', 'b90', 'A00', 'E99', ' c42 '])('accepts %s', (query) => {
    expect(isEcoCode(query)).toBe(true);
  });

  // Codes are exactly three characters, so a partial one is not a code.
  it.each(['B9', 'B900', 'F12', 'sicilian', 'e4', ''])('rejects %s', (query) => {
    expect(isEcoCode(query)).toBe(false);
  });
});

describe('expandAbbreviations', () => {
  it.each([
    ['qgd', "Queen's Gambit Declined"],
    ['KID', "King's Indian Defense"],
    ['  ck  ', 'Caro-Kann Defense'],
  ])('expands %s', (query, expected) => {
    expect(expandAbbreviations(query)).toBe(expected);
  });

  it('leaves anything it does not know alone', () => {
    expect(expandAbbreviations('sicilian najdorf variation')).toBe('sicilian najdorf variation');
  });
});
