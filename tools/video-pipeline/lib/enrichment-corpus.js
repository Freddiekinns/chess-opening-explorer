/**
 * The matching corpus, read back from the enrichment cache.
 *
 * `video_enrichment_cache.json` is the durable record of every video the
 * pipeline has ever fetched from YouTube. The `videos` table is not: matching
 * only writes back the videos that won a top-10 slot on some opening, so a
 * video the scorer of the day rejected leaves the database and never returns.
 *
 * That makes re-scoring a ratchet — `pipeline:rematch` reads the table, so a
 * better scorer can only reshuffle the winners of the worse one. It cost the
 * Accelerated Dragon page three of its best videos (Seirawan's 455k-view
 * lecture, two Naroditsky theory speedruns) which score 155–175 today but were
 * dropped by an earlier scorer and so were never seen again.
 *
 * Reading the cache back restores the full corpus at zero API cost. Candidates
 * go through the same pre-filter discovery uses, so nothing enters that
 * discovery itself would have rejected.
 */

const fs = require('fs');
const path = require('path');
const PreFilterVideos = require('./candidate-filter');

const CACHE_PATH = path.join(__dirname, '../../data/video_enrichment_cache.json');
const CHANNELS_CONFIG_PATH = path.join(__dirname, '../../../config/youtube_channels.json');

/** channel title → quality tier, from the single source of truth */
function loadChannelTiers(configPath) {
  const tiers = [];
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    for (const channel of config.trusted_channels || []) {
      // Strip parenthetical suffixes: "ChessExplained (Christof Sielecki)"
      const name = channel.name
        .replace(/\s*\(.*\)\s*$/, '')
        .trim()
        .toLowerCase();
      if (name)
        tiers.push({ name, tier: channel.quality_tier === 'premium' ? 'premium' : 'standard' });
    }
  } catch (error) {
    // No config — every channel is treated as standard
  }
  return tiers;
}

/**
 * Convert a cache entry to the enriched-candidate shape
 * `runMatchingWithVideos` consumes.
 *
 * Two fields the cache never stored are reconstructed: the thumbnail URL,
 * which YouTube derives from the video id, and the channel quality tier, which
 * the pre-filter needs for its duration threshold.
 */
function cacheEntryToCandidate(entry, channelTiers = loadChannelTiers(CHANNELS_CONFIG_PATH)) {
  const channelTitle = (entry.channelTitle || '').toLowerCase();
  const matched = channelTiers.find(({ name }) => channelTitle.includes(name));

  return {
    id: entry.id,
    title: entry.title,
    description: entry.description || '',
    channelId: entry.channelId || '',
    channelTitle: entry.channelTitle || '',
    duration: entry.duration,
    statistics: { viewCount: String(entry.viewCount || 0) },
    publishedAt: entry.publishedAt,
    thumbnails: { default: { url: `https://i.ytimg.com/vi/${entry.id}/default.jpg` } },
    tags: entry.tags || [],
    qualityTier: matched ? matched.tier : 'standard',
  };
}

/**
 * Load every cached video that passes the discovery pre-filter.
 *
 * @param {Object}  options
 * @param {string}  options.cachePath           enrichment cache to read
 * @param {Set}     options.excludeIds          ids already in the corpus
 * @param {string}  options.channelsConfigPath  channel tiers
 * @returns {{videos: Array, total: number, rejected: number, recovered: number}}
 */
function loadEnrichmentCorpus({
  cachePath = CACHE_PATH,
  excludeIds = new Set(),
  channelsConfigPath = CHANNELS_CONFIG_PATH,
} = {}) {
  let cache;
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (error) {
    return { videos: [], total: 0, rejected: 0, recovered: 0 };
  }

  const channelTiers = loadChannelTiers(channelsConfigPath);
  const preFilter = new PreFilterVideos();
  const entries = Object.values(cache).filter((entry) => entry && entry.id && entry.title);

  let rejected = 0;
  const videos = [];
  for (const entry of entries) {
    const candidate = cacheEntryToCandidate(entry, channelTiers);
    if (!preFilter.preFilterVideo(candidate)) {
      rejected++;
      continue;
    }
    if (excludeIds.has(candidate.id)) continue;
    videos.push(candidate);
  }

  return { videos, total: entries.length, rejected, recovered: videos.length };
}

module.exports = { loadEnrichmentCorpus, cacheEntryToCandidate, CACHE_PATH };
