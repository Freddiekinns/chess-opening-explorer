/**
 * Tests for the Lichess opening-explorer proxy route (/api/explorer).
 *
 * Since March 2026 the explorer API rejects anonymous requests; the proxy
 * attaches the server's LICHESS_EXPLORER_TOKEN so site visitors need no
 * Lichess account. Upstream calls are mocked — no network.
 */

const express = require('express');
const request = require('supertest');
const explorerRouter = require('../../packages/api/src/routes/explorer.routes');

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function makeApp() {
  const app = express();
  app.use('/api/explorer', explorerRouter);
  return app;
}

function okUpstream(body = { white: 1, draws: 1, black: 1, moves: [] }) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

describe('GET /api/explorer', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.LICHESS_EXPLORER_TOKEN = 'lip_test_token';
    global.fetch = jest.fn().mockReturnValue(okUpstream());
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.LICHESS_EXPLORER_TOKEN;
  });

  test.each([
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0)'],
    [
      'rendered Googlebot',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1) Chrome/120.0 Safari/537.36',
    ],
  ])('short-circuits %s with 403, no-store and no upstream call', async (_name, ua) => {
    const res = await request(makeApp())
      .get('/api/explorer')
      .set('User-Agent', ua)
      .query({ fen: FEN, band: 'masters' });
    expect(res.status).toBe(403);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('does not mistake a real browser (or a Cubot phone) for a bot', async () => {
    const phone = await request(makeApp())
      .get('/api/explorer')
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 5) Chrome/119.0 Mobile')
      .query({ fen: FEN, band: 'masters' });
    expect(phone.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('rejects an unknown band with 400 and no upstream call', async () => {
    const res = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: 'gm' });
    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('rejects a missing or malformed fen with 400', async () => {
    const noFen = await request(makeApp()).get('/api/explorer').query({ band: 'masters' });
    expect(noFen.status).toBe(400);
    const badFen = await request(makeApp())
      .get('/api/explorer')
      .query({ fen: 'nonsense', band: 'masters' });
    expect(badFen.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns 503 when the token is not configured', async () => {
    delete process.env.LICHESS_EXPLORER_TOKEN;
    const res = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: 'masters' });
    expect(res.status).toBe(503);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('proxies masters with a bearer token and passes the body through', async () => {
    const body = { white: 990, draws: 1390, black: 544, moves: [], topGames: [] };
    global.fetch.mockReturnValue(okUpstream(body));

    const res = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: 'masters' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(body);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('explorer.lichess.org/masters');
    expect(url).toContain(`fen=${encodeURIComponent(FEN)}`);
    expect(url).toContain('topGames=15');
    expect(opts.headers.Authorization).toBe('Bearer lip_test_token');
  });

  test.each([
    ['all', '0,1000,1200,1400,1600,1800,2000,2200,2500'],
    ['u1400', '0,1000,1200'],
    ['1400', '1400,1600'],
    ['1800', '1800,2000'],
    ['2200', '2200,2500'],
  ])('maps band %s to ratings=%s on the lichess endpoint', async (band, ratings) => {
    const res = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band });
    expect(res.status).toBe(200);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('explorer.lichess.org/lichess');
    expect(url).toContain(`ratings=${encodeURIComponent(ratings)}`);
    expect(url).toContain('topGames=0');
  });

  test('sets long CDN cache headers on success', async () => {
    const masters = await request(makeApp())
      .get('/api/explorer')
      .query({ fen: FEN, band: 'masters' });
    expect(masters.headers['cache-control']).toContain('s-maxage=604800');
    const club = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: '1400' });
    expect(club.headers['cache-control']).toContain('s-maxage=86400');
  });

  test('forwards an upstream 429 with no-store', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 429 });
    const res = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: 'masters' });
    expect(res.status).toBe(429);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('returns 502 with no-store when upstream is unreachable or errors', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));
    const down = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: 'masters' });
    expect(down.status).toBe(502);
    expect(down.headers['cache-control']).toBe('no-store');

    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    const err = await request(makeApp()).get('/api/explorer').query({ fen: FEN, band: '1400' });
    expect(err.status).toBe(502);
  });
});
