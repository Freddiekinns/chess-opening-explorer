const request = require('supertest');
const express = require('express');

const createPersonalRoutes = require('../../packages/api/src/routes/personal.routes');

describe('Personal API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  test('GET /api/personal/games validates platform', async () => {
    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: jest.fn(),
        getChessComGamesPgnCached: jest.fn(),
      })
    );

    const res = await request(app).get('/api/personal/games?username=foo').expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('platform is required');
  });

  test('GET /api/personal/games rejects unsupported platform', async () => {
    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: jest.fn(),
        getChessComGamesPgnCached: jest.fn(),
      })
    );

    const res = await request(app)
      .get('/api/personal/games?platform=invalid&username=foo')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unsupported platform');
    expect(res.body.message).toContain('lichess');
    expect(res.body.message).toContain('chess.com');
  });

  test('GET /api/personal/games validates username', async () => {
    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: jest.fn(),
        getChessComGamesPgnCached: jest.fn(),
      })
    );

    const res = await request(app).get('/api/personal/games?platform=lichess').expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('username is required');
  });

  test('GET /api/personal/games returns games PGN list for Lichess', async () => {
    const mockLichess = jest.fn().mockResolvedValue({
      gamesPgn: ['[Event "test"]\n\n1. e4 e5 1-0'],
      meta: { requested: 500, returned: 1 },
      cacheHit: true,
    });
    const mockChessCom = jest.fn();

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockLichess,
        getChessComGamesPgnCached: mockChessCom,
        rateLimit: { windowMs: 10 * 60 * 1000, max: 1000 },
      })
    );

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=SomeUser&limit=500')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { gamesPgn: ['[Event "test"]\n\n1. e4 e5 1-0'] },
      meta: { requested: 500, returned: 1, cacheHit: true },
    });

    expect(mockLichess).toHaveBeenCalledWith({ username: 'SomeUser', limit: 500 });
    expect(mockChessCom).not.toHaveBeenCalled();
  });

  test('GET /api/personal/games returns games PGN list for Chess.com', async () => {
    const mockLichess = jest.fn();
    const mockChessCom = jest.fn().mockResolvedValue({
      gamesPgn: ['[Event "Live Chess"]\n\n1. d4 d5 1/2-1/2'],
      meta: { requested: 100, returned: 1, archivesChecked: 1 },
      cacheHit: false,
    });

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockLichess,
        getChessComGamesPgnCached: mockChessCom,
        rateLimit: { windowMs: 10 * 60 * 1000, max: 1000 },
      })
    );

    const res = await request(app)
      .get('/api/personal/games?platform=chess.com&username=MagnusCarlsen&limit=100')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { gamesPgn: ['[Event "Live Chess"]\n\n1. d4 d5 1/2-1/2'] },
      meta: { requested: 100, returned: 1, archivesChecked: 1, cacheHit: false },
    });

    expect(mockChessCom).toHaveBeenCalledWith({ username: 'MagnusCarlsen', limit: 100 });
    expect(mockLichess).not.toHaveBeenCalled();
  });

  test('GET /api/personal/games enforces rate limit', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      gamesPgn: [],
      meta: { requested: 500, returned: 0 },
      cacheHit: false,
    });

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockGet,
        getChessComGamesPgnCached: jest.fn(),
        rateLimit: { windowMs: 60 * 1000, max: 1 },
      })
    );

    await request(app).get('/api/personal/games?platform=lichess&username=user').expect(200);

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=user')
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Too Many Requests');
    expect(res.headers['retry-after']).toBeTruthy();
  });

  test('GET /api/personal/games reads client IP from X-Forwarded-For header', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      gamesPgn: [],
      meta: { requested: 500, returned: 0 },
      cacheHit: false,
    });

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockGet,
        getChessComGamesPgnCached: jest.fn(),
        rateLimit: { windowMs: 60 * 1000, max: 10 },
      })
    );

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=testuser')
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('GET /api/personal/games allows second request within rate limit', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      gamesPgn: [],
      meta: { requested: 500, returned: 0 },
      cacheHit: false,
    });

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockGet,
        getChessComGamesPgnCached: jest.fn(),
        rateLimit: { windowMs: 60 * 1000, max: 5 },
      })
    );

    // First request: count = 1, resetAt set
    await request(app).get('/api/personal/games?platform=lichess&username=testuser').expect(200);

    // Second request: count = 2, still within max=5 (exercises lines 50-53)
    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=testuser')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('GET /api/personal/games handles error with numeric status from service', async () => {
    const serviceError = new Error('Service unavailable');
    serviceError.status = 503;

    const mockGet = jest.fn().mockRejectedValue(serviceError);

    app.use(
      '/api/personal',
      createPersonalRoutes({
        getLichessGamesPgnRatedCached: mockGet,
        getChessComGamesPgnCached: jest.fn(),
        rateLimit: { windowMs: 60 * 1000, max: 10 },
      })
    );

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=testuser')
      .expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Request failed');
    expect(res.body.message).toBe('Service unavailable');
  });
});
