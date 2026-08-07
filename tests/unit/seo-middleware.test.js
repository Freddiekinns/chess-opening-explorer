const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..', '..');
const { shardForFen } = require('../../scripts/generate-seo-lookup');

// middleware.ts is TypeScript and imports siteConfig.ts, so it is bundled the
// way Vercel bundles it rather than stubbed — these tests then run the real
// edge handler against the real built index.html.
function loadMiddleware() {
  const result = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'middleware.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    write: false,
  });
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(
    module,
    module.exports,
    require
  );
  return module.exports.default;
}

const INDEX_HTML = path.join(ROOT, 'packages', 'web', 'dist', 'index.html');

const AMAR_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
const DUPLICATE_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R w KQkq - 0 9';
const NO_STATS_FEN = 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R w KQkq - 0 8';

const DESCRIPTION =
  'The Amar Opening is a highly unorthodox and provocative flank move, immediately placing a knight on the rim of the board. ' +
  'It cedes central control to Black in exchange for surprise value, aiming to steer the game into unusual channels.';

const SHARD = {
  [AMAR_FEN]: ['Amar Opening', 'A00', '1. Nh3', DESCRIPTION, 1533432, 0.4284, 0.0498, 0.5216],
  [NO_STATS_FEN]: ['Quiet Line', 'A00', '1. Nh3 e5', 'A sideline with no recorded games.'],
  [DUPLICATE_FEN]: ['Amar Opening', 'A00', '1. Nh3 d5', DESCRIPTION, 12, 0.5, 0.1, 0.4, AMAR_FEN],
};

let middleware;
let indexHtml;

beforeAll(() => {
  middleware = loadMiddleware();
  indexHtml = fs.readFileSync(INDEX_HTML, 'utf-8');
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

  it('leaves no stray markup when it swaps out the spinner', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();

    expect(html).not.toContain('loading-spinner"></div>');
    // One #root, and every div it contains is closed exactly once.
    expect(html.match(/<div id="root">/g)).toHaveLength(1);
    const body = html.slice(html.indexOf('<body>'), html.indexOf('</body>'));
    expect((body.match(/<div/g) || []).length).toBe((body.match(/<\/div>/g) || []).length);
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

  it('points a duplicate-name page at the page that owns the name', async () => {
    const html = await (await get(openingUrl(DUPLICATE_FEN))).text();
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]*)"/)[1];

    expect(canonical).toBe(`https://openingbook.xyz${openingUrl(AMAR_FEN)}`);
    // og:url still describes the page that was requested.
    expect(ogUrl).toBe(`https://openingbook.xyz${openingUrl(DUPLICATE_FEN)}`);
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
