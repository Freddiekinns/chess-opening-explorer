import { describe, it, expect } from 'vitest';
import { isChessMove, summariseResults } from '../searchResultsSummary';

const result = (moves: string) => ({ moves });

describe('summariseResults', () => {
  it('says nothing when there is nothing to count', () => {
    expect(summariseResults({ query: 'sicilian', results: [] })).toBe('');
  });

  it('counts what is on screen', () => {
    const results = Array.from({ length: 14 }, () => result('1. d4 d5 2. c4'));
    expect(summariseResults({ query: 'queens gambit', results })).toBe('14 openings match');
  });

  it('keeps the verb singular for one match', () => {
    expect(summariseResults({ query: 'sicilian', results: [result('1. e4 c5')] })).toBe(
      '1 opening matches'
    );
  });

  // The count is the only place a user can learn the list is a top slice —
  // the design has no "load more" button to imply it.
  it('admits when more matches exist than the list can reach', () => {
    const results = Array.from({ length: 20 }, () => result('1. e4 e5'));
    expect(summariseResults({ query: 'defense', results, total: 143 })).toBe('Top 20 matches');
  });

  // The search counts everything scoring above zero — 4,269 for "sicilian",
  // against a family of roughly 1,710. Printing it would read as a claim
  // about how many Sicilians exist.
  it('never prints the underlying total', () => {
    const results = Array.from({ length: 20 }, () => result('1. e4 c5'));
    expect(summariseResults({ query: 'sicilian', results, total: 4269 })).not.toMatch(/4,?269/);
  });

  it('does not claim truncation when the total equals what is shown', () => {
    const results = Array.from({ length: 3 }, () => result('1. e4 e5'));
    expect(summariseResults({ query: 'italian', results, total: 3 })).toBe('3 openings match');
  });

  describe('move queries', () => {
    it('names the move when every result opens with it', () => {
      const results = [result('1. d4 d5 2. Bf4'), result('1. d4 d5 2. c4'), result('1. d4 Nf6')];
      expect(summariseResults({ query: 'd4', results })).toBe('3 openings begin with 1. d4');
    });

    // The scorer also matches moves further down the line, so a single result
    // that merely contains the move makes "begin with" false for the list.
    it('falls back to the neutral count when one result only contains the move', () => {
      const results = [result('1. d4 d5'), result('1. e4 c5 2. Nf3 d6 3. d4')];
      expect(summariseResults({ query: 'd4', results })).toBe('2 openings match');
    });

    // Case is semantic in algebraic notation: "nf3" is not a move.
    it('spells the move as the data does, not as the user typed it', () => {
      const results = [result('1. Nf3 d5'), result('1. Nf3 Nf6')];
      expect(summariseResults({ query: 'nf3', results })).toBe('2 openings begin with 1. Nf3');
    });

    it('handles a truncated move query', () => {
      const results = Array.from({ length: 20 }, () => result('1. e4 c5'));
      expect(summariseResults({ query: 'e4', results, total: 431 })).toBe(
        'Top 20 begin with 1. e4'
      );
    });

    it('keeps the verb singular for one move match', () => {
      expect(summariseResults({ query: 'd4', results: [result('1. d4 d5')] })).toBe(
        '1 opening begins with 1. d4'
      );
    });

    it('ignores a non-move query that happens to appear in the moves', () => {
      const results = [result('1. e4 c5'), result('1. e4 e5')];
      expect(summariseResults({ query: 'sicilian', results })).toBe('2 openings match');
    });

    it('tolerates a missing move list', () => {
      expect(summariseResults({ query: 'd4', results: [{}] })).toBe('1 opening matches');
    });
  });
});

describe('isChessMove', () => {
  it.each(['e4', 'd4', 'Nf3', 'nf3', 'O-O', 'o-o-o', 'exd5', 'Nxe5'])('accepts %s', (move) => {
    expect(isChessMove(move)).toBe(true);
  });

  it.each(['sicilian', 'B90', 'qgd', '1.e4', 'aggressive openings', ''])('rejects %s', (query) => {
    expect(isChessMove(query)).toBe(false);
  });
});
