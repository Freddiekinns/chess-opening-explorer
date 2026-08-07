const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..', '..');
const { shardForFen } = require('../../scripts/generate-seo-lookup');

// middleware.ts is TypeScript and imports siteConfig.ts, so it is bundled the
// way Vercel bundles it rather than stubbed — these tests then run the real
// edge handler against the real built index.html.
const compiled = new Map();

/**
 * Compile once, instantiate per call.
 *
 * middleware.ts keeps `seoShardCache` at module scope, so a single shared
 * instance carries a warm cache between tests — which silently voided the
 * fail-open tests: the FEN's shard was already resident, `fetch` was never
 * reached, and flipping `unavailable` to `missing` (the regression AGENTS.md
 * warns is catastrophic) left the whole file green. Every test gets its own
 * module, and therefore its own empty cache.
 */
function bundle(entry) {
  if (!compiled.has(entry)) {
    compiled.set(
      entry,
      esbuild.buildSync({
        entryPoints: [path.join(ROOT, entry)],
        bundle: true,
        format: 'cjs',
        platform: 'node',
        target: 'node18',
        write: false,
      }).outputFiles[0].text
    );
  }
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', compiled.get(entry))(
    module,
    module.exports,
    require
  );
  return module.exports;
}

const loadMiddleware = () => bundle('middleware.ts').default;
const loadSiteConfig = () => bundle('packages/web/src/lib/siteConfig.ts');

const SOURCE_INDEX = path.join(ROOT, 'packages', 'web', 'index.html');

/**
 * Vite lifts the module script out of <body> and into <head>, and production
 * middleware only ever sees that built shape — but only the source is
 * committed, and the backend CI job runs no build. Reading `dist/index.html`
 * therefore passed locally and ENOENT'd every test in this file on CI.
 *
 * So the built shape is derived from the committed source, and both shapes are
 * exercised: the `#root` swap has to survive a script before `</body>` and a
 * body that ends at `</div>`.
 */
function builtShape(source) {
  const built = source
    .replace(/\n\s*<script type="module" src="\/src\/main\.tsx"><\/script>/, '')
    .replace(
      '</head>',
      '  <script type="module" crossorigin src="/assets/index-B87xrc7G.js"></script>\n' +
        '    <link rel="stylesheet" crossorigin href="/assets/index-CJb08JiK.css">\n  </head>'
    );
  const body = built.slice(built.indexOf('<body>'));
  if (body.includes('<script')) throw new Error('builtShape left a script in <body>');
  return built;
}

const AMAR_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
// Same first four FEN fields as AMAR_FEN — the same board, reached by a
// different move order. This is the only kind of duplicate in the corpus.
const DUPLICATE_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 3 2';
const NO_STATS_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R w KQkq - 0 8';
// Two different positions that share a name, as 2,071 real pages do.
const SHARED_A = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const SHARED_B = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const DESCRIPTION =
  'The Amar Opening is a highly unorthodox and provocative flank move, immediately placing a knight on the rim of the board. ' +
  'It cedes central control to Black in exchange for surprise value, aiming to steer the game into unusual channels.';

const SHARD = {
  [AMAR_FEN]: ['Amar Opening', 'A00', '1. Nh3', DESCRIPTION, 1533432, 0.4284, 0.0498, 0.5216],
  [NO_STATS_FEN]: ['Quiet Line', 'A00', '1. Nh3 e5', 'A sideline with no recorded games.'],
  [DUPLICATE_FEN]: ['Amar Opening', 'A00', '1. Nh3', DESCRIPTION, 12, 0.5, 0.1, 0.4, AMAR_FEN],
  [SHARED_A]: ["King's Pawn Game", 'C20', '1. e4', 'The most played first move.', 3778178876, 0.5, 0.05, 0.45, null, 1], // prettier-ignore
  [SHARED_B]: ["King's Pawn Game", 'C20', '1. e4 e5', 'Black answers in kind.', 1501326875, 0.5, 0.05, 0.45, null, 1], // prettier-ignore
};

let middleware;
let sourceHtml;
let indexHtml;

beforeAll(() => {
  sourceHtml = fs.readFileSync(SOURCE_INDEX, 'utf-8');
});

beforeEach(() => {
  // Fresh module per test, so no test inherits another's warm shard cache.
  middleware = loadMiddleware();
  // Default to the shape production actually serves; the swap is re-checked
  // against the source shape in its own test below.
  indexHtml = builtShape(sourceHtml);
});

beforeEach(() => {
  global.fetch = jest.fn(async (input) => {
    // The handler passes a Request for pass-through and a URL for its own
    // subrequests, so normalise both.
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('/seo-lookup/')) {
      // Serve the fixture only for the shard the FEN actually hashes to.
      const shard = parseInt(url.split('/').pop().replace('.json', ''), 16);
      const subset = Object.fromEntries(
        Object.entries(SHARD).filter(([fen]) => shardForFen(fen) === shard)
      );
      return new Response(JSON.stringify(subset), { status: 200 });
    }
    if (url.includes('/index.html')) {
      return new Response(indexHtml, { status: 200 });
    }
    return new Response('', { status: 404 });
  });
});

const get = (pathname) => middleware(new Request(`https://openingbook.xyz${pathname}`));

const openingUrl = (fen) => `/opening/${encodeURIComponent(fen)}`;

describe('SEO middleware — content in the HTML', () => {
  it('puts the opening name, moves and description in the body', async () => {
    const res = await get(openingUrl(AMAR_FEN));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('<h1');
    expect(html).toContain('Amar Opening');
    expect(html).toContain('ECO A00');
    expect(html).toContain('1. Nh3');
    // The whole description, not the 155-char meta truncation.
    expect(html).toContain('provocative flank move');
    expect(html).toContain('unusual channels');
  });

  it('renders real win rates and never a rate it does not have', async () => {
    const withStats = await (await get(openingUrl(AMAR_FEN))).text();
    expect(withStats).toContain('1,533,432 Lichess games');
    expect(withStats).toContain('White wins 43%');
    expect(withStats).toContain('Draw 5%');
    expect(withStats).toContain('Black wins 52%');

    const withoutStats = await (await get(openingUrl(NO_STATS_FEN))).text();
    expect(withoutStats).toContain('Quiet Line');
    expect(withoutStats).not.toContain('Win rate over');
    expect(withoutStats).not.toMatch(/White wins 0%/);
  });

  it.each([
    ['built (script hoisted to head)', (src) => builtShape(src)],
    ['source (script before </body>)', (src) => src],
  ])('leaves no stray markup when it swaps out the spinner — %s', async (_label, shape) => {
    indexHtml = shape(sourceHtml);
    const html = await (await get(openingUrl(AMAR_FEN))).text();

    expect(html).toContain('Amar Opening');
    expect(html).not.toContain('loading-spinner"></div>');
    // One #root, and every div it contains is closed exactly once.
    expect(html.match(/<div id="root">/g)).toHaveLength(1);
    const body = html.slice(html.indexOf('<body>'), html.indexOf('</body>'));
    expect((body.match(/<div/g) || []).length).toBe((body.match(/<\/div>/g) || []).length);
  });

  it('keeps the app script that boots React', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    expect(html).toMatch(/<script type="module"[^>]*src="\/assets\//);
  });
});

describe('SEO middleware — meta and canonicals', () => {
  it('uses the opening own description, not the boilerplate template', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const description = html.match(/<meta name="description" content="([^"]*)"/)[1];

    expect(description).toContain('highly unorthodox');
    expect(description).not.toContain('Learn key ideas, watch videos');
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('falls back to a built description only when the opening has none', async () => {
    const html = await (await get(openingUrl(NO_STATS_FEN))).text();
    const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
    expect(description).toContain('sideline with no recorded games');
  });

  it('self-canonicalises a page that owns its name', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)[1];
    expect(canonical).toBe(`https://openingbook.xyz${openingUrl(AMAR_FEN)}`);
  });

  it('points a duplicate position at the URL that owns the board', async () => {
    const html = await (await get(openingUrl(DUPLICATE_FEN))).text();
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]*)"/)[1];

    expect(canonical).toBe(`https://openingbook.xyz${openingUrl(AMAR_FEN)}`);
    // og:url still describes the page that was requested.
    expect(ogUrl).toBe(`https://openingbook.xyz${openingUrl(DUPLICATE_FEN)}`);
  });

  // Two pages sharing a name are different positions, not duplicates. Folding
  // them onto one URL de-indexed 1,677 real pages carrying 6.65 billion games,
  // including King's Pawn Game at 1.e4 e5 (1.5B). They keep their URLs; it is
  // the title that has to tell them apart.
  it('keeps both pages that share a name, and separates them by title', async () => {
    const a = await (await get(openingUrl(SHARED_A))).text();
    const b = await (await get(openingUrl(SHARED_B))).text();

    const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)[1];
    const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]*)"/)[1];

    // An apostrophe needs no escaping in text content or a double-quoted
    // attribute, so it survives verbatim.
    expect(titleOf(a)).toBe("King's Pawn Game: 1. e4 (C20) — Opening Book");
    expect(titleOf(b)).toBe("King's Pawn Game: 1. e4 e5 (C20) — Opening Book");
    expect(titleOf(a)).not.toBe(titleOf(b));

    // Neither is canonicalised away.
    expect(canonicalOf(a)).toBe(`https://openingbook.xyz${openingUrl(SHARED_A)}`);
    expect(canonicalOf(b)).toBe(`https://openingbook.xyz${openingUrl(SHARED_B)}`);
  });

  it('leaves an unshared name alone in the title', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    expect(html).toContain('<title>Amar Opening (A00) — Opening Book</title>');
  });

  it('emits structured data naming the opening', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const parsed = JSON.parse(
      jsonLd
        .replace(/\\u003c/g, '<')
        .replace(/\\u003e/g, '>')
        .replace(/\\u0026/g, '&')
    );

    expect(parsed['@type']).toBe('WebPage');
    expect(parsed.name).toBe('Amar Opening');
    expect(parsed.about.name).toBe('Amar Opening');
  });

  it('keeps exactly one title, description and canonical', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
  });
});

describe('SEO middleware — unknown positions', () => {
  it('404s an unknown FEN instead of serving the landing page at 200', async () => {
    const res = await get(openingUrl('8/8/8/8/8/8/8/8 w - - 0 1'));
    const html = await res.text();

    expect(res.status).toBe(404);
    expect(html).toContain('Opening not found');
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
  });

  it('404s a malformed FEN encoding rather than throwing', async () => {
    const res = await get('/opening/%E0%A4%A');
    expect(res.status).toBe(404);
  });
});

describe('SEO middleware — shard failure must fail open', () => {
  // 404ing on a transient CDN miss would take every opening page in the shard
  // out of the index, which is the failure this whole change exists to undo.
  let shardRequests;

  const failShardWith = (shardResponse) => {
    shardRequests = 0;
    global.fetch = jest.fn(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('/seo-lookup/')) {
        shardRequests++;
        return shardResponse();
      }
      return new Response(indexHtml, { status: 200 });
    });
  };

  // Each of these asserts the shard was actually requested. Without it the
  // suite passed against a middleware whose fail-open branch had been deleted,
  // because a warm module-level cache meant fetch was never called.
  it.each([
    ['404s', () => new Response('', { status: 404 })],
    [
      'throws',
      () => {
        throw new Error('network');
      },
    ],
    ['is not valid JSON', () => new Response('<html>oops</html>', { status: 200 })],
    ['is JSON but not an object', () => new Response('null', { status: 200 })],
  ])('serves 200, not 404, when the shard %s', async (_label, response) => {
    failShardWith(response);
    const res = await get(openingUrl(AMAR_FEN));
    const html = await res.text();

    expect(shardRequests).toBeGreaterThan(0);
    expect(res.status).toBe(200);
    expect(html).not.toContain('Opening not found');
  });

  it('holds a degraded response for a minute, not a day', async () => {
    failShardWith(() => new Response('', { status: 500 }));
    const res = await get(openingUrl(AMAR_FEN));

    expect(shardRequests).toBeGreaterThan(0);
    // The body carries the landing page's boilerplate; caching that for a day
    // would pin identical metadata onto every URL in the shard.
    expect(res.headers.get('cache-control')).toBe('s-maxage=60, stale-while-revalidate=60');
  });

  it('still 404s when the shard loads and the FEN is genuinely absent', async () => {
    const res = await get(openingUrl('8/8/8/8/8/8/8/8 w - - 0 1'));
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
  });

  it('caches a good page for a day', async () => {
    const res = await get(openingUrl(AMAR_FEN));
    expect(res.headers.get('cache-control')).toBe('s-maxage=86400, stale-while-revalidate=604800');
  });
});

describe('SEO middleware — agrees with the React page', () => {
  // React 19 hoists OpeningDetailPage's <meta> into <head> beside the one the
  // middleware wrote, so the two descriptions have to be the same string.
  const { buildOpeningDescription } = loadSiteConfig();

  it('builds its description with the shared helper', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const rendered = html.match(/<meta name="description" content="([^"]*)"/)[1];

    expect(rendered).toBe(
      buildOpeningDescription({
        name: 'Amar Opening',
        eco: 'A00',
        moves: '1. Nh3',
        description: DESCRIPTION,
      })
    );
  });

  it('emits exactly one canonical, because the page no longer renders one', async () => {
    const page = fs.readFileSync(
      path.join(ROOT, 'packages', 'web', 'src', 'pages', 'OpeningDetailPage.tsx'),
      'utf-8'
    );
    expect(page).not.toMatch(/rel="canonical"/);
    expect(page).not.toMatch(/property="og:url"/);
  });
});

describe('SEO middleware — untouched routes', () => {
  it('still titles the analyse page and leaves its body alone', async () => {
    const res = await get('/analyse');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('Analyse Your Games');
    expect(html).toContain('loading-spinner');
  });

  it('redirects the legacy vercel host to the canonical domain', async () => {
    const res = await middleware(new Request('https://openingbook.vercel.app/opening/anything'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('https://openingbook.xyz/');
  });
});
