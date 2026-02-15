/**
 * @fileoverview Unit tests for PGN parsing utilities
 */

import { describe, test, expect } from 'vitest';
import {
  extractMoveText,
  validatePGN,
  generateFENsFromPGN,
  buildOpeningsMap,
  findDeepestMatch,
  lookupOpeningFromPGN,
  OpeningForLookup,
} from '../../src/utils/pgn-utils.js';

describe('extractMoveText', () => {
  test('should extract moves from simple PGN', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3 Nc6');
  });

  test('should strip PGN headers', () => {
    const pgn = `[Event "Casual Game"]
[Site "London"]
[Date "1851.06.21"]
[White "Anderssen, Adolf"]

1. e4 e5 2. f4`;
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. f4');
  });

  test('should remove curly brace comments', () => {
    const pgn = '1. e4 {King pawn opening} e5 {symmetric response} 2. Nf3';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });

  test('should remove semicolon comments', () => {
    const pgn = '1. e4 ; King pawn\ne5 2. Nf3';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });

  test('should remove result markers', () => {
    expect(extractMoveText('1. e4 e5 1-0')).toBe('1. e4 e5');
    expect(extractMoveText('1. e4 e5 0-1')).toBe('1. e4 e5');
    expect(extractMoveText('1. e4 e5 1/2-1/2')).toBe('1. e4 e5');
    expect(extractMoveText('1. e4 e5 *')).toBe('1. e4 e5');
  });

  test('should remove NAG annotations', () => {
    const pgn = '1. e4 $1 e5 $2 2. Nf3 $6';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });

  test('should remove variations in parentheses', () => {
    const pgn = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });

  test('should handle nested variations', () => {
    const pgn = '1. e4 e5 (1... c5 (1... e6)) 2. Nf3';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });

  test('should return empty string for empty input', () => {
    expect(extractMoveText('')).toBe('');
    expect(extractMoveText(null as unknown as string)).toBe('');
    expect(extractMoveText(undefined as unknown as string)).toBe('');
  });

  test('should collapse multiple whitespace', () => {
    const pgn = '1. e4   e5    2.  Nf3';
    expect(extractMoveText(pgn)).toBe('1. e4 e5 2. Nf3');
  });
});

describe('validatePGN', () => {
  test('should validate correct PGN', () => {
    const result = validatePGN('1. e4 e5 2. Nf3 Nc6');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should validate PGN with headers', () => {
    const pgn = `[Event "Test"]
1. e4 e5 2. Nf3`;
    const result = validatePGN(pgn);
    expect(result.valid).toBe(true);
  });

  test('should reject invalid move', () => {
    const result = validatePGN('1. e4 e5 2. Nf6'); // Nf6 is invalid for white
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid move');
  });

  test('should reject empty PGN', () => {
    const result = validatePGN('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('PGN text is required');
  });

  test('should reject PGN with no moves', () => {
    const result = validatePGN('[Event "Test"]');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No moves found in PGN');
  });

  test('should validate castling moves', () => {
    // Italian Game with kingside castling
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O';
    const result = validatePGN(pgn);
    expect(result.valid).toBe(true);
  });

  test('should validate pawn promotion', () => {
    // A contrived sequence ending in promotion
    const pgn = '1. e4 d5 2. exd5 c6 3. dxc6 Nf6 4. cxb7 Bd7 5. bxa8=Q';
    const result = validatePGN(pgn);
    expect(result.valid).toBe(true);
  });

  test('should handle moves without move numbers', () => {
    const result = validatePGN('e4 e5 Nf3 Nc6');
    expect(result.valid).toBe(true);
  });
});

describe('generateFENsFromPGN', () => {
  test('should generate FEN after each move', () => {
    const pgn = '1. e4 e5';
    const fens = generateFENsFromPGN(pgn);

    expect(fens).toHaveLength(2);
    // After 1. e4 - check position portion (chess.js may vary en passant notation)
    expect(fens[0]).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq');
    // After 1... e5
    expect(fens[1]).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq');
  });

  test('should return empty array for empty input', () => {
    expect(generateFENsFromPGN('')).toEqual([]);
  });

  test('should stop at invalid move', () => {
    const pgn = '1. e4 e5 2. Nf6 Nc6'; // Nf6 is invalid
    const fens = generateFENsFromPGN(pgn);
    expect(fens).toHaveLength(2); // Only e4 and e5 are valid
  });

  test('should handle Sicilian Defense', () => {
    const pgn = '1. e4 c5 2. Nf3';
    const fens = generateFENsFromPGN(pgn);
    expect(fens).toHaveLength(3);
    // After 1... c5 (Sicilian)
    expect(fens[1]).toContain('rnbqkbnr/pp1ppppp/8/2p5');
  });

  test('should handle longer game sequences', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5';
    const fens = generateFENsFromPGN(pgn);
    expect(fens).toHaveLength(6);
  });
});

describe('buildOpeningsMap', () => {
  const mockOpenings: OpeningForLookup[] = [
    {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      name: "King's Pawn Game",
      eco: 'C20',
    },
    {
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
      name: 'Sicilian Defense',
      eco: 'B20',
    },
  ];

  test('should build map from openings array', () => {
    const map = buildOpeningsMap(mockOpenings);
    expect(map.size).toBe(2);
  });

  test('should normalize FEN keys (strip move counters)', () => {
    const map = buildOpeningsMap(mockOpenings);
    // The key should be the first 4 parts of FEN
    const key = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6';
    expect(map.has(key)).toBe(true);
  });

  test('should handle empty array', () => {
    const map = buildOpeningsMap([]);
    expect(map.size).toBe(0);
  });

  test('should skip openings without FEN', () => {
    const openings = [{ fen: '', name: 'No FEN', eco: 'A00' }, ...mockOpenings];
    const map = buildOpeningsMap(openings);
    expect(map.size).toBe(2);
  });
});

describe('findDeepestMatch', () => {
  const mockOpenings: OpeningForLookup[] = [
    {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      name: "King's Pawn Opening",
      eco: 'B00',
    },
    {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      name: "King's Pawn Game",
      eco: 'C20',
    },
    {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      name: "King's Knight Opening",
      eco: 'C40',
    },
  ];

  test('should find exact end match', () => {
    const fens = generateFENsFromPGN('1. e4 e5 2. Nf3');
    const map = buildOpeningsMap(mockOpenings);
    const result = findDeepestMatch(fens, map);

    expect(result.success).toBe(true);
    expect(result.bestMatch).not.toBeNull();
    expect(result.bestMatch?.name).toBe("King's Knight Opening");
    expect(result.bestMatch?.isExactEndMatch).toBe(true);
    expect(result.bestMatch?.matchedAtMove).toBe(3);
  });

  test('should find partial match when game extends beyond known openings', () => {
    const fens = generateFENsFromPGN('1. e4 e5 2. Nf3 Nc6 3. d4'); // extends beyond known
    const map = buildOpeningsMap(mockOpenings);
    const result = findDeepestMatch(fens, map);

    expect(result.success).toBe(true);
    expect(result.bestMatch?.name).toBe("King's Knight Opening");
    expect(result.bestMatch?.isExactEndMatch).toBe(false);
    expect(result.bestMatch?.matchedAtMove).toBe(3);
  });

  test('should return no match for unknown positions', () => {
    // Some weird moves that don't match known openings
    const fens = generateFENsFromPGN('1. a4 h5 2. Ra3');
    const map = buildOpeningsMap(mockOpenings);
    const result = findDeepestMatch(fens, map);

    expect(result.success).toBe(false);
    expect(result.bestMatch).toBeNull();
  });

  test('should handle empty FEN array', () => {
    const map = buildOpeningsMap(mockOpenings);
    const result = findDeepestMatch([], map);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No positions to search');
    expect(result.totalMoves).toBe(0);
  });

  test('should track total moves', () => {
    const fens = generateFENsFromPGN('1. e4 e5 2. Nf3 Nc6');
    const map = buildOpeningsMap(mockOpenings);
    const result = findDeepestMatch(fens, map);

    expect(result.totalMoves).toBe(4);
  });
});

describe('lookupOpeningFromPGN', () => {
  const mockOpenings: OpeningForLookup[] = [
    {
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
      name: 'Sicilian Defense',
      eco: 'B20',
    },
    {
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      name: 'Sicilian Defense: Open',
      eco: 'B27',
    },
  ];

  test('should find Sicilian Defense from PGN', () => {
    const pgn = '1. e4 c5 2. Nf3';
    const map = buildOpeningsMap(mockOpenings);
    const result = lookupOpeningFromPGN(pgn, map);

    expect(result.success).toBe(true);
    expect(result.bestMatch?.name).toBe('Sicilian Defense: Open');
    expect(result.bestMatch?.eco).toBe('B27');
  });

  test('should handle full PGN with headers', () => {
    const pgn = `[Event "Casual Game"]
[Site "Internet"]
[Date "2024.01.01"]
[White "Player1"]
[Black "Player2"]
[Result "*"]

1. e4 c5 2. Nf3 *`;
    const map = buildOpeningsMap(mockOpenings);
    const result = lookupOpeningFromPGN(pgn, map);

    expect(result.success).toBe(true);
    expect(result.bestMatch?.name).toBe('Sicilian Defense: Open');
  });

  test('should return error for invalid PGN', () => {
    const pgn = '1. e4 e5 2. Nf6'; // Invalid move
    const map = buildOpeningsMap(mockOpenings);
    const result = lookupOpeningFromPGN(pgn, map);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid move');
  });

  test('should return error for empty PGN', () => {
    const map = buildOpeningsMap(mockOpenings);
    const result = lookupOpeningFromPGN('', map);

    expect(result.success).toBe(false);
    expect(result.error).toBe('PGN text is required');
  });
});
