/**
 * Lichess opening-explorer proxy (deviation-trainer PRD §5).
 *
 * Since March 2026 the explorer API rejects anonymous requests (DDoS
 * defence — see lichess.org/@/thibault/blog). This route attaches the
 * server's LICHESS_EXPLORER_TOKEN so site visitors need no Lichess account.
 * The response is a pure pass-through of the Lichess JSON; normalisation
 * stays client-side (packages/web/src/lib/lichessExplorer.ts).
 *
 * The token is rate-limited to 25 requests/minute by Lichess, so success
 * responses carry long CDN cache headers — only cache misses ever reach
 * Lichess. This route owns its Cache-Control entirely: do NOT add an
 * /api/explorer entry to vercel.json's headers array, because config headers
 * override function headers and would clobber both the masters 7-day TTL and
 * the no-store on failures. Failures are never cached and the client degrades
 * to the snapshot stats.
 *
 * Crawlers that render JavaScript (Googlebot etc.) would otherwise fire ~3
 * explorer calls per page across 12k+ indexed pages, burning the token's
 * budget on bots. Known bot user-agents get a cheap 403 before anything else;
 * the client falls back to the snapshot stats, so bots still index the real
 * master-games numbers.
 */

const express = require('express');

const router = express.Router();

const EXPLORER_BASE = 'https://explorer.lichess.org';
const SPEEDS = 'blitz,rapid,classical';
const MAX_MOVES = 12;
const MAX_TOP_GAMES = 15;
const MASTERS_CACHE = 'public, s-maxage=604800, stale-while-revalidate=86400';
const LICHESS_CACHE = 'public, s-maxage=86400, stale-while-revalidate=86400';

// Known crawler user-agents (explicit names, not a bare /bot/i — real phone
// UAs like "Cubot" would false-positive). Live stats are client-side
// progressive enhancement, so bots lose nothing they could index.
const BOT_UA =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex(bot)?|applebot|petalbot|bytespider|gptbot|ccbot|claudebot|amazonbot|ahrefsbot|semrushbot|mj12bot|dotbot|facebookexternalhit|crawler|spider|headlesschrome|lighthouse/i;

// Band ids shared with the frontend BANDS list; ratings per the PRD table.
// `all` spans every Lichess rating bucket — the default "any level" view.
const BAND_RATINGS = {
  all: '0,1000,1200,1400,1600,1800,2000,2200,2500',
  u1400: '0,1000,1200',
  1400: '1400,1600',
  1800: '1800,2000',
  2200: '2200,2500',
  masters: null,
};

function buildUpstreamUrl(fen, band) {
  if (band === 'masters') {
    return `${EXPLORER_BASE}/masters?fen=${encodeURIComponent(fen)}&moves=${MAX_MOVES}&topGames=${MAX_TOP_GAMES}`;
  }
  return (
    `${EXPLORER_BASE}/lichess?variant=standard` +
    `&speeds=${encodeURIComponent(SPEEDS)}` +
    `&ratings=${encodeURIComponent(BAND_RATINGS[band])}` +
    `&fen=${encodeURIComponent(fen)}` +
    `&moves=${MAX_MOVES}&topGames=0&recentGames=0`
  );
}

function isPlausibleFen(fen) {
  if (typeof fen !== 'string' || fen.length < 15 || fen.length > 100) return false;
  const parts = fen.split(' ');
  return parts.length >= 2 && parts[0].split('/').length === 8;
}

router.get('/', async (req, res) => {
  const { fen, band } = req.query;

  // Cheapest check first: never spend the Lichess budget on crawler renders.
  // 403 (not an empty 200) so the client takes its error path and falls back
  // to the snapshot stats — bots index real numbers, not a thin-sample note.
  if (BOT_UA.test(req.get('user-agent') || '')) {
    return res
      .status(403)
      .set('Cache-Control', 'no-store')
      .json({ error: 'Live stats are not served to automated clients' });
  }

  if (!isPlausibleFen(fen)) {
    return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Invalid fen' });
  }
  if (typeof band !== 'string' || !(band in BAND_RATINGS)) {
    return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Invalid band' });
  }

  const token = process.env.LICHESS_EXPLORER_TOKEN;
  if (!token) {
    return res
      .status(503)
      .set('Cache-Control', 'no-store')
      .json({ error: 'Explorer proxy not configured' });
  }

  try {
    const upstream = await fetch(buildUpstreamUrl(fen, band), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'openingbook.xyz explorer proxy',
      },
    });

    if (!upstream.ok) {
      return res
        .status(upstream.status === 429 ? 429 : 502)
        .set('Cache-Control', 'no-store')
        .json({ error: 'Upstream error', status: upstream.status });
    }

    const data = await upstream.json();
    res.set('Cache-Control', band === 'masters' ? MASTERS_CACHE : LICHESS_CACHE);
    return res.json(data);
  } catch {
    return res
      .status(502)
      .set('Cache-Control', 'no-store')
      .json({ error: 'Upstream unreachable' });
  }
});

module.exports = router;
