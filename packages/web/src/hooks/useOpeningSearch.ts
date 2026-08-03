import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRepertoire } from './useRepertoire';
import { findAndRankOpenings, type Opening } from '../lib/localSearch';
import { promoteSaved } from '../lib/searchRanking';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, expandAbbreviations } from '../lib/searchQuery';

/**
 * One query behaviour, for all three search surfaces.
 *
 * The hero, the top bar and the mobile overlay each used to own a fetch, a
 * debounce and a set of shortcuts, and only the hero's knew what an abbreviation
 * or an ECO code was. Typing "qgd" in the hero resolved instantly to the Queen's
 * Gambit Declined off the local index; typing it in the top bar waited 250ms and
 * came back with a different list. Nothing about which box you typed into should
 * change which openings exist.
 *
 * What stays with each surface is what genuinely differs: where a chosen result
 * goes (a callback on the hero, a route everywhere else), how the panel is drawn
 * and torn down, and what the keyboard does. This owns the query and nothing
 * else.
 */

export interface SearchResult extends Partial<Opening> {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  /** Decided here, so the pill and the ordering can never disagree. */
  saved: boolean;
}

export interface UseOpeningSearchOptions {
  /**
   * A locally held slice of the search index, if this surface has one. Used
   * only to paint something before the network answers; the server's list
   * replaces it. The top bar and the overlay pass nothing rather than pull a
   * 1.6 MB index onto every page for the sake of one keystroke.
   */
  localIndex?: Opening[];
  /**
   * Called once when the local index looks too thin to be answering with. The
   * hero uses it to fetch more of the index.
   */
  onExhausted?: () => void;
}

/** Below this many local hits, the loaded slice is probably not the problem's size. */
const LOCAL_INDEX_THIN = 3;

const RESULT_LIMIT = 20;

async function fetchResults(url: string): Promise<Partial<Opening>[]> {
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return data?.success && Array.isArray(data.data) ? data.data : [];
}

/**
 * Semantic search, then plain name search if it 500s or comes back with
 * nothing. Only the hero used to carry this fallback; the other two surfaces
 * simply showed a dead end when the search route was unwell.
 */
async function search(query: string): Promise<Partial<Opening>[]> {
  const q = encodeURIComponent(query);
  const semantic = await fetchResults(`/api/openings/semantic-search?q=${q}&limit=${RESULT_LIMIT}`);
  if (semantic.length > 0) return semantic;
  return fetchResults(`/api/openings/search?q=${q}&limit=${RESULT_LIMIT}`);
}

export function useOpeningSearch({ localIndex, onExhausted }: UseOpeningSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [served, setServed] = useState<Partial<Opening>[]>([]);
  const [searching, setSearching] = useState(false);
  const [cameBackEmpty, setCameBackEmpty] = useState(false);
  const { isSaved } = useRepertoire();

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;

  const requestedExpansion = useRef(false);
  const onExhaustedRef = useRef(onExhausted);
  onExhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!hasQuery) {
      setServed([]);
      setSearching(false);
      setCameBackEmpty(false);
      return;
    }

    // Expanded before it is used anywhere — the local ranking and the request
    // must be asking the same question.
    const expanded = expandAbbreviations(query);

    const instant = localIndex?.length ? findAndRankOpenings(expanded, localIndex) : [];
    if (instant.length > 0) {
      setServed(instant.slice(0, RESULT_LIMIT));
      setCameBackEmpty(false);
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const fromServer = await search(expanded);

        if (fromServer.length > 0) {
          // The server's list wins even where the local one had something. The
          // point of this hook is that every surface ends up at the same
          // openings, and only one of them holds an index to disagree with.
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

        if (
          instant.length < LOCAL_INDEX_THIN &&
          !requestedExpansion.current &&
          onExhaustedRef.current
        ) {
          requestedExpansion.current = true;
          onExhaustedRef.current();
        }
      } catch {
        // Offline or the route is down. Whatever the local index found stands;
        // if it found nothing, the dead end is the honest thing to show.
        if (instant.length === 0) {
          setServed([]);
          setCameBackEmpty(true);
        }
      } finally {
        setSearching(false);
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
