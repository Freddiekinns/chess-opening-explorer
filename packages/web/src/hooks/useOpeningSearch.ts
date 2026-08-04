import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRepertoire } from './useRepertoire';
import { findAndRankOpenings, type Opening } from '../lib/localSearch';
import { promoteSaved } from '../lib/searchRanking';
import { useSearchIndex } from '../lib/searchIndex';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, expandAbbreviations } from '../lib/searchQuery';

/**
 * One query behaviour, for all three search surfaces.
 *
 * The hero, the top bar and the mobile overlay each used to own a fetch, a
 * debounce and a set of shortcuts, and only the hero's knew what an abbreviation
 * or an ECO code was. That was fixed; what was left was worse, because it was
 * invisible. The hero held a slice of the search index and the other two did
 * not, so the hero answered on the keystroke and the top bar sat waiting on a
 * server that took 1–3 seconds to fuzzy-match a name. Same question, same
 * ranking, wildly different product.
 *
 * Both halves are now shared: the index comes from `searchIndex.ts`, one copy
 * for every surface, and the server answers a name in single-digit milliseconds
 * (see `search/NameIndex.js`). What stays with each surface is what genuinely
 * differs: where a chosen result goes, how the panel is drawn and torn down,
 * and what the keyboard does. This owns the query and nothing else.
 */

export interface SearchResult extends Partial<Opening> {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  /** Decided here, so the pill and the ordering can never disagree. */
  saved: boolean;
}

const RESULT_LIMIT = 20;

/**
 * One request per query.
 *
 * There used to be two: semantic search, then a plain name search if the first
 * came back empty. That fallback existed because the search route could not see
 * ECO codes and fuzzy-matched everything else, so it missed things a plain name
 * scan caught — and a miss cost the user two round trips before the dead end
 * appeared. The route now matches names literally before it does anything else;
 * across 389 sampled queries the plain search found nothing the search route
 * missed, so the second trip is gone.
 */
async function search(query: string): Promise<Partial<Opening>[]> {
  const response = await fetch(
    `/api/openings/semantic-search?q=${encodeURIComponent(query)}&limit=${RESULT_LIMIT}`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data?.success && Array.isArray(data.data) ? data.data : [];
}

export function useOpeningSearch() {
  const [query, setQuery] = useState('');
  const [served, setServed] = useState<Partial<Opening>[]>([]);
  const [searching, setSearching] = useState(false);
  const [cameBackEmpty, setCameBackEmpty] = useState(false);
  const { isSaved } = useRepertoire();

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;

  // Loaded on the first character rather than on mount, so a page nobody
  // searches from never pays for it — and it is in hand by the second, which is
  // the first that draws anything.
  const localIndex = useSearchIndex(query.trim().length > 0);

  // Monotonic request id. Clearing the debounce timer only cancels a request
  // that has not left yet; one already in flight still resolves, and without
  // this its `setServed` would land under a query the field no longer asks.
  const requestRef = useRef(0);

  useEffect(() => {
    if (!hasQuery) {
      // Bump too: clearing the field while a request is in flight must not let
      // that request repopulate the list a moment later.
      requestRef.current += 1;
      setServed([]);
      setSearching(false);
      setCameBackEmpty(false);
      return;
    }

    // Expanded before it is used anywhere — the local ranking and the request
    // must be asking the same question.
    const expanded = expandAbbreviations(query);

    const instant = localIndex.length ? findAndRankOpenings(expanded, localIndex) : [];
    if (instant.length > 0) {
      setServed(instant.slice(0, RESULT_LIMIT));
      setCameBackEmpty(false);
    }

    setSearching(true);
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;

    const timer = setTimeout(async () => {
      try {
        const fromServer = await search(expanded);
        if (!isCurrent()) return;

        if (fromServer.length > 0) {
          // The server's list wins even where the local one had something. It
          // sees all 12,377 openings, the slice sees the popular thousand, and
          // it can read a misspelling. The two rank by the same bands, so this
          // usually replaces the list with itself.
          setServed(fromServer.slice(0, RESULT_LIMIT));
          setCameBackEmpty(false);
        } else if (instant.length === 0) {
          // Clear, or the previous query's openings sit under a query that
          // matched nothing — the list would be answering a question the field
          // no longer asks, and the dead end would never appear.
          setServed([]);
          setCameBackEmpty(true);
        } else {
          setCameBackEmpty(false);
        }
      } catch {
        // Offline or the route is down. Whatever the local index found stands;
        // if it found nothing, the dead end is the honest thing to show.
        if (isCurrent() && instant.length === 0) {
          setServed([]);
          setCameBackEmpty(true);
        }
      } finally {
        // A superseded request must not clear the spinner the live one raised.
        if (isCurrent()) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // Deliberately not keyed on repertoire membership: saving an opening must
    // not re-issue the request. It re-ranks the list we already have, below.
  }, [query, hasQuery, localIndex]);

  const results = useMemo(
    () =>
      promoteSaved(
        served.map((opening) => ({
          ...opening,
          fen: opening.fen ?? '',
          name: opening.name ?? '',
          eco: opening.eco ?? '',
          moves: opening.moves ?? '',
          saved: isSaved(opening.fen ?? ''),
        }))
      ),
    [served, isSaved]
  );

  const reset = useCallback(() => {
    setQuery('');
    setServed([]);
    setSearching(false);
    setCameBackEmpty(false);
  }, []);

  return useMemo(
    () => ({
      query,
      setQuery,
      results,
      searching,
      /** True only once the search has actually come back empty. */
      noResults: hasQuery && cameBackEmpty && results.length === 0,
      hasQuery,
      reset,
    }),
    [query, results, searching, cameBackEmpty, hasQuery, reset]
  );
}
