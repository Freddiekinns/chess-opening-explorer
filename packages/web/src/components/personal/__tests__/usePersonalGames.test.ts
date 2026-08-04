import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersonalGames } from '../usePersonalGames';

/**
 * Cancelling is not failing.
 *
 * `handleCancel` aborts the controller, which rejects the in-flight games
 * fetch with an AbortError. The catch treated that like any other error, so
 * pressing Cancel put "signal is aborted without reason" in front of the user
 * under a red alert — for a button they pressed on purpose. The only abort
 * guard covered the classification phase, which is reached after the fetch
 * that Cancel usually interrupts.
 */

const noOpenings = async () => [];

/** A fetch that never resolves on its own and rejects the moment it is aborted. */
const abortableFetch = vi.fn(
  (_url: string, init?: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('signal is aborted without reason', 'AbortError'))
      );
    })
);

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('fetch', abortableFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  abortableFetch.mockClear();
});

describe('usePersonalGames cancellation', () => {
  it('returns to idle without reporting an error', async () => {
    const { result } = renderHook(() => usePersonalGames(noOpenings));

    act(() => result.current.setUsername('magnus'));
    act(() => {
      void result.current.handleAnalyse();
    });

    await waitFor(() => expect(result.current.step).toBe('fetching'));

    act(() => result.current.handleCancel());

    await waitFor(() => expect(result.current.step).toBe('idle'));
    // Give the rejected fetch a turn to reach the catch it used to trip.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
