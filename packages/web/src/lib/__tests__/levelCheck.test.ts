import { describe, it, expect } from 'vitest';
import { computeLevelCheck } from '../levelCheck';
import type { ExplorerResult } from '../lichessExplorer';

const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function result(white: number, draws: number, black: number): ExplorerResult {
  return { totalGames: white + draws + black, white, draws, black, moves: [], topGames: [] };
}

describe('computeLevelCheck', () => {
  it('flags a line that works better at club level (white to move)', () => {
    // Masters: white scores 48%; club: white scores 56% — gap 8 pp.
    const masters = result(380, 200, 420); // (380+100)/1000 = 48%
    const club = result(460, 200, 340); // (460+100)/1000 = 56%
    const check = computeLevelCheck(masters, club, '1400', WHITE_TO_MOVE);
    expect(check).toEqual({
      side: 'White',
      mastersPct: 48,
      bandPct: 56,
      bandId: '1400',
      direction: 'band-better',
    });
  });

  it('flags a line masters score well with but club players struggle in', () => {
    const masters = result(560, 200, 240); // white 66%
    const club = result(400, 200, 400); // white 50%
    const check = computeLevelCheck(masters, club, '1800', WHITE_TO_MOVE);
    expect(check?.direction).toBe('masters-better');
    expect(check?.mastersPct).toBe(66);
    expect(check?.bandPct).toBe(50);
  });

  it('uses the black side score when black is to move', () => {
    // Black scores: masters (240+200/2)/1000 = 34%; club (420+200/2)/1000 = 52%.
    const masters = result(560, 200, 240);
    const club = result(380, 200, 420);
    const check = computeLevelCheck(masters, club, '1400', BLACK_TO_MOVE);
    expect(check?.side).toBe('Black');
    expect(check?.mastersPct).toBe(34);
    expect(check?.bandPct).toBe(52);
    expect(check?.direction).toBe('band-better');
  });

  it('returns null when the gap is under the threshold', () => {
    const masters = result(500, 200, 300); // white 60%
    const club = result(550, 200, 250); // white 65% — gap 5 pp
    expect(computeLevelCheck(masters, club, '1400', WHITE_TO_MOVE)).toBeNull();
  });

  it('returns null when either sample is under the minimum', () => {
    const thin = result(48, 20, 31); // 99 games
    const fat = result(560, 200, 240);
    expect(computeLevelCheck(thin, fat, '1400', WHITE_TO_MOVE)).toBeNull();
    expect(computeLevelCheck(fat, thin, '1400', WHITE_TO_MOVE)).toBeNull();
  });

  it('compares the gap before rounding', () => {
    // Masters 48.4% vs club 55.9%: gap 7.5 pp — under 8 even though the
    // rounded values (48 vs 56) read as 8 apart.
    const masters = result(384, 200, 416); // 48.4%
    const club = result(459, 200, 341); // 55.9%
    expect(computeLevelCheck(masters, club, '1400', WHITE_TO_MOVE)).toBeNull();
  });

  it('respects custom thresholds', () => {
    const masters = result(500, 200, 300); // 60%
    const club = result(550, 200, 250); // 65%
    const check = computeLevelCheck(masters, club, '1400', WHITE_TO_MOVE, {
      minGapPp: 4,
    });
    expect(check?.direction).toBe('band-better');
  });
});
