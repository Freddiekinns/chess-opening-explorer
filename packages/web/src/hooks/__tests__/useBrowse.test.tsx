import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBrowse } from '../useBrowse';
import { browseResponse, browseItem } from '../../test/fixtures/browseResponse';

const wrapper =
  (initialEntry = '/') =>
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );

const mockFetch = (payload: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => payload });

const fetchCalls = () => (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(browseResponse()));
});

describe('useBrowse', () => {
  it('fetches page 1 with the client page size on mount', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(30);
    expect(result.current.items).toHaveLength(2);

    const url = fetchCalls()[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=12');
  });

  it('reads its filters from the URL, so a restored URL restores the facets', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner&family=london'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filters).toEqual({
      level: 'Beginner',
      style: null,
      family: 'london',
      sort: 'popular',
    });
    expect(result.current.activeCount).toBe(2);

    const url = fetchCalls()[0][0] as string;
    expect(url).toContain('level=Beginner');
    expect(url).toContain('family=london');
  });

  it('setFacet writes the URL and refetches from page 1', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFacet('style', 'gambit'));

    await waitFor(() => expect(result.current.filters.style).toBe('gambit'));
    const url = fetchCalls()[fetchCalls().length - 1][0] as string;
    expect(url).toContain('style=gambit');
    expect(url).toContain('page=1');
  });

  it('setFacet with null removes the param rather than sending an empty one', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper('/?level=Beginner') });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFacet('level', null));

    await waitFor(() => expect(result.current.filters.level).toBeNull());
    expect(fetchCalls()[fetchCalls().length - 1][0] as string).not.toContain('level=');
  });

  it('loadMore appends the next page instead of replacing it', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.stubGlobal(
      'fetch',
      mockFetch(
        browseResponse({
          items: [browseItem('French Defence', 'fen-3')],
          page: 2,
          offset: 12,
          remaining: 17,
        })
      )
    );
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items[2].name).toBe('French Defence');
    expect(result.current.remaining).toBe(17);
    expect(fetchCalls()[0][0] as string).toContain('page=2');
  });

  it('clear removes every facet param at once', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner&style=gambit&family=london&sort=name'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.clear());

    await waitFor(() => expect(result.current.activeCount).toBe(0));
    expect(result.current.filters).toEqual({
      level: null,
      style: null,
      family: null,
      sort: 'popular',
    });
  });

  it('surfaces an error instead of rendering an empty grid as if it were a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('treats a success payload with no items array as an error, not as zero results', async () => {
    // A proxy error page, a 410 body or a truncated payload can all be JSON
    // with success:true and no items. setItems(undefined) would white-screen
    // the landing page on the next .map.
    vi.stubGlobal('fetch', mockFetch({ success: true, data: [] }));
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.items).toEqual([]);
  });
});
