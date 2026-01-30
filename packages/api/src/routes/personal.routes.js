const express = require('express');

const {
  getLichessGamesPgnRatedCached: defaultGetLichessGamesPgnRatedCached
} = require('../services/personal-games-service');

const {
  getChessComGamesPgnCached: defaultGetChessComGamesPgnCached
} = require('../services/chesscom-games-service');

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizePlatform(platform) {
  if (!platform || typeof platform !== 'string') return '';
  return platform.trim().toLowerCase();
}

function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  return username.trim();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (req.ip) return req.ip;
  return 'unknown';
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const ip = getClientIp(req);

    const current = hits.get(ip);
    if (!current || now >= current.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count <= max) {
      hits.set(ip, current);
      return next();
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${retryAfterSeconds}s.`
    });
  };
}

function createPersonalRoutes(
  {
    getLichessGamesPgnRatedCached = defaultGetLichessGamesPgnRatedCached,
    getChessComGamesPgnCached = defaultGetChessComGamesPgnCached,
    rateLimit = { windowMs: 10 * 60 * 1000, max: 30 }
  } = {}
) {
  const router = express.Router();

  router.use(createRateLimiter(rateLimit));

  /**
   * @route GET /api/personal/games
   * @desc Fetch rated games PGN for a username (fetch-only)
   * @query platform=lichess
   * @query username
   * @query limit (default 200, max 200)
   */
  router.get('/games', async (req, res) => {
    try {
      const platform = normalizePlatform(req.query.platform);
      const username = normalizeUsername(req.query.username);
      const limit = clampInt(req.query.limit, 1, 200, 200);

      if (!platform) {
        return res.status(400).json({
          success: false,
          error: 'platform is required',
          message: 'Use platform=lichess or platform=chess.com'
        });
      }

      if (platform !== 'lichess' && platform !== 'chess.com') {
        return res.status(400).json({
          success: false,
          error: 'Unsupported platform',
          message: 'Supported platforms: lichess, chess.com'
        });
      }

      if (!username || username.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'username is required',
          message: 'Provide a valid username (max 100 chars)'
        });
      }

      let result;
      if (platform === 'lichess') {
        result = await getLichessGamesPgnRatedCached({ username, limit });
      } else {
        result = await getChessComGamesPgnCached({ username, limit });
      }

      return res.json({
        success: true,
        data: { gamesPgn: result.gamesPgn },
        meta: {
          ...result.meta,
          cacheHit: result.cacheHit === true
        }
      });
    } catch (error) {
      const status = typeof error.status === 'number' ? error.status : 500;
      return res.status(status).json({
        success: false,
        error: status === 500 ? 'Internal Server Error' : 'Request failed',
        message: status === 500 ? 'Failed to fetch personal games' : error.message
      });
    }
  });

  return router;
}

module.exports = createPersonalRoutes;
module.exports.createPersonalRoutes = createPersonalRoutes;
