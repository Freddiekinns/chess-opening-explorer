/**
 * Full-Catalogue YouTube API Discovery
 *
 * Discovers ALL videos from configured channels via YouTube Data API.
 * Used by the "full" pipeline mode for historical catalogue rebuilds.
 *
 * Key design: converts channel ID (UC...) to uploads playlist (UU...)
 * to avoid an extra channels.list API call per channel.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const DEFAULT_CONFIG = {
  configPath: path.join(process.cwd(), 'config', 'youtube_channels.json'),
  requestDelay: 200,
  maxResults: 50,
};

class ChannelDiscovery {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  /**
   * Convert channel ID (UC...) to uploads playlist ID (UU...)
   */
  channelToPlaylistId(channelId) {
    if (channelId.startsWith('UC')) {
      return 'UU' + channelId.slice(2);
    }
    return channelId;
  }

  /**
   * Load trusted channels configuration
   */
  async loadChannelsConfig() {
    const data = await fs.readFile(this.config.configPath, 'utf8');
    const config = JSON.parse(data);
    return config.trusted_channels || [];
  }

  /**
   * Fetch all videos from a single channel's uploads playlist
   */
  async fetchChannelVideos(channelId, qualityTier) {
    const playlistId = this.channelToPlaylistId(channelId);
    const videos = [];
    let nextPageToken = null;

    do {
      const params = {
        part: 'snippet',
        playlistId,
        maxResults: this.config.maxResults,
        key: this.apiKey,
      };
      if (nextPageToken) {
        params.pageToken = nextPageToken;
      }

      const response = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
        params,
      });

      const items = response.data.items || [];
      for (const item of items) {
        const snippet = item.snippet;
        if (!snippet || !snippet.resourceId?.videoId) continue;

        videos.push({
          id: snippet.resourceId.videoId,
          title: snippet.title,
          publishedAt: snippet.publishedAt,
          channelTitle: snippet.channelTitle || '',
          channelId,
          qualityTier: qualityTier || 'standard',
        });
      }

      nextPageToken = response.data.nextPageToken || null;

      if (nextPageToken && this.config.requestDelay > 0) {
        await new Promise((r) => setTimeout(r, this.config.requestDelay));
      }
    } while (nextPageToken);

    return videos;
  }

  /**
   * Discover all videos from all configured channels
   */
  async discoverAllVideos(channels) {
    if (!channels) {
      channels = await this.loadChannelsConfig();
    }

    const result = {
      videos: [],
      totalVideos: 0,
      channelsCovered: 0,
      errors: [],
    };

    for (const channel of channels) {
      try {
        console.log(`   Fetching all videos from ${channel.name}...`);
        const videos = await this.fetchChannelVideos(channel.channel_id, channel.quality_tier);
        result.videos.push(...videos);
        result.totalVideos += videos.length;
        result.channelsCovered++;
        console.log(`   ✅ ${channel.name}: ${videos.length} videos`);
      } catch (error) {
        result.errors.push({
          channelId: channel.channel_id,
          channelName: channel.name,
          error: error.message,
        });
        console.error(`   ❌ ${channel.name}: ${error.message}`);
      }
    }

    return result;
  }
}

module.exports = ChannelDiscovery;
