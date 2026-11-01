import { useEffect, useState } from 'react';
import {
  ExplorerError,
  fetchExplorer,
  type BandId,
  type ExplorerResult,
} from '../lib/lichessExplorer';
import { trackEvent } from '../lib/analytics';

export interface ExplorerQuery {
  result: ExplorerResult | null;
  /** True while a band fetch is in flight for the current fen/band pair. */
  loading: boolean;
  /** True when the fetch for the current fen/band pair failed. */
  failed: boolean;
}

/**
 * Explorer data for one position at the active level — feeds the opening
 * book's merged move lists (sidebar unification) and the mobile data
 * surface's stats block. Result is null until a band is chosen and the
 * fetch resolves. Errors resolve to a null result (the book must render
 * fine without live stats), but `failed` is exposed so the mobile stats
 * block can fall back to the snapshot instead of loading forever. A failed
 * fetch is reported to analytics here, once, for every breakpoint.
 */
/**
 * Band-fetch failures are reported here, not by a consumer: this hook is the
 * one place every breakpoint's band fetch goes through. While the beacon sat
 * in WinRatePanel — a desktop-only component — every mobile explorer failure
 * was invisible.
 */
function reportExplorerError(err: unknown): void {
  if (err instanceof ExplorerError && err.status !== undefined) {
    trackEvent('explorer_error', { status: err.status });
  } else {
    trackEvent('explorer_error');
  }
}

/**
 * Every Lichess band for one position, from the page response
 * (`data.bands` / `data.parentBands`): null for a band too thin to count.
 */
export type PageBands = Record<Exclude<BandId, 'masters'>, ExplorerResult | null>;

/**
 * A band under the pipeline's 20-game floor. Its zeroes are never drawn:
 * liveStatsView needs MIN_LIVE_SAMPLE games, so the panel says the sample is
 * too small, and the book has no moves to merge. A null result would instead
 * read as still loading.
 */
export const THIN_BAND: ExplorerResult = {
  totalGames: 0,
  white: 0,
  draws: 0,
  black: 0,
  moves: [],
  topGames: [],
  averageRating: null,
};

/**
 * Lichess bands come from `pageBands`, the page response's own counts for
 * the window Discover shows, so a level switch makes no request: undefined
 * while the page loads, null if the server couldn't read them (the panel
 * falls back to the snapshot). Only Masters still fetches the explorer.
 */
export function useExplorerQuery(
  fen: string | null | undefined,
  band: BandId | null,
  pageBands?: PageBands | null
): ExplorerQuery {
  const [query, setQuery] = useState<ExplorerQuery>({
    result: null,
    loading: false,
    failed: false,
  });

  useEffect(() => {
    if (!fen || band !== 'masters') {
      setQuery({ result: null, loading: false, failed: false });
      return;
    }
    let alive = true;
    setQuery({ result: null, loading: true, failed: false });

    (async () => {
      try {
        const fetched = await fetchExplorer(fen, band);
        if (alive) setQuery({ result: fetched, loading: false, failed: false });
      } catch (err) {
        // Progressive enhancement only — callers degrade to snapshot data.
        reportExplorerError(err);
        if (alive) setQuery({ result: null, loading: false, failed: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [fen, band]);

  if (!fen || !band) return { result: null, loading: false, failed: false };
  if (band === 'masters') return query;
  if (pageBands === undefined) return { result: null, loading: true, failed: false };
  if (pageBands === null) return { result: null, loading: false, failed: true };
  return { result: pageBands[band] ?? THIN_BAND, loading: false, failed: false };
}

/** Result-only variant kept for callers that don't need fetch status. */
export function useExplorerResult(
  fen: string | null | undefined,
  band: BandId | null,
  pageBands?: PageBands | null
): ExplorerResult | null {
  return useExplorerQuery(fen, band, pageBands).result;
}
