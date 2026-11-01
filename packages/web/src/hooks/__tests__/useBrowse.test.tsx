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
  localStorage.clear();
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
      wrapper: wrapper('/?style=gambit&family=london'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filters).toEqual({
      style: 'gambit',
      family: 'london',
      sort: 'popular',
    });
    expect(result.current.activeCount).toBe(2);

    const url = fetchCalls()[0][0] as string;
    expect(url).toContain('style=gambit');
    expect(url).toContain('family=london');
  });

  // #206 retired the Difficulty facet: an old ?level= link still loads, but
  // filters nothing and counts as no active filter.
  it('ignores the retired ?level= parameter', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeCount).toBe(0);
    expect(fetchCalls()[0][0] as string).not.toContain('level=');
  });

  // The URL is the shareable copy of this state, and the casing the corpus
  // uses differs per facet ("London", but "sharp"). A lowercased link
  // still filters correctly server-side, so the buttons must not go on
  // showing the raw slug where a label belongs.
  it('reports filters in the corpus casing, whatever the URL was written in', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?style=SHARP&family=London'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filters).toEqual({
      style: 'sharp',
      family: 'london',
      sort: 'popular',
    });
  });

  it('leaves a value it cannot place alone rather than inventing one', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?family=nonesuch'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filters.family).toBe('nonesuch');
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
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper('/?style=gambit') });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFacet('style', null));

    await waitFor(() => expect(result.current.filters.style).toBeNull());
    expect(fetchCalls()[fetchCalls().length - 1][0] as string).not.toContain('style=');
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
      wrapper: wrapper('/?style=gambit&family=london&sort=name'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.clear());

    await waitFor(() => expect(result.current.activeCount).toBe(0));
    expect(result.current.filters).toEqual({
      style: null,
      family: null,
      sort: 'popular',
    });
  });

  it('ranks by the saved level without putting it in the URL', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.band).toBe('1400');
    expect(fetchCalls()[0][0] as string).toContain('band=1400');
  });

  it('selecting a band refetches with band and keeps other facets and sort', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?style=gambit&sort=name'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setBand('1800'));

    await waitFor(() => expect(fetchCalls()).toHaveLength(2));
    const url = fetchCalls()[1][0] as string;
    expect(url).toContain('band=1800');
    expect(url).toContain('style=gambit');
    expect(url).toContain('sort=name');
    expect(localStorage.getItem('openingbook:my-level')).toBe('1800');
  });

  it('refetches when the level changes in another tab', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      localStorage.setItem('openingbook:my-level', '2200');
      window.dispatchEvent(new StorageEvent('storage', { key: 'openingbook:my-level' }));
    });

    await waitFor(() => expect(fetchCalls()).toHaveLength(2));
    expect(fetchCalls()[1][0] as string).toContain('band=2200');
  });

  it('clear filters keeps level', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?style=gambit'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.clear());

    await waitFor(() => expect(result.current.activeCount).toBe(0));
    expect(result.current.band).toBe('1400');
    expect(localStorage.getItem('openingbook:my-level')).toBe('1400');
  });

  it('activeCount excludes level', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeCount).toBe(0);
  });

  it('saved masters shows All levels and fetches without band', async () => {
    localStorage.setItem('openingbook:my-level', 'masters');
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.band).toBeNull();
    expect(fetchCalls()[0][0] as string).not.toContain('band=');
    expect(localStorage.getItem('openingbook:my-level')).toBe('masters');
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
