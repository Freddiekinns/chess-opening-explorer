const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();
const inflight = new Map();

// Time classes we accept (matching Lichess: rapid, blitz, classical - no bullet)
const ACCEPTED_TIME_CLASSES = new Set(['rapid', 'blitz', 'classical']);

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  return username.trim();
}

function getFetch(fetchImpl) {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this runtime');
  }
  return fetch;
}

function buildChessComCacheKey({ username, limit }) {
  return [
    'chess.com',
    normalizeUsername(username).toLowerCase(),
    `limit=${limit}`,
    'rated=true',
    'timeClass=rapid,blitz,classical',
    'rules=chess'
  ].join(':');
}

/**
 * Fetch the list of available monthly archives for a Chess.com user
 * @param {Object} options
 * @param {string} options.username
 * @param {Function} [options.fetchImpl] - Optional fetch implementation for testing
 * @returns {Promise<string[]>} Array of archive URLs in chronological order
 */
async function fetchChessComArchives({ username, fetchImpl } = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    const err = new Error('username is required');
    err.status = 400;
    throw err;
  }

  const url = `https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}/games/archives`;

  const fetchFn = getFetch(fetchImpl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'chess-opening-explorer/1.0 (personal-opening-explorer)'
      },
      signal: controller.signal
    });

    if (response.status === 404) {
      const err = new Error('User not found on Chess.com');
      err.status = 404;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`Chess.com request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return data.archives || [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch games from a single monthly archive
 * @param {Object} options
 * @param {string} options.archiveUrl - Full URL to the monthly archive
 * @param {Function} [options.fetchImpl] - Optional fetch implementation for testing
 * @returns {Promise<Object[]>} Array of game objects
 */
async function fetchChessComMonthlyGames({ archiveUrl, fetchImpl } = {}) {
  const fetchFn = getFetch(fetchImpl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetchFn(archiveUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'chess-opening-explorer/1.0 (personal-opening-explorer)'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      // Don't fail entirely if one month is unavailable
      return [];
    }

    const data = await response.json();
    return data.games || [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Filter a game to check if it meets our criteria
 * @param {Object} game - Chess.com game object
 * @returns {boolean}
 */
function isGameAccepted(game) {
  // Must be rated
  if (!game.rated) return false;

  // Must be standard chess (not chess960, bughouse, etc.)
  if (game.rules !== 'chess') return false;

  // Must be rapid, blitz, or classical (no bullet)
  if (!ACCEPTED_TIME_CLASSES.has(game.time_class)) return false;

  // Must have PGN
  if (!game.pgn) return false;

  return true;
}

/**
 * Fetch rated games PGN for a Chess.com user
 * Fetches from most recent archives until we have enough games
 * @param {Object} options
 * @param {string} options.username
 * @param {number} [options.limit=500]
 * @param {Function} [options.fetchImpl] - Optional fetch implementation for testing
 * @returns {Promise<{gamesPgn: string[], meta: Object}>}
 */
async function fetchChessComGamesPgn({ username, limit = 500, fetchImpl } = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    const err = new Error('username is required');
    err.status = 400;
    throw err;
  }

  const clampedLimit = clampInt(limit, 1, 500, 500);

  // Step 1: Get list of archives
  const archives = await fetchChessComArchives({ username: normalizedUsername, fetchImpl });

  if (archives.length === 0) {
    return {
      gamesPgn: [],
      meta: {
        requested: clampedLimit,
        returned: 0
      }
    };
  }

  // Step 2: Fetch from most recent archives until we have enough games
  // Archives are in chronological order, so we reverse to start from most recent
  const reversedArchives = [...archives].reverse();

  const collectedPgns = [];
  let archivesChecked = 0;

  for (const archiveUrl of reversedArchives) {
    if (collectedPgns.length >= clampedLimit) break;

    archivesChecked++;
    const games = await fetchChessComMonthlyGames({ archiveUrl, fetchImpl });

    // Filter and collect games (most recent first within each month)
    // Chess.com returns games in chronological order, so reverse for most recent first
    const reversedGames = [...games].reverse();

    for (const game of reversedGames) {
      if (collectedPgns.length >= clampedLimit) break;

      if (isGameAccepted(game)) {
        collectedPgns.push(game.pgn);
      }
    }

    // Safety: don't fetch more than 6 months of archives
    if (archivesChecked >= 6) break;
  }

  return {
    gamesPgn: collectedPgns,
    meta: {
      requested: clampedLimit,
      returned: collectedPgns.length,
      archivesChecked
    }
  };
}

/**
 * Cached version of fetchChessComGamesPgn with deduplication of in-flight requests
 * @param {Object} options
 * @param {string} options.username
 * @param {number} [options.limit=500]
 * @param {Function} [options.fetchImpl] - Optional fetch implementation for testing
 * @returns {Promise<{gamesPgn: string[], meta: Object, cacheHit: boolean}>}
 */
async function getChessComGamesPgnCached({ username, limit = 500, fetchImpl } = {}) {
  const clampedLimit = clampInt(limit, 1, 500, 500);
  const key = buildChessComCacheKey({ username, limit: clampedLimit });
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return { ...cached.data, cacheHit: true };
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    const data = await fetchChessComGamesPgn({ username, limit: clampedLimit, fetchImpl });
    cache.set(key, { timestamp: Date.now(), data });
    inflight.delete(key);
    return { ...data, cacheHit: false };
  })().catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

module.exports = {
  fetchChessComArchives,
  fetchChessComMonthlyGames,
  fetchChessComGamesPgn,
  getChessComGamesPgnCached,
  isGameAccepted,
  // Export for testing
  ACCEPTED_TIME_CLASSES
};
