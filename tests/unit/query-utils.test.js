/**
 * Unit Tests for QueryUtils
 * Tests all static methods in the QueryUtils helper class.
 */

const QueryUtils = require('../../packages/api/src/services/search/QueryUtils');

describe('QueryUtils', () => {
  describe('isChessMove()', () => {
    test('returns true for a pawn move (e4)', () => {
      expect(QueryUtils.isChessMove('e4')).toBe(true);
    });

    test('returns true for a pawn move (d4)', () => {
      expect(QueryUtils.isChessMove('d4')).toBe(true);
    });

    test('returns true for a piece move (nf3)', () => {
      expect(QueryUtils.isChessMove('nf3')).toBe(true);
    });

    test('returns true for short castling (o-o)', () => {
      expect(QueryUtils.isChessMove('o-o')).toBe(true);
    });

    test('returns true for long castling (o-o-o)', () => {
      expect(QueryUtils.isChessMove('o-o-o')).toBe(true);
    });

    test('returns true for a pawn capture (exd5)', () => {
      expect(QueryUtils.isChessMove('exd5')).toBe(true);
    });

    test('returns false for an opening name', () => {
      expect(QueryUtils.isChessMove('sicilian')).toBe(false);
    });

    test('returns false for a natural language query', () => {
      expect(QueryUtils.isChessMove('aggressive opening')).toBe(false);
    });
  });

  describe('looksLikeOpeningName()', () => {
    test('returns true for "queen\'s gambit"', () => {
      expect(QueryUtils.looksLikeOpeningName("queen's gambit")).toBe(true);
    });

    test('returns true for "sicilian defense"', () => {
      expect(QueryUtils.looksLikeOpeningName('sicilian defense')).toBe(true);
    });

    test('returns true for "ruy lopez"', () => {
      expect(QueryUtils.looksLikeOpeningName('ruy lopez')).toBe(true);
    });

    test('returns true for "london system"', () => {
      expect(QueryUtils.looksLikeOpeningName('london system')).toBe(true);
    });

    test('returns false for a generic style query', () => {
      expect(QueryUtils.looksLikeOpeningName('aggressive')).toBe(false);
    });

    test('returns false for a chess move', () => {
      expect(QueryUtils.looksLikeOpeningName('e4')).toBe(false);
    });
  });

  describe('isAmbiguousSemanticTerm()', () => {
    test('returns true for "attacking"', () => {
      expect(QueryUtils.isAmbiguousSemanticTerm('attacking')).toBe(true);
    });

    test('returns true for "gambit"', () => {
      expect(QueryUtils.isAmbiguousSemanticTerm('gambit')).toBe(true);
    });

    test('returns true for "defense"', () => {
      expect(QueryUtils.isAmbiguousSemanticTerm('defense')).toBe(true);
    });

    test('returns false for "e4"', () => {
      expect(QueryUtils.isAmbiguousSemanticTerm('e4')).toBe(false);
    });

    test('returns false for an unrelated word', () => {
      expect(QueryUtils.isAmbiguousSemanticTerm('hello')).toBe(false);
    });
  });

  describe('extractMoves()', () => {
    test('extracts algebraic notation pawn move', () => {
      expect(QueryUtils.extractMoves('play d4 then Nf3')).toContain('d4');
    });

    test('extracts "queen\'s pawn" as d4', () => {
      expect(QueryUtils.extractMoves("queen's pawn openings")).toContain('d4');
    });

    test('extracts "queens pawn" as d4', () => {
      expect(QueryUtils.extractMoves('queens pawn')).toContain('d4');
    });

    test('extracts "king\'s pawn" as e4', () => {
      expect(QueryUtils.extractMoves("king's pawn")).toContain('e4');
    });

    test('extracts "e4" directly as e4', () => {
      expect(QueryUtils.extractMoves('e4 openings')).toContain('e4');
    });

    test('extracts "english" as c4', () => {
      expect(QueryUtils.extractMoves('english opening')).toContain('c4');
    });

    test('extracts "c4" directly as c4', () => {
      expect(QueryUtils.extractMoves('c4 systems')).toContain('c4');
    });

    test('extracts "reti" as nf3', () => {
      expect(QueryUtils.extractMoves('reti opening')).toContain('nf3');
    });

    test('extracts "bird" as f4', () => {
      expect(QueryUtils.extractMoves("bird's opening")).toContain('f4');
    });

    test('returns empty array when no moves are found', () => {
      expect(QueryUtils.extractMoves('solid positional play')).toEqual([]);
    });
  });

  describe('extractStylesFromText()', () => {
    test('extracts a known style word from text', () => {
      expect(QueryUtils.extractStylesFromText('aggressive openings')).toContain('aggressive');
    });

    test('extracts "solid" from text', () => {
      expect(QueryUtils.extractStylesFromText('solid lines for white')).toContain('solid');
    });

    test('returns empty array for text with no style words', () => {
      expect(QueryUtils.extractStylesFromText('hello world chess')).toEqual([]);
    });

    test('extracts multiple style words', () => {
      const styles = QueryUtils.extractStylesFromText('aggressive tactical openings');
      expect(styles).toContain('aggressive');
      expect(styles).toContain('tactical');
    });
  });

  describe('validateAndSanitize()', () => {
    test('throws when query is not a string', () => {
      expect(() => QueryUtils.validateAndSanitize(123)).toThrow('Query must be a string');
    });

    test('throws when query exceeds 200 characters', () => {
      expect(() => QueryUtils.validateAndSanitize('a'.repeat(201))).toThrow(
        'Query too long (max 200 characters)'
      );
    });

    test('accepts a query of exactly 200 characters', () => {
      expect(() => QueryUtils.validateAndSanitize('a'.repeat(200))).not.toThrow();
    });

    test('trims whitespace from the query', () => {
      const { query } = QueryUtils.validateAndSanitize('  test query  ');
      expect(query).toBe('test query');
    });

    test('defaults limit to 50', () => {
      const { options } = QueryUtils.validateAndSanitize('test');
      expect(options.limit).toBe(50);
    });

    test('defaults offset to 0', () => {
      const { options } = QueryUtils.validateAndSanitize('test');
      expect(options.offset).toBe(0);
    });

    test('clamps limit to maximum of 100', () => {
      const { options } = QueryUtils.validateAndSanitize('test', { limit: 999 });
      expect(options.limit).toBe(100);
    });

    test('clamps limit to minimum of 1 for negative values', () => {
      const { options } = QueryUtils.validateAndSanitize('test', { limit: -5 });
      expect(options.limit).toBe(1);
    });

    test('clamps offset to minimum of 0', () => {
      const { options } = QueryUtils.validateAndSanitize('test', { offset: -10 });
      expect(options.offset).toBe(0);
    });

    test('normalises category to lowercase', () => {
      const { options } = QueryUtils.validateAndSanitize('test', { category: 'TACTICAL' });
      expect(options.category).toBe('tactical');
    });

    test('leaves category undefined when not provided', () => {
      const { options } = QueryUtils.validateAndSanitize('test');
      expect(options.category).toBeUndefined();
    });

    test('accepts a valid limit within range', () => {
      const { options } = QueryUtils.validateAndSanitize('test', { limit: 25 });
      expect(options.limit).toBe(25);
    });
  });
});
