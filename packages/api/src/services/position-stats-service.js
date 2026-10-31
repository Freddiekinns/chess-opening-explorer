/**
 * Position Stats Service
 * Every Lichess band's counts, average rating and next moves for one position,
 * from api/data/position-stats/NN.json (written by
 * tools/analysis/combine_window.py). The page endpoint reads one shard per
 * request, so a cold start never loads the whole 25 MB set.
 */

const fs = require('fs');
const pathResolver = require('../utils/path-resolver');

const SHARD_COUNT = 256;
const BANDS = ['all', 'u1400', '1400', '1800', '2200'];
// ~100 KB each: a warm instance keeps at most this many, oldest out first.
const MAX_CACHED_SHARDS = 32;

const shards = new Map();

/** djb2, as shardForFen in middleware.ts and combine_window.shard_for_fen. */
function shardFor(fen) {
  let hash = 5381;
  for (let i = 0; i < fen.length; i++) {
    hash = (hash * 33 + fen.charCodeAt(i)) >>> 0;
  }
  return hash % SHARD_COUNT;
}

function readShard(index) {
  if (shards.has(index)) return shards.get(index);
  const file = pathResolver.getDataPath(`position-stats/${String(index).padStart(2, '0')}.json`);
  const shard = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (shards.size >= MAX_CACHED_SHARDS) shards.delete(shards.keys().next().value);
  shards.set(index, shard);
  return shard;
}

function pct(part, total) {
  return (part / total) * 100;
}

/**
 * The shape lib/lichessExplorer.ts normalises the explorer into, so the
 * detail page reads our data and the explorer's alike. No top games: the
 * monthly files are counted, not kept.
 */
function toExplorerResult(detail) {
  if (!detail) return null;
  return {
    totalGames: detail.g,
    white: detail.w,
    draws: detail.d,
    black: detail.b,
    averageRating: detail.avg_rating,
    topGames: [],
    moves: detail.moves.map((move) => ({
      san: move.san,
      games: move.g,
      whitePct: pct(move.w, move.g),
      drawPct: pct(move.d, move.g),
      blackPct: pct(move.b, move.g),
    })),
  };
}

/**
 * Every band for a FEN, each null when it has too few games. Null as a whole
 * when the shard can't be read, so the page falls back to its snapshot.
 */
function bandsFor(fen) {
  let shard;
  try {
    shard = readShard(shardFor(fen));
  } catch (error) {
    console.warn('Position stats unavailable:', error.message);
    return null;
  }
  const entry = (shard.positions || {})[fen];
  const bands = (entry && entry.bands) || {};
  return Object.fromEntries(BANDS.map((band) => [band, toExplorerResult(bands[band])]));
}

module.exports = { shardFor, bandsFor };
