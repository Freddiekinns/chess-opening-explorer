/**
 * Unit Tests for PGN Matcher
 * Tests chapter splitting, FEN generation, and opening matching
 */

const {
  splitPGNIntoChapters,
  extractHeader,
  extractMoveText,
  generateFENsFromPGN,
  normalizeFEN,
  matchFENsToOpenings,
  loadECOIndex,
} = require('../../tools/course-discovery/lib/pgn-matcher');

describe('splitPGNIntoChapters', () => {
  const multiChapterPGN = `[Event "Main Line"]
[Site "https://lichess.org/study/abc123/ch001"]
[Date "2024.01.01"]
[White "?"]
[Black "?"]
[Result "*"]

1. e4 e6 2. d4 d5 *

[Event "Winawer Variation"]
[Site "https://lichess.org/study/abc123/ch002"]
[Date "2024.01.01"]
[White "?"]
[Black "?"]
[Result "*"]

1. e4 e6 2. d4 d5 3. Nc3 Bb4 *`;

  test('should split multi-chapter PGN into individual chapters', () => {
    const chapters = splitPGNIntoChapters(multiChapterPGN);
    expect(chapters).toHaveLength(2);
  });

  test('should extract chapter names from Event headers', () => {
    const chapters = splitPGNIntoChapters(multiChapterPGN);
    expect(chapters[0].chapterName).toBe('Main Line');
    expect(chapters[1].chapterName).toBe('Winawer Variation');
  });

  test('should extract studyId and chapterId from Site header', () => {
    const chapters = splitPGNIntoChapters(multiChapterPGN);
    expect(chapters[0].studyId).toBe('abc123');
    expect(chapters[0].chapterId).toBe('ch001');
    expect(chapters[1].studyId).toBe('abc123');
    expect(chapters[1].chapterId).toBe('ch002');
  });

  test('should preserve PGN content for each chapter', () => {
    const chapters = splitPGNIntoChapters(multiChapterPGN);
    expect(chapters[0].pgn).toContain('1. e4 e6 2. d4 d5');
    expect(chapters[1].pgn).toContain('3. Nc3 Bb4');
  });

  test('should handle single chapter PGN', () => {
    const singleChapter = `[Event "Only Chapter"]
[Site "https://lichess.org/study/xyz789/ch001"]

1. e4 e5 *`;

    const chapters = splitPGNIntoChapters(singleChapter);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].chapterName).toBe('Only Chapter');
  });

  test('should handle missing Site header', () => {
    const noSite = `[Event "No Site"]

1. e4 e5 *`;

    const chapters = splitPGNIntoChapters(noSite);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].studyId).toBeNull();
    expect(chapters[0].chapterId).toBeNull();
  });

  test('should return empty array for null/empty input', () => {
    expect(splitPGNIntoChapters(null)).toEqual([]);
    expect(splitPGNIntoChapters('')).toEqual([]);
    expect(splitPGNIntoChapters(undefined)).toEqual([]);
  });
});

describe('extractHeader', () => {
  test('should extract Event header', () => {
    const pgn = '[Event "French Defense"]\n[Site "https://lichess.org"]';
    expect(extractHeader(pgn, 'Event')).toBe('French Defense');
  });

  test('should extract Site header', () => {
    const pgn = '[Site "https://lichess.org/study/abc/def"]';
    expect(extractHeader(pgn, 'Site')).toBe('https://lichess.org/study/abc/def');
  });

  test('should return null for missing header', () => {
    const pgn = '[Event "Test"]';
    expect(extractHeader(pgn, 'Site')).toBeNull();
  });
});

describe('extractMoveText', () => {
  test('should strip headers and return moves', () => {
    const pgn = `[Event "Test"]
[Site "test"]

1. e4 e5 2. Nf3 Nc6 *`;

    const result = extractMoveText(pgn);
    expect(result).toBe('1. e4 e5 2. Nf3 Nc6');
  });

  test('should remove comments in curly braces', () => {
    const pgn = '1. e4 {best move} e5 {standard reply}';
    const result = extractMoveText(pgn);
    expect(result).toBe('1. e4 e5');
  });

  test('should remove variations in parentheses', () => {
    const pgn = '1. e4 e5 (1... c5) 2. Nf3';
    const result = extractMoveText(pgn);
    expect(result).toBe('1. e4 e5 2. Nf3');
  });

  test('should remove result markers', () => {
    const pgn = '1. e4 e5 1-0';
    const result = extractMoveText(pgn);
    expect(result).toBe('1. e4 e5');
  });

  test('should handle empty input', () => {
    expect(extractMoveText(null)).toBe('');
    expect(extractMoveText('')).toBe('');
  });
});

describe('generateFENsFromPGN', () => {
  test('should generate FENs for French Defense opening', () => {
    const pgn = '1. e4 e6 2. d4 d5';
    const fens = generateFENsFromPGN(pgn);

    expect(fens).toHaveLength(4);
    // After 1. e4
    expect(fens[0]).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    // After 1... e6
    expect(fens[1]).toContain('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR');
  });

  test('should handle PGN with headers', () => {
    const pgn = `[Event "Test"]
[Site "test"]

1. e4 e5 *`;

    const fens = generateFENsFromPGN(pgn);
    expect(fens).toHaveLength(2);
  });

  test('should stop on invalid move', () => {
    const pgn = '1. e4 e5 2. Zz9';
    const fens = generateFENsFromPGN(pgn);
    // Should get 2 valid FENs (e4, e5) then stop
    expect(fens).toHaveLength(2);
  });

  test('should return empty array for empty input', () => {
    expect(generateFENsFromPGN(null)).toEqual([]);
    expect(generateFENsFromPGN('')).toEqual([]);
    expect(generateFENsFromPGN('no moves here')).toEqual([]);
  });
});

describe('normalizeFEN', () => {
  test('should strip halfmove and fullmove counters', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const normalized = normalizeFEN(fen);
    expect(normalized).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
  });

  test('should preserve position, turn, castling, en passant', () => {
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const normalized = normalizeFEN(fen);
    expect(normalized).toBe('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -');
  });

  test('should handle FEN with different move counters', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 5 10';
    expect(normalizeFEN(fen1)).toBe(normalizeFEN(fen2));
  });
});

describe('matchFENsToOpenings', () => {
  const mockEcoIndex = new Map();

  beforeAll(() => {
    // French Defense: 1. e4 e6
    mockEcoIndex.set('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -', {
      fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      name: 'French Defense',
      eco: 'C00',
    });
    // French Winawer: 1. e4 e6 2. d4 d5 3. Nc3 Bb4
    // Position after 3...Bb4: rnbqk1nr (b8-knight still present, f8-bishop moved to b4)
    mockEcoIndex.set('rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq -', {
      fen: 'rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4',
      name: 'French Winawer',
      eco: 'C15',
    });
  });

  test('should find deepest match (Winawer over French)', () => {
    // PGN: 1. e4 e6 2. d4 d5 3. Nc3 Bb4
    const pgn = '1. e4 e6 2. d4 d5 3. Nc3 Bb4';
    const fens = generateFENsFromPGN(pgn);
    const match = matchFENsToOpenings(fens, mockEcoIndex);

    expect(match).not.toBeNull();
    expect(match.name).toBe('French Winawer');
    expect(match.eco).toBe('C15');
  });

  test('should match broader opening when deeper not available', () => {
    // PGN: 1. e4 e6 (just the French Defense, no Winawer)
    const fens = generateFENsFromPGN('1. e4 e6');
    const match = matchFENsToOpenings(fens, mockEcoIndex);

    expect(match).not.toBeNull();
    expect(match.name).toBe('French Defense');
    expect(match.eco).toBe('C00');
  });

  test('should return null when no FENs match', () => {
    // An endgame position
    const fens = ['8/8/4k3/8/8/4K3/8/8 w - - 0 1'];
    const match = matchFENsToOpenings(fens, mockEcoIndex);
    expect(match).toBeNull();
  });

  test('should return null for empty FEN array', () => {
    expect(matchFENsToOpenings([], mockEcoIndex)).toBeNull();
    expect(matchFENsToOpenings(null, mockEcoIndex)).toBeNull();
  });

  test('should include matchedAtMove in result', () => {
    const fens = generateFENsFromPGN('1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5');
    const match = matchFENsToOpenings(fens, mockEcoIndex);

    expect(match.matchedAtMove).toBe(6); // Bb4 is the 6th half-move
  });
});

describe('loadECOIndex', () => {
  test('should load ECO data from default directory', () => {
    const index = loadECOIndex();

    expect(index.size).toBeGreaterThan(0);

    // Check a known opening exists (French Defense)
    const frenchFEN = normalizeFEN('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    const french = index.get(frenchFEN);
    expect(french).toBeDefined();
    expect(french.name).toMatch(/French/i);
  });

  test('should handle missing directory gracefully', () => {
    const index = loadECOIndex('/nonexistent/path');
    expect(index.size).toBe(0);
  });

  test('should normalize FEN keys (strip move counters)', () => {
    const index = loadECOIndex();

    // All keys should have exactly 4 parts
    for (const key of index.keys()) {
      const parts = key.split(' ');
      expect(parts).toHaveLength(4);
    }
  });
});
