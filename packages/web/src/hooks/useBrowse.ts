import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Everything the Discover grid knows about browsing. Filter state lives in the
 * URL — that is the only way back-navigation restores the active facets, and it
 * keeps the facet controls out of the business of remembering anything.
 *
 * "Load more" depth deliberately does NOT live in the URL: the spec asks that
 * filters survive back-navigation, not scroll depth, and restoring page N would
 * mean N requests to rebuild a scroll position the browser will not restore.
 */

export type FacetKey = 'level' | 'style' | 'family' | 'sort';

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  first_move?: string | null;
}

export interface BrowseFacets {
  level: FacetValue[];
  style: FacetValue[];
  family: FacetValue[];
}

export interface BrowseFilters {
  level: string | null;
  style: string | null;
  family: string | null;
  sort: string;
}

export interface BrowseItem {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id: string;
  family_name: string;
  level: string | null;
  style: string | null;
  games_analyzed: number;
  white_win_rate: number | null;
  draw_rate: number | null;
  black_win_rate: number | null;
  avg_rating: number | null;
  analysis_json?: { complexity?: string | null; style_tags?: string[] };
}

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most played' },
  { value: 'name', label: 'A–Z' },
];

const DEFAULT_SORT = 'popular';
const FACET_KEYS: FacetKey[] = ['level', 'style', 'family', 'sort'];

/**
 * 12, not the API's default of 24: every card renders a MiniBoard, and 24
 * boards on first paint is a real render cost for a landing screen. Twelve
 * fills the three-column grid four rows deep.
 */
const PAGE_SIZE = 12;

const EMPTY_FACETS: BrowseFacets = { level: [], style: [], family: [] };

export function useBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const level = searchParams.get('level');
  const style = searchParams.get('style');
  const family = searchParams.get('family');
  const sort = searchParams.get('sort') || DEFAULT_SORT;

  const [items, setItems] = useState<BrowseItem[]>([]);
  const [facets, setFacets] = useState<BrowseFacets>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const pageRef = useRef(1);
  // Monotonic request id: a filter change while a load-more is in flight must
  // not have the stale response append rows from the previous filter.
  const requestRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      const requestId = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (level) params.set('level', level);
      if (style) params.set('style', style);
      if (family) params.set('family', family);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      try {
        const response = await fetch(`/api/openings/browse?${params}`);
        const data = await response.json();
        if (requestId !== requestRef.current) return;

        // `success` alone is not enough: a 410, a proxy error page or a
        // truncated payload can all be JSON without an items array, and
        // setItems(undefined) white-screens the landing page on .map.
        if (!data.success || !Array.isArray(data.items)) {
          setError(true);
          return;
        }

        setError(false);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setFacets(data.facets);
        setTotal(data.total);
        setRemaining(data.remaining);
        pageRef.current = page;
      } catch {
        // An empty grid and a broken grid look identical; say which it is.
        if (requestId === requestRef.current) setError(true);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [level, style, family, sort]
  );

  useEffect(() => {
    pageRef.current = 1;
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(pageRef.current + 1, true);
  }, [fetchPage]);

  const retry = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const setFacet = useCallback(
    (key: FacetKey, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      // replace, not push: four facet taps must not cost four Back presses to
      // leave the page. Returning from a detail page still restores the last
      // URL, which is what the spec's checkpoint asks for.
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FACET_KEYS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    items,
    facets,
    total,
    remaining,
    loading,
    loadingMore,
    error,
    filters: { level, style, family, sort } as BrowseFilters,
    // Sort is excluded: it is always set, so counting it would mean the
    // "Filters" badge never read zero.
    activeCount: [level, style, family].filter(Boolean).length,
    setFacet,
    clear,
    loadMore,
    retry,
  };
}
