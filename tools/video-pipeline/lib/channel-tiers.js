/**
 * Channel quality tiers, read from config/youtube_channels.json — the single
 * source of truth for which channels are premium vs standard educators.
 *
 * Titles are compared on a normalised form (lowercase, letters and digits
 * only) because a channel's config display name and its YouTube title differ
 * in spacing and punctuation: the config says "Chess Network", the channel
 * calls itself "ChessNetwork". Comparing the raw strings dropped that channel
 * to the unknown tier, which costs 60 points in the scorer (+40 premium not
 * awarded, -25 instead of -5 for a non-educational title) and holds its videos
 * to the stricter standard-tier duration gate in the pre-filter.
 *
 * Channel id wins when it is known. The enrichment cache never stored one, so
 * recovered candidates rely entirely on the title path.
 */

const fs = require('fs');
const path = require('path');

const CHANNELS_CONFIG_PATH = path.join(__dirname, '../../../config/youtube_channels.json');

/** Lowercase, letters and digits only — "Chess Network" and "ChessNetwork" agree. */
function normalizeChannelName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} [configPath]
 * @returns {{byId: Map<string,string>, byName: Array<{name: string, tier: string}>}}
 */
function loadChannelTiers(configPath = CHANNELS_CONFIG_PATH) {
  const tiers = { byId: new Map(), byName: [] };
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    for (const channel of config.trusted_channels || []) {
      const tier = channel.quality_tier === 'premium' ? 'premium' : 'standard';
      if (channel.channel_id) tiers.byId.set(channel.channel_id, tier);
      // Strip the parenthetical suffix first: "ChessExplained (Christof
      // Sielecki)" must not require the real name to appear in the title.
      const name = normalizeChannelName(channel.name.replace(/\s*\(.*\)\s*$/, ''));
      if (name) tiers.byName.push({ name, tier });
    }
  } catch (error) {
    // No config — every channel resolves to unknown
  }
  return tiers;
}

/**
 * @returns {'premium'|'standard'|null}
 */
function resolveTier(tiers, { channelId, channelTitle } = {}) {
  if (channelId && tiers.byId.has(channelId)) return tiers.byId.get(channelId);

  const normalized = normalizeChannelName(channelTitle);
  if (!normalized) return null;

  const match = tiers.byName.find(({ name }) => normalized.includes(name));
  return match ? match.tier : null;
}

module.exports = { loadChannelTiers, resolveTier, normalizeChannelName, CHANNELS_CONFIG_PATH };
