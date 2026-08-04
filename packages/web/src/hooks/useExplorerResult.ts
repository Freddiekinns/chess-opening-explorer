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

export function useExplorerQuery(
  fen: string | null | undefined,
  band: BandId | null
): ExplorerQuery {
  const [query, setQuery] = useState<ExplorerQuery>({
    result: null,
    loading: false,
    failed: false,
  });

  useEffect(() => {
    if (!fen || !band) {
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

  return query;
}

/** Result-only variant kept for callers that don't need fetch status. */
export function useExplorerResult(
  fen: string | null | undefined,
  band: BandId | null
): ExplorerResult | null {
  return useExplorerQuery(fen, band).result;
}
