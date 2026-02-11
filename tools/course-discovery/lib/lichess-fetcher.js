/**
 * Lichess API client for fetching studies and PGN data
 * Uses native fetch (Node 18+) with rate limiting
 */

const LICHESS_BASE = 'https://lichess.org';
const MIN_DELAY_MS = 1100; // Slightly over 1 req/sec
const BACKOFF_429_MS = 60000; // 60s on rate limit
const MAX_RETRIES = 3;

let lastRequestTime = 0;

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch wrapper
 * Enforces minimum delay between requests and handles 429 responses
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<Response>}
 */
async function rateLimitedFetch(url, options = {}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Enforce minimum delay between requests
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_DELAY_MS) {
      await module.exports.sleep(MIN_DELAY_MS - elapsed);
    }

    lastRequestTime = Date.now();
    const response = await fetch(url, options);

    if (response.status === 429) {
      if (attempt < MAX_RETRIES) {
        const backoff = BACKOFF_429_MS * attempt;
        await module.exports.sleep(backoff);
        continue;
      }
      throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${url}`);
    }

    return response;
  }
}

/**
 * Fetch all public studies for a Lichess user
 * @param {string} username - Lichess username
 * @returns {Promise<Array<{id: string, name: string, createdAt: number, updatedAt: number}>>}
 */
async function fetchStudyList(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }

  const url = `${LICHESS_BASE}/api/study/by/${encodeURIComponent(username)}`;
  const response = await rateLimitedFetch(url, {
    headers: { 'Accept': 'application/x-ndjson' }
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch studies for ${username}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseNDJSON(text);
}

/**
 * Fetch PGN for a study (all chapters)
 * @param {string} studyId - Lichess study ID
 * @returns {Promise<string>} Raw PGN text
 */
async function fetchStudyPGN(studyId) {
  if (!studyId || typeof studyId !== 'string') {
    throw new Error('Study ID is required');
  }

  const url = `${LICHESS_BASE}/api/study/${encodeURIComponent(studyId)}.pgn?comments=false&variations=false&clocks=false`;
  const response = await rateLimitedFetch(url);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch PGN for study ${studyId}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Parse NDJSON (newline-delimited JSON) text into an array of objects
 * @param {string} text - NDJSON text
 * @returns {Array<object>}
 */
function parseNDJSON(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n').filter(line => line.trim());
  const results = [];

  for (const line of lines) {
    try {
      results.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

/**
 * Reset the rate limiter (useful for testing)
 */
function resetRateLimiter() {
  lastRequestTime = 0;
}

module.exports = {
  fetchStudyList,
  fetchStudyPGN,
  parseNDJSON,
  rateLimitedFetch,
  resetRateLimiter,
  sleep,
  // Exported for testing
  LICHESS_BASE,
  MIN_DELAY_MS,
  BACKOFF_429_MS,
  MAX_RETRIES
};
