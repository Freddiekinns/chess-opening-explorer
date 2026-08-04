import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpeningSearch } from '../useOpeningSearch';

/**
 * The hook owns the query for all three search surfaces, so the ordering
 * guarantees live here rather than in any one component.
 */

const result = (fen: string, name: string) => ({
  fen,
  name,
  eco: 'B20',
  moves: '1. e4 c5',
  searchScore: 5,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Resolve the debounce and let the queued promise callbacks run. */
const settle = async () => {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
};

describe('useOpeningSearch request ordering', () => {
  /*
   * Clearing the debounce timer only cancels a request that has not left yet.
   * One already in flight still resolves, and its setServed used to land under
   * whatever the field says by then. "kings ind" costs two round trips when
   * semantic search comes back empty, so outliving the "kings indian" that
   * replaced it is ordinary, not exotic.
   */
  it('ignores a slow response that a newer query has superseded', async () => {
    const deferred: (() => void)[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const stale = url.includes('kings%20ind&');
        const payload = {
          ok: true,
          json: async () => ({
            success: true,
            data: [stale ? result('fen-stale', 'Stale Opening') : result('fen-fresh', 'Fresh')],
          }),
        };
        // The stale request is held open until we release it by hand.
        if (stale) return new Promise((resolve) => deferred.push(() => resolve(payload)));
        return Promise.resolve(payload);
      })
    );

    const { result: hook } = renderHook(() => useOpeningSearch());

    act(() => hook.current.setQuery('kings ind'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    act(() => hook.current.setQuery('kings indian'));
    await settle();

    expect(hook.current.results[0]?.name).toBe('Fresh');

    // The first request lands late. It must not repopulate the list.
    await act(async () => {
      deferred.forEach((release) => release());
      await vi.runAllTimersAsync();
    });

    expect(hook.current.results).toHaveLength(1);
    expect(hook.current.results[0].name).toBe('Fresh');
    expect(hook.current.searching).toBe(false);
  });

  it('does not repopulate the list after the field is cleared', async () => {
    const deferred: (() => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) =>
            deferred.push(() =>
              resolve({
                ok: true,
                json: async () => ({ success: true, data: [result('fen-a', 'Sicilian Defence')] }),
              })
            )
          )
      )
    );

    const { result: hook } = renderHook(() => useOpeningSearch());

    act(() => hook.current.setQuery('sicilian'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    act(() => hook.current.setQuery(''));
    await act(async () => {
      deferred.forEach((release) => release());
      await vi.runAllTimersAsync();
    });

    expect(hook.current.results).toEqual([]);
    expect(hook.current.searching).toBe(false);
  });
});
