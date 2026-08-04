import { vi } from 'vitest';
import { __resetSearchIndexForTests } from '../lib/searchIndex';
import type { Opening } from '../lib/localSearch';

/**
 * The locally held search index, stubbed.
 *
 * Every search surface now ranks against a shared slice fetched once per page
 * from `/api/openings/search-index` — it used to be a prop only the landing
 * hero was given. Tests that want a surface to have something to draw before
 * the server answers stub that route here rather than passing data in.
 *
 * The cache is page-lifetime by design, so it has to be reset between tests or
 * the first file's fixture leaks into the rest of the suite.
 */
export function stubSearchIndex(openings: Partial<Opening>[]) {
  __resetSearchIndexForTests();
  return { success: true, data: openings };
}

export function resetSearchIndex() {
  __resetSearchIndexForTests();
}

/**
 * A fetch mock that answers the index route with `index` and every search route
 * with `results`, so a test can say what each half of the search returns.
 */
export function mockSearchFetch(options: {
  index?: Partial<Opening>[];
  results?: unknown[];
  ok?: boolean;
}) {
  const { index = [], results = [], ok = true } = options;
  __resetSearchIndexForTests();

  return vi.fn(async (url: string) => {
    if (String(url).includes('/api/openings/search-index')) {
      return { ok: true, json: async () => ({ success: true, data: index }) };
    }
    return { ok, json: async () => ({ success: true, data: results }) };
  });
}
