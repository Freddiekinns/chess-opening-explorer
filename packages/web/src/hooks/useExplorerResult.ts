import { useEffect, useState } from 'react';
import { fetchExplorer, type BandId, type ExplorerResult } from '../lib/lichessExplorer';

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
 * block can fall back to the snapshot instead of loading forever
 * (WinRatePanel owns the explorer_error beacon for the shared
 * current-position fetch; the cache/in-flight dedupe in fetchExplorer
 * means this adds no extra request for it).
 */
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
      } catch {
        // Progressive enhancement only — callers degrade to snapshot data.
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
