const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();
const inflight = new Map();

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  return username.trim();
}

function splitMultiPgn(pgnText) {
  const text = (pgnText || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  // Lichess returns a concatenation of full PGNs. Each game typically starts with [Event "..."]
  if (text.includes('\n\n[Event ')) {
    return text
      .split(/\n\n(?=\[Event\s)/g)
      .map(part => part.trim())
      .filter(Boolean);
  }

  return [text];
}

function getFetch(fetchImpl) {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this runtime');
  }
  return fetch;
}

function buildLichessCacheKey({ username, limit }) {
  return [
    'lichess',
    normalizeUsername(username).toLowerCase(),
    `limit=${limit}`,
    'rated=true',
    'perfType=rapid,blitz,classical',
    'variant=standard'
  ].join(':');
}

async function fetchLichessGamesPgnRated({ username, limit = 500, fetchImpl } = {}) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    const err = new Error('username is required');
    err.status = 400;
    throw err;
  }

  const clampedLimit = clampInt(limit, 1, 500, 500);

  const params = new URLSearchParams({
    max: String(clampedLimit),
    rated: 'true',
    variant: 'standard',
    perfType: 'rapid,blitz,classical',
    pgnInJson: 'false'
  });

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(normalizedUsername)}?${params.toString()}`;

  const fetchFn = getFetch(fetchImpl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/x-chess-pgn',
        'User-Agent': 'chess-opening-explorer/1.0 (personal-opening-explorer)'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const err = new Error(`Lichess request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }

    const pgnText = await response.text();
    const gamesPgn = splitMultiPgn(pgnText).slice(0, clampedLimit);

    return {
      gamesPgn,
      meta: {
        requested: clampedLimit,
        returned: gamesPgn.length
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getLichessGamesPgnRatedCached({ username, limit = 500, fetchImpl } = {}) {
  const clampedLimit = clampInt(limit, 1, 500, 500);
  const key = buildLichessCacheKey({ username, limit: clampedLimit });
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return { ...cached.data, cacheHit: true };
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    const data = await fetchLichessGamesPgnRated({ username, limit: clampedLimit, fetchImpl });
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
  splitMultiPgn,
  fetchLichessGamesPgnRated,
  getLichessGamesPgnRatedCached
};
