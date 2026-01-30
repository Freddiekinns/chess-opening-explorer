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
    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: jest.fn(),
      getChessComGamesPgnCached: jest.fn()
    }));

    const res = await request(app)
      .get('/api/personal/games?username=foo')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('platform is required');
  });

  test('GET /api/personal/games rejects unsupported platform', async () => {
    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: jest.fn(),
      getChessComGamesPgnCached: jest.fn()
    }));

    const res = await request(app)
      .get('/api/personal/games?platform=invalid&username=foo')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unsupported platform');
    expect(res.body.message).toContain('lichess');
    expect(res.body.message).toContain('chess.com');
  });

  test('GET /api/personal/games validates username', async () => {
    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: jest.fn(),
      getChessComGamesPgnCached: jest.fn()
    }));

    const res = await request(app)
      .get('/api/personal/games?platform=lichess')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('username is required');
  });

  test('GET /api/personal/games returns games PGN list for Lichess', async () => {
    const mockLichess = jest.fn().mockResolvedValue({
      gamesPgn: ['[Event "test"]\n\n1. e4 e5 1-0'],
      meta: { requested: 200, returned: 1 },
      cacheHit: true
    });
    const mockChessCom = jest.fn();

    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: mockLichess,
      getChessComGamesPgnCached: mockChessCom,
      rateLimit: { windowMs: 10 * 60 * 1000, max: 1000 }
    }));

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=SomeUser&limit=200')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { gamesPgn: ['[Event "test"]\n\n1. e4 e5 1-0'] },
      meta: { requested: 200, returned: 1, cacheHit: true }
    });

    expect(mockLichess).toHaveBeenCalledWith({ username: 'SomeUser', limit: 200 });
    expect(mockChessCom).not.toHaveBeenCalled();
  });

  test('GET /api/personal/games returns games PGN list for Chess.com', async () => {
    const mockLichess = jest.fn();
    const mockChessCom = jest.fn().mockResolvedValue({
      gamesPgn: ['[Event "Live Chess"]\n\n1. d4 d5 1/2-1/2'],
      meta: { requested: 100, returned: 1, archivesChecked: 1 },
      cacheHit: false
    });

    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: mockLichess,
      getChessComGamesPgnCached: mockChessCom,
      rateLimit: { windowMs: 10 * 60 * 1000, max: 1000 }
    }));

    const res = await request(app)
      .get('/api/personal/games?platform=chess.com&username=MagnusCarlsen&limit=100')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { gamesPgn: ['[Event "Live Chess"]\n\n1. d4 d5 1/2-1/2'] },
      meta: { requested: 100, returned: 1, archivesChecked: 1, cacheHit: false }
    });

    expect(mockChessCom).toHaveBeenCalledWith({ username: 'MagnusCarlsen', limit: 100 });
    expect(mockLichess).not.toHaveBeenCalled();
  });

  test('GET /api/personal/games enforces rate limit', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      gamesPgn: [],
      meta: { requested: 200, returned: 0 },
      cacheHit: false
    });

    app.use('/api/personal', createPersonalRoutes({
      getLichessGamesPgnRatedCached: mockGet,
      getChessComGamesPgnCached: jest.fn(),
      rateLimit: { windowMs: 60 * 1000, max: 1 }
    }));

    await request(app)
      .get('/api/personal/games?platform=lichess&username=user')
      .expect(200);

    const res = await request(app)
      .get('/api/personal/games?platform=lichess&username=user')
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Too Many Requests');
    expect(res.headers['retry-after']).toBeTruthy();
  });
});
