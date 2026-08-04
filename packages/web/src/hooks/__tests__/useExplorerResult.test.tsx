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
import { useExplorerQuery } from '../useExplorerResult';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  fetchExplorerMock.mockReset();
  vi.mocked(trackEvent).mockClear();
});

describe('useExplorerQuery', () => {
  test('reports the status when a band fetch fails', async () => {
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    const { result } = renderHook(() => useExplorerQuery(FEN, '1400'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 429 });
  });

  test('reports without a status when the failure carries none', async () => {
    fetchExplorerMock.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useExplorerQuery(FEN, 'all'));

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
    const { result } = renderHook(() => useExplorerQuery(FEN, 'all'));

    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
