import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpeningSearch } from '../useOpeningSearch';
import { trackEvent } from '../../lib/analytics';

vi.mock('../../lib/analytics', () => ({ trackEvent: vi.fn() }));

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
  vi.mocked(trackEvent).mockClear();
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

    const { result: hook } = renderHook(() => useOpeningSearch('topbar'));

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

    const { result: hook } = renderHook(() => useOpeningSearch('topbar'));

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

/*
 * search_select only counts searches that ended in a pick. These two give it a
 * denominator: how many searches were started, and how many dead-ended. Neither
 * may carry the query text.
 */
describe('useOpeningSearch analytics', () => {
  const respondWith = (data: unknown[]) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data }) }))
    );

  const calls = (event: string) =>
    vi.mocked(trackEvent).mock.calls.filter(([name]) => name === event);

  it('reports search_start once per search, with the surface', async () => {
    respondWith([result('fen-a', 'Sicilian Defence')]);
    const { result: hook } = renderHook(() => useOpeningSearch('overlay'));

    act(() => hook.current.setQuery('s'));
    act(() => hook.current.setQuery('si'));
    act(() => hook.current.setQuery('sic'));
    await settle();
    expect(calls('search_start')).toEqual([['search_start', { surface: 'overlay' }]]);

    // A reset (what every surface does after a pick) ends the search.
    act(() => hook.current.reset());
    act(() => hook.current.setQuery('caro'));
    await settle();
    expect(calls('search_start')).toHaveLength(2);
  });

  it('reports search_no_results once per dead end, with the shape and not the text', async () => {
    respondWith([]);
    const { result: hook } = renderHook(() => useOpeningSearch('hero'));

    act(() => hook.current.setQuery('zzqx'));
    await settle();
    act(() => hook.current.setQuery('zzqxy'));
    await settle();

    expect(hook.current.noResults).toBe(true);
    expect(calls('search_no_results')).toEqual([
      ['search_no_results', { surface: 'hero', query_shape: 'name' }],
    ]);
  });
});
