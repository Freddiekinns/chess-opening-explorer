import { useEffect, useState } from 'react';
import { fetchExplorer, type BandId, type ExplorerResult } from '../lib/lichessExplorer';

/**
 * Explorer data for one position at the active level — feeds the opening
 * book's merged move lists (sidebar unification). Null until a band is
 * chosen and the fetch resolves; errors resolve to null silently because
 * the book must render fine without live stats (WinRatePanel owns the
 * explorer_error beacon for the shared current-position fetch, and the
 * cache/in-flight dedupe in fetchExplorer means this adds no extra request
 * for it — only the parent position costs one).
 */
export function useExplorerResult(
  fen: string | null | undefined,
  band: BandId | null
): ExplorerResult | null {
  const [result, setResult] = useState<ExplorerResult | null>(null);

  useEffect(() => {
    setResult(null);
    if (!fen || !band) return;
    let alive = true;

    (async () => {
      try {
        const fetched = await fetchExplorer(fen, band);
        if (alive) setResult(fetched);
      } catch {
        // Progressive enhancement only — the book renders without it.
      }
    })();

    return () => {
      alive = false;
    };
  }, [fen, band]);

  return result;
}
