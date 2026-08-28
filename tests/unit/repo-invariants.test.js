/**
 * Guard tests for the rules in AGENTS.md that were, until now, only prose.
 *
 * Each of these encodes a regression that already happened once. A rule
 * written down is advisory; a rule with a test behind it is deterministic,
 * and the failure message is the place to explain why rather than the file
 * the reader is about to edit.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

describe('vercel.json does not own the explorer route s headers', () => {
  const vercel = JSON.parse(read('vercel.json'));

  /**
   * `explorer.routes.js` sets Cache-Control per band — 7d masters, 24h rating
   * bands, no-store on failure. Vercel config headers override what a function
   * sends, so a single entry here would flatten all three to one TTL and
   * silently burn the 25 req/min Lichess token allowance.
   *
   * Matched as patterns rather than compared as prefixes: a broad
   * `/api/(.*)` entry is the likelier regression and would not start with
   * `/api/explorer`.
   */
  const covers = (source, pathname) => {
    const pattern = source.replace(/:[A-Za-z0-9_]+\*/g, '.*').replace(/:[A-Za-z0-9_]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(pathname);
  };

  test('no headers entry matches /api/explorer', () => {
    const matching = (vercel.headers || [])
      .map((h) => h.source)
      .filter((source) => covers(source, '/api/explorer'));
    expect(matching).toEqual([]);
  });

  test('the guard above would catch a broad /api entry', () => {
    expect(covers('/api/(.*)', '/api/explorer')).toBe(true);
  });

  // Guards the test above against being satisfied by deleting the route.
  test('the explorer rewrite still exists', () => {
    const sources = (vercel.rewrites || []).map((r) => r.source);
    expect(sources).toContain('/api/explorer');
  });
});

describe('the middleware matcher lets the static SEO files through', () => {
  /**
   * The matcher is a broad negative lookahead, so anything not named in it
   * goes through the Edge function — including files Google fetches directly.
   * When these fell out of the exclusions in the 2026-03-29 refactor, Search
   * Console reported the sitemap as "Couldn't fetch / Type: Unknown".
   *
   * Asserting the real pattern's behaviour rather than its text, so a rewrite
   * that keeps the exclusions but reshapes the regex still passes.
   */
  const source = read('middleware.ts');
  const block = source.match(/matcher:\s*\[([\s\S]*?)\]/);
  const entries = block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

  test('the matcher is where this test expects to find it', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  // Every entry, not just the first: a second entry is what would re-admit
  // the static files while a first-entry-only check stayed green.
  const matches = (pathname) => entries.some((e) => new RegExp(`^${e}$`).test(pathname));

  test.each([
    ['/robots.txt'],
    ['/sitemap.xml'],
    ['/sitemap-index.xml'],
    ['/sitemaps/openings-0.xml'],
  ])('the middleware does not intercept %s', (pathname) => {
    expect(matches(pathname)).toBe(false);
  });

  test('the middleware still runs for opening pages', () => {
    expect(matches('/opening/rnbqkbnr-pppppppp-8-8-4P3-8-PPPP1PPP-RNBQKBNR-b-KQkq-e3-0-1')).toBe(
      true
    );
  });
});

describe('description is not a fuzzy search key', () => {
  /**
   * Fuse over `description` scored a third of the corpus as matches —
   * "sicilian" hit 4,269 of 12,377 openings — and cost 850–2,800ms a query.
   * Literal name matching answers the same queries in 2–5ms; every
   * re-ranking pass that used to exist downstream was there to undo this.
   */
  const { FUSE_OPTIONS } = require('../../packages/api/src/services/search/SearchConstants');

  test('FUSE_OPTIONS.keys covers name and style_tags only', () => {
    const keys = FUSE_OPTIONS.keys.map((k) => (typeof k === 'string' ? k : k.name));
    expect(keys.sort()).toEqual(['name', 'style_tags']);
  });
});

describe('/personal-explorer redirects at the edge, not in the browser', () => {
  /**
   * It used to render a component that called window.location.replace, so the
   * URL answered 200 and then moved — the same "status that lies about what
   * this URL is" failure as a soft 404, and Google reads a 200-then-client-
   * redirect as a weak signal where a 301 is unambiguous. Vercel resolves
   * redirects before middleware, so config is the right home for it.
   */
  const vercel = JSON.parse(read('vercel.json'));
  const app = read('packages/web/src/App.tsx');

  test('vercel.json redirects it permanently to /analyse', () => {
    const rule = (vercel.redirects || []).find((r) => r.source === '/personal-explorer');
    expect(rule).toBeDefined();
    expect(rule.destination).toBe('/analyse');
    expect(rule.permanent).toBe(true);
  });

  test('the www redirect it was modelled on is still there', () => {
    const sources = (vercel.redirects || []).map((r) => r.source);
    expect(sources).toContain('/:path*');
  });

  test('App.tsx no longer routes it', () => {
    expect(app).not.toContain('/personal-explorer');
    expect(app).not.toContain('AnalyseRedirect');
  });
});
