import { describe, expect, test } from 'vitest';
import {
  alternativesCaption,
  explorerSourceLine,
  gamesStatLabel,
  levelEcho,
  liveStatsView,
  movesCaption,
  snapshotStatsView,
} from '../explorerStats';
import type { ExplorerResult } from '../lichessExplorer';

function result(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
  return {
    totalGames: 1000,
    white: 420,
    draws: 60,
    black: 520,
    moves: [],
    topGames: [],
    averageRating: 1604,
    ...overrides,
  };
}

describe('levelEcho', () => {
  test('uses the rating range, not the learner label', () => {
    expect(levelEcho('1400')).toBe('1400–1800');
    expect(levelEcho('all')).toBe('all ratings');
    expect(levelEcho('u1400')).toBe('under 1400');
  });

  test('masters echoes as "masters", so labels do not read "Games · master games"', () => {
    expect(levelEcho('masters')).toBe('masters');
  });
});

describe('explorerSourceLine', () => {
  test('names Lichess and the level when the data is live', () => {
    expect(explorerSourceLine('1400', true)).toBe('Lichess · 1400–1800');
  });

  test('never claims live data when serving the snapshot', () => {
    expect(explorerSourceLine('1400', false, '2025-07-15')).toBe(
      'Saved snapshot · updated 2025-07-15'
    );
    expect(explorerSourceLine(null, false)).toBe('Saved snapshot · all rated games');
  });
});

describe('labels', () => {
  test('the games figure is scoped to the level when live', () => {
    expect(gamesStatLabel('1800', true)).toBe('Games · 1800–2200');
    expect(gamesStatLabel('1800', false)).toBe('Total games');
    expect(gamesStatLabel(null, false)).toBe('Total games');
  });

  test('captions echo the level so the scope survives the header scrolling away', () => {
    expect(movesCaption('1400', true)).toBe('Most popular at 1400–1800');
    expect(movesCaption('1400', false)).toBe('Most popular next moves');
    expect(alternativesCaption('all', true)).toBe('Most popular alternatives at all ratings');
    expect(alternativesCaption(null, false)).toBe('Most popular alternatives');
  });
});

describe('stat views', () => {
  test('builds a live view with rounded percentages and a formatted Elo', () => {
    expect(liveStatsView(result())).toEqual({
      games: '1k',
      elo: '1,604',
      whitePct: 42,
      drawPct: 6,
      blackPct: 52,
    });
  });

  test('refuses to publish numbers from a thin sample', () => {
    expect(liveStatsView(result({ totalGames: 40, white: 20, draws: 5, black: 15 }))).toBeNull();
  });

  test('omits Elo rather than inventing one', () => {
    expect(liveStatsView(result({ averageRating: null }))?.elo).toBeNull();
  });

  test('builds a snapshot view, and nothing at all without games', () => {
    expect(
      snapshotStatsView({
        games_analyzed: 54321,
        white_win_rate: 0.5,
        draw_rate: 0.05,
        black_win_rate: 0.45,
        avg_rating: 2016,
      })
    ).toEqual({ games: '54.3k', elo: '2,016', whitePct: 50, drawPct: 5, blackPct: 45 });
    expect(snapshotStatsView(null)).toBeNull();
    expect(snapshotStatsView({ games_analyzed: 0 })).toBeNull();
  });
});
