import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BANDS,
  buildExplorerUrl,
  fetchExplorer,
  sideScorePct,
  rankNotableGames,
  ExplorerError,
  __resetExplorerCacheForTests,
  type ExplorerResult,
  type ExplorerTopGame,
} from '../lichessExplorer';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function rawPayload(overrides: Record<string, unknown> = {}) {
  return {
    white: 600,
    draws: 200,
    black: 200,
    moves: [
      { uci: 'c7c5', san: 'c5', white: 300, draws: 100, black: 100, averageRating: 2400 },
      { uci: 'e7e5', san: 'e5', white: 200, draws: 80, black: 70, averageRating: 2350 },
    ],
    topGames: [
      {
        id: 'abc1',
        winner: 'white',
        white: { name: 'Carlsen', rating: 2850 },
        black: { name: 'Caruana', rating: 2800 },
        year: 2019,
        month: '2019-05',
      },
    ],
    ...overrides,
  };
}

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('buildExplorerUrl', () => {
  it('uses the masters endpoint with no ratings param for the masters band', () => {
    const url = buildExplorerUrl(FEN, 'masters');
    expect(url).toContain('explorer.lichess.ovh/masters');
    expect(url).toContain(`fen=${encodeURIComponent(FEN)}`);
    expect(url).not.toContain('ratings=');
  });

  it.each([
    ['2200', '2200,2500'],
    ['1800', '1800,2000'],
    ['1400', '1400,1600'],
    ['u1400', '0,1000,1200'],
  ] as const)('maps band %s to ratings=%s on the lichess endpoint', (band, ratings) => {
    const url = buildExplorerUrl(FEN, band);
    expect(url).toContain('explorer.lichess.ovh/lichess');
    expect(url).toContain(`ratings=${encodeURIComponent(ratings)}`);
    expect(url).toContain(`speeds=${encodeURIComponent('blitz,rapid,classical')}`);
  });
});

describe('BANDS', () => {
  it('exposes the five PRD bands in order', () => {
    expect(BANDS.map((b) => b.id)).toEqual(['masters', '2200', '1800', '1400', 'u1400']);
  });
});

describe('fetchExplorer', () => {
  beforeEach(() => {
    __resetExplorerCacheForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('normalises a masters payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(rawPayload())));
    const result = await fetchExplorer(FEN, 'masters');
    expect(result.totalGames).toBe(1000);
    expect(result.moves[0]).toEqual({
      san: 'c5',
      games: 500,
      whitePct: 60,
      drawPct: 20,
      blackPct: 20,
    });
    expect(result.topGames).toHaveLength(1);
    expect(result.topGames[0].white.name).toBe('Carlsen');
  });

  it('tolerates a missing topGames array (lichess endpoint)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse(rawPayload({ topGames: undefined })))
    );
    const result = await fetchExplorer(FEN, '1400');
    expect(result.topGames).toEqual([]);
  });

  it('throws ExplorerError with status on 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) })
    );
    await expect(fetchExplorer(FEN, 'masters')).rejects.toMatchObject({ status: 429 });
    await expect(
      fetchExplorer(`${FEN} `, 'masters').catch((e) => Promise.reject(e))
    ).rejects.toBeInstanceOf(ExplorerError);
  });

  it('throws ExplorerError on a malformed payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ nonsense: true })));
    await expect(fetchExplorer(FEN, 'masters')).rejects.toBeInstanceOf(ExplorerError);
  });

  it('serves the second call from cache without refetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(rawPayload()));
    vi.stubGlobal('fetch', fetchMock);
    await fetchExplorer(FEN, 'masters');
    await fetchExplorer(FEN, 'masters');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('survives a localStorage round-trip (fresh session, memory cache cleared)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(rawPayload()));
    vi.stubGlobal('fetch', fetchMock);
    await fetchExplorer(FEN, 'masters');
    __resetExplorerCacheForTests({ keepLocalStorage: true });
    await fetchExplorer(FEN, 'masters');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has expired', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(rawPayload()));
    vi.stubGlobal('fetch', fetchMock);
    const now = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

    await fetchExplorer(FEN, '1400'); // lichess TTL: 24h
    __resetExplorerCacheForTests({ keepLocalStorage: true });
    nowSpy.mockReturnValue(now + 25 * 60 * 60 * 1000);
    await fetchExplorer(FEN, '1400');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('prunes the localStorage cache past 200 entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(rawPayload()));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 205; i++) {
      await fetchExplorer(`fen-${i} w KQkq - 0 1`, 'masters');
    }
    const stored = JSON.parse(localStorage.getItem('openingbook:explorer-cache') || '{}');
    expect(Object.keys(stored).length).toBeLessThanOrEqual(200);
  });

  it('dedupes concurrent in-flight requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(rawPayload()));
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([fetchExplorer(FEN, 'masters'), fetchExplorer(FEN, 'masters')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('sideScorePct', () => {
  const result: ExplorerResult = {
    totalGames: 1000,
    white: 600,
    draws: 200,
    black: 200,
    moves: [],
    topGames: [],
  };

  it('computes points percentage (wins + half draws)', () => {
    expect(sideScorePct(result, 'w')).toBeCloseTo(70);
    expect(sideScorePct(result, 'b')).toBeCloseTo(30);
  });

  it('returns 0 for an empty sample', () => {
    expect(sideScorePct({ ...result, totalGames: 0, white: 0, draws: 0, black: 0 }, 'w')).toBe(0);
  });
});

describe('rankNotableGames', () => {
  const game = (
    id: string,
    whiteName: string,
    whiteRating: number,
    blackName: string,
    blackRating: number
  ): ExplorerTopGame => ({
    id,
    white: { name: whiteName, rating: whiteRating },
    black: { name: blackName, rating: blackRating },
    winner: 'white',
    year: 2020,
  });

  it('sorts by average rating descending', () => {
    const ranked = rankNotableGames([
      game('low', 'A', 2500, 'B', 2500),
      game('high', 'C', 2800, 'D', 2800),
    ]);
    expect(ranked.map((g) => g.id)).toEqual(['high', 'low']);
  });

  it('keeps at most one game per player', () => {
    const ranked = rankNotableGames([
      game('g1', 'Carlsen', 2850, 'Caruana', 2800),
      game('g2', 'Carlsen', 2850, 'Nakamura', 2790),
      game('g3', 'So', 2770, 'Giri', 2760),
    ]);
    expect(ranked.map((g) => g.id)).toEqual(['g1', 'g3']);
  });

  it('caps the list at 5 by default', () => {
    const games = Array.from({ length: 8 }, (_, i) =>
      game(`g${i}`, `White${i}`, 2700 - i, `Black${i}`, 2700 - i)
    );
    expect(rankNotableGames(games)).toHaveLength(5);
  });

  it('returns an empty list for empty input', () => {
    expect(rankNotableGames([])).toEqual([]);
  });
});
