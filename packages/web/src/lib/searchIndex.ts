import { useEffect, useSyncExternalStore } from 'react';
import type { Opening } from './localSearch';

/**
 * The locally held slice of the search index — one copy, for every surface.
 *
 * The landing hero used to be the only surface with one, because the landing
 * page happened to fetch it. That single fact was the whole of the difference
 * the product had: type "qgd" into the hero and openings appeared on the
 * keystroke; type it into the top bar and the field sat there until the server
 * answered. Same hook, same query, same ranking — one of them just had
 * something to draw first.
 *
 * So it moves here, behind a module-level cache, and the top bar and the mobile
 * overlay get it too. It is fetched on the first keystroke rather than on mount:
 * 211 KB is small over a CDN with a day's TTL, but it is not small enough to
 * spend on every page view by someone who never opens search.
 *
 * This is paint-ahead and nothing more. The server's list always replaces it —
 * see `useOpeningSearch`.
 */

/**
 * The thousand most-played openings.
 *
 * The full index is 3.1 MB for 12,377 openings, and the hero used to reach for
 * it whenever the slice looked thin. That was worth doing when the server took
 * one to three seconds to answer; a literal name match now costs it 2–5 ms, so
 * the full index would be megabytes spent to improve a list that is replaced a
 * few hundred milliseconds later. The slice covers what people search for.
 */
const SEARCH_INDEX_URL = '/api/openings/search-index?limit=1000';

let index: Opening[] = [];
let inFlight: Promise<void> | null = null;
let fullInFlight: Promise<Opening[]> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable identity between publishes, which is what useSyncExternalStore wants. */
function getSnapshot() {
  return index;
}

/**
 * Fetched at most once per page load, and never retried on failure within it.
 *
 * A failed load is not an error state anywhere: the surfaces simply behave the
 * way the top bar behaved before this existed, which is to wait for the server.
 */
export function loadSearchIndex(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = fetch(SEARCH_INDEX_URL)
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      if (!payload?.success || !Array.isArray(payload.data)) return;
      index = payload.data;
      listeners.forEach((listener) => listener());
    })
    .catch(() => {
      // Offline, or the route is down. The server list is still coming.
    });

  return inFlight;
}

/**
 * The slice as it stands, re-rendering the caller when it arrives.
 *
 * `enabled` is the surface saying it is worth having: passing false keeps a
 * mounted-but-idle search box from pulling the index on every page.
 */
export function useSearchIndex(enabled: boolean): Opening[] {
  useEffect(() => {
    if (enabled) void loadSearchIndex();
  }, [enabled]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * All 12,377 openings — 3.1 MB, so this has exactly one caller.
 *
 * Pasting a PGN identifies the position by looking its FEN up in an openings
 * map, and a map of the popular thousand cannot identify anything else. That
 * lookup used to run against whatever slice the landing page happened to be
 * holding, which meant it worked properly only in sessions where the hero
 * search had already asked for the full index for its own reasons. Behind an
 * explicit "Paste a game", the payload is worth it; nothing else may fetch it.
 */
export function loadFullSearchIndex(): Promise<Opening[]> {
  if (!fullInFlight) {
    fullInFlight = fetch('/api/openings/search-index')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) =>
        payload?.success && Array.isArray(payload.data) ? (payload.data as Opening[]) : []
      )
      .catch(() => []);
  }
  return fullInFlight;
}

/** Test seam. Nothing in the app resets a page-lifetime cache. */
export function __resetSearchIndexForTests() {
  index = [];
  inFlight = null;
  fullInFlight = null;
  listeners.clear();
}
