const {
  splitMultiPgn,
  fetchLichessGamesPgnRated,
  getLichessGamesPgnRatedCached
} = require('../../packages/api/src/services/personal-games-service');

describe('personal-games-service', () => {
  test('splitMultiPgn splits lichess multi-PGN concatenation', () => {
    const text = [
      '[Event "A"]\n[Site "lichess.org"]\n\n1. e4 e5 1-0',
      '[Event "B"]\n[Site "lichess.org"]\n\n1. d4 d5 1/2-1/2'
    ].join('\n\n');

    const parts = splitMultiPgn(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('[Event "A"]');
    expect(parts[1]).toContain('[Event "B"]');
  });

  test('fetchLichessGamesPgnRated builds correct request and returns PGNs', async () => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        text: async () => '[Event "A"]\n\n1. e4 e5 1-0\n\n[Event "B"]\n\n1. d4 d5 0-1'
      };
    };

    const res = await fetchLichessGamesPgnRated({ username: 'Thibault', limit: 200, fetchImpl });
    expect(res.gamesPgn).toHaveLength(2);
    expect(res.meta).toEqual({ requested: 200, returned: 2 });

    expect(calls).toHaveLength(1);
    expect(calls[0].opts.method).toBe('GET');
    expect(calls[0].opts.headers.Accept).toBe('application/x-chess-pgn');
    expect(String(calls[0].url)).toContain('https://lichess.org/api/games/user/Thibault?');
    expect(String(calls[0].url)).toContain('rated=true');
    expect(String(calls[0].url)).toContain('variant=standard');
    expect(String(calls[0].url)).toContain('perfType=rapid%2Cblitz%2Cclassical');
    expect(String(calls[0].url)).toContain('max=200');
    expect(String(calls[0].url)).toContain('pgnInJson=false');
  });

  test('getLichessGamesPgnRatedCached dedupes inflight requests', async () => {
    let resolveFetch;
    const fetchImpl = jest.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const p1 = getLichessGamesPgnRatedCached({ username: 'u', limit: 200, fetchImpl });
    const p2 = getLichessGamesPgnRatedCached({ username: 'u', limit: 200, fetchImpl });

    // Note: getLichessGamesPgnRatedCached is async, so each call returns a distinct Promise
    // even if the underlying inflight fetch is shared.
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      status: 200,
      text: async () => '[Event "A"]\n\n1. e4 e5 1-0'
    });

    const data = await p1;
    expect(data.gamesPgn).toHaveLength(1);
    expect(typeof data.cacheHit).toBe('boolean');

    const data2 = await p2;
    expect(data2.gamesPgn).toHaveLength(1);
  });
});
