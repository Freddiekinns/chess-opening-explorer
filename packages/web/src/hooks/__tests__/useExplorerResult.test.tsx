import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const { fetchExplorerMock } = vi.hoisted(() => ({ fetchExplorerMock: vi.fn() }));
vi.mock('../../lib/lichessExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

import { trackEvent } from '../../lib/analytics';
import { ExplorerError } from '../../lib/lichessExplorer';
import { THIN_BAND, useExplorerQuery, type PageBands } from '../useExplorerResult';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  fetchExplorerMock.mockReset();
  vi.mocked(trackEvent).mockClear();
});

describe('useExplorerQuery', () => {
  test('reports the status when a band fetch fails', async () => {
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    const { result } = renderHook(() => useExplorerQuery(FEN, 'masters'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 429 });
  });

  test('reports without a status when the failure carries none', async () => {
    fetchExplorerMock.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useExplorerQuery(FEN, 'masters'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(trackEvent).toHaveBeenCalledWith('explorer_error');
  });

  test('stays silent on success', async () => {
    fetchExplorerMock.mockResolvedValue({
      totalGames: 10,
      white: 5,
      draws: 2,
      black: 3,
      moves: [],
      topGames: [],
      averageRating: null,
    });
    const { result } = renderHook(() => useExplorerQuery(FEN, 'masters'));

    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

const result = (totalGames: number) => ({
  totalGames,
  white: totalGames / 2,
  draws: 0,
  black: totalGames / 2,
  moves: [{ san: 'c5', games: totalGames, whitePct: 50, drawPct: 0, blackPct: 50 }],
  topGames: [],
  averageRating: 1600,
});

const PAGE_BANDS: PageBands = {
  all: result(5000),
  u1400: result(1000),
  1400: result(2000),
  1800: result(1500),
  2200: null,
};

describe('useExplorerQuery with the page response', () => {
  test('makes no request for Lichess bands: the page data answers', () => {
    const { result: query } = renderHook(() => useExplorerQuery(FEN, '1400', PAGE_BANDS));
    expect(query.current).toEqual({ result: PAGE_BANDS[1400], loading: false, failed: false });
    // Off-book rows come from these moves, so the book needs nothing else.
    expect(query.current.result?.moves[0].san).toBe('c5');
    expect(fetchExplorerMock).not.toHaveBeenCalled();
  });

  test('masters still fetches', async () => {
    fetchExplorerMock.mockResolvedValue(result(300));
    const { result: query } = renderHook(() => useExplorerQuery(FEN, 'masters', PAGE_BANDS));
    await waitFor(() => expect(query.current.result?.totalGames).toBe(300));
    expect(fetchExplorerMock).toHaveBeenCalledWith(FEN, 'masters');
  });

  test('waits, without fetching, until the page data arrives', () => {
    const { result: query } = renderHook(() => useExplorerQuery(FEN, '1400', undefined));
    expect(query.current).toEqual({ result: null, loading: true, failed: false });
    expect(fetchExplorerMock).not.toHaveBeenCalled();
  });

  test('page data the server could not read degrades to the snapshot', () => {
    const { result: query } = renderHook(() => useExplorerQuery(FEN, '1400', null));
    expect(query.current.failed).toBe(true);
  });

  test('a band too thin to count is a thin sample, never a placeholder that waits', () => {
    const { result: query } = renderHook(() => useExplorerQuery(FEN, '2200', PAGE_BANDS));
    expect(query.current).toEqual({ result: THIN_BAND, loading: false, failed: false });
  });
});
