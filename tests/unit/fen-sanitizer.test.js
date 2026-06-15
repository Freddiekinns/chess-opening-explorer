/**
 * Test Suite: FEN sanitiser (shared by video pipeline + API lookups)
 */

const {
  sanitizeFenKey,
  legacySanitizeFenKey,
} = require('../../packages/api/src/utils/fen-sanitizer');

describe('fen-sanitizer', () => {
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('produces filename-safe keys', () => {
    const key = sanitizeFenKey(START_FEN);
    expect(key).toMatch(/^[a-z0-9_-]+$/);
    expect(key).not.toContain('/');
    expect(key).not.toContain(' ');
  });

  it('preserves the case distinction that the legacy scheme destroyed', () => {
    // Real ECO collision pair: identical when lowercased, distinct positions
    const fenA = 'rnbqkbnr/pppp1ppp/8/8/3pPP2/8/PPP3PP/RNBQKBNR b KQkq - 0 3';
    const fenB = 'rnbqkbnr/pppp1ppp/8/8/3PPp2/8/PPP3PP/RNBQKBNR b KQkq - 0 3';

    expect(legacySanitizeFenKey(fenA)).toBe(legacySanitizeFenKey(fenB));
    expect(sanitizeFenKey(fenA)).not.toBe(sanitizeFenKey(fenB));
  });

  it('escapes uppercase unambiguously (0 + lowercase letter)', () => {
    expect(sanitizeFenKey('K w - - 0 1')).toBe('0k-w-----0-1');
  });

  it('legacy scheme matches the keys in the deployed video index', () => {
    const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
    expect(legacySanitizeFenKey(fen)).toBe(
      'rnbqkbnr_pp1ppppp_8_2p5_4p3_8_pppp1ppp_rnbqkbnr-w-kqkq-c6-0-2'
    );
  });

  it('rejects invalid input', () => {
    expect(() => sanitizeFenKey('')).toThrow('FEN must be a non-empty string');
    expect(() => sanitizeFenKey(null)).toThrow('FEN must be a non-empty string');
    expect(() => legacySanitizeFenKey(123)).toThrow('FEN must be a non-empty string');
  });
});
