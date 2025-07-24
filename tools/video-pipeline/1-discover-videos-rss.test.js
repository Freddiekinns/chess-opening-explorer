/**
 * Test Suite: RSS-Based Video Discovery
 * Phase 1 of Pipeline Overhaul - Quality Issues Fix
 * 
 * This replaces the existing Channel-First architecture with RSS-based discovery
 * for 10x faster video discovery and 88% API quota reduction.
 */

const RSSVideoDiscovery = require('../../tools/video-pipeline/1-discover-videos-rss');
const fs = require('fs').promises;
const path = require('path');

// Mock external dependencies following AD-002
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

jest.mock('https', () => ({
  get: jest.fn()
}));

describe('RSSVideoDiscovery', () => {
  let discovery;
  const mockChannelsConfig = {
    trusted_channels: [
      {
        name: "Saint Louis Chess Club",
        channel_id: "UCM-ONC2bCHytG2mYtKDmIeA",
        quality_tier: "premium",
        rss_url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCM-ONC2bCHytG2mYtKDmIeA"
      },
      {
        name: "Hanging Pawns",
        channel_id: "UCkJdvwRC-oGPhRHW_XPNokg",
        quality_tier: "standard",
        rss_url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCkJdvwRC-oGPhRHW_XPNokg"
      }
    ]
  };

  const mockRSSResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <title>Queen's Gambit: Complete Guide</title>
    <published>2024-01-15T10:30:00+00:00</published>
    <author><name>Saint Louis Chess Club</name></author>
  </entry>
  <entry>
    <yt:videoId>abc123def45</yt:videoId>
    <title>French Defense Masterclass</title>
    <published>2024-01-14T15:20:00+00:00</published>
    <author><name>Saint Louis Chess Club</name></author>
  </entry>
</feed>`;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock channel config loading
    fs.readFile.mockResolvedValue(JSON.stringify(mockChannelsConfig));
    
    discovery = new RSSVideoDiscovery();
  });

  describe('loadChannelsConfig', () => {
    it('should load trusted channels configuration', async () => {
      const channels = await discovery.loadChannelsConfig();
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/youtube_channels.json'),
        'utf8'
      );
      expect(channels).toEqual(mockChannelsConfig.trusted_channels);
    });

    it('should handle missing config file gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      const channels = await discovery.loadChannelsConfig();
      
      expect(channels).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      
      const channels = await discovery.loadChannelsConfig();
      
      expect(channels).toEqual([]);
    });
  });

  describe('fetchRSSFeed', () => {
    const https = require('https');
    
    beforeEach(() => {
      // Mock https.get for RSS feed fetching
      https.get.mockImplementation((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from(mockRSSResponse));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(mockResponse);
        return { on: jest.fn() };
      });
    });

    it('should fetch RSS feed from channel URL', async () => {
      const channelId = 'UCM-ONC2bCHytG2mYtKDmIeA';
      const result = await discovery.fetchRSSFeed(channelId);
      
      expect(https.get).toHaveBeenCalledWith(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
        expect.any(Function)
      );
      
      expect(result).toEqual({
        channelId,
        videos: [
          {
            id: 'dQw4w9WgXcQ',
            title: 'Queen\'s Gambit: Complete Guide',
            publishedAt: '2024-01-15T10:30:00+00:00',
            channelTitle: 'Saint Louis Chess Club'
          },
          {
            id: 'abc123def45',
            title: 'French Defense Masterclass',
            publishedAt: '2024-01-14T15:20:00+00:00',
            channelTitle: 'Saint Louis Chess Club'
          }
        ],
        lastUpdated: expect.any(String)
      });
    });

    it('should handle RSS feed errors gracefully', async () => {
      https.get.mockImplementation((url, callback) => {
        const mockResponse = {
          statusCode: 404,
          on: jest.fn()
        };
        callback(mockResponse);
        return { on: jest.fn() };
      });
      
      const result = await discovery.fetchRSSFeed('invalid_channel');
      
      expect(result).toEqual({
        channelId: 'invalid_channel',
        videos: [],
        lastUpdated: expect.any(String),
        error: 'HTTP 404'
      });
    });

    it('should handle malformed RSS XML gracefully', async () => {
      https.get.mockImplementation((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('invalid xml'));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(mockResponse);
        return { on: jest.fn() };
      });
      
      const result = await discovery.fetchRSSFeed('test_channel');
      
      expect(result.videos).toEqual([]);
      expect(result.error).toMatch(/parsing/i);
    });
  });

  describe('discoverNewVideos', () => {
    beforeEach(() => {
      // Mock RSS feed fetching
      discovery.fetchRSSFeed = jest.fn()
        .mockResolvedValueOnce({
          channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
          videos: [
            {
              id: 'video1',
              title: 'Sicilian Defense Guide',
              publishedAt: '2024-01-15T10:30:00+00:00',
              channelTitle: 'Saint Louis Chess Club'
            }
          ]
        })
        .mockResolvedValueOnce({
          channelId: 'UCkJdvwRC-oGPhRHW_XPNokg',
          videos: [
            {
              id: 'video2',
              title: 'Endgame Patterns',
              publishedAt: '2024-01-14T15:20:00+00:00',
              channelTitle: 'Hanging Pawns'
            }
          ]
        });
    });

    it('should discover videos from all trusted channels', async () => {
      const options = { publishedAfter: '2024-01-01T00:00:00Z' };
      const result = await discovery.discoverNewVideos(options);
      
      expect(discovery.fetchRSSFeed).toHaveBeenCalledTimes(2);
      expect(discovery.fetchRSSFeed).toHaveBeenCalledWith('UCM-ONC2bCHytG2mYtKDmIeA');
      expect(discovery.fetchRSSFeed).toHaveBeenCalledWith('UCkJdvwRC-oGPhRHW_XPNokg');
      
      expect(result).toEqual({
        totalVideos: 2,
        channelsCovered: 2,
        videos: [
          {
            id: 'video1',
            title: 'Sicilian Defense Guide',
            publishedAt: '2024-01-15T10:30:00+00:00',
            channelTitle: 'Saint Louis Chess Club',
            channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
            qualityTier: 'premium'
          },
          {
            id: 'video2',
            title: 'Endgame Patterns',
            publishedAt: '2024-01-14T15:20:00+00:00',
            channelTitle: 'Hanging Pawns',
            channelId: 'UCkJdvwRC-oGPhRHW_XPNokg',
            qualityTier: 'standard'
          }
        ],
        errors: []
      });
    });

    it('should filter videos by publication date when specified', async () => {
      // Mock older video that should be filtered out
      discovery.fetchRSSFeed = jest.fn().mockResolvedValue({
        channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
        videos: [
          {
            id: 'old_video',
            title: 'Old Chess Video',
            publishedAt: '2023-01-01T10:30:00+00:00',
            channelTitle: 'Saint Louis Chess Club'
          },
          {
            id: 'new_video',
            title: 'New Chess Video',
            publishedAt: '2024-06-01T10:30:00+00:00',
            channelTitle: 'Saint Louis Chess Club'
          }
        ]
      });
      
      const options = { publishedAfter: '2024-01-01T00:00:00Z' };
      const result = await discovery.discoverNewVideos(options);
      
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe('new_video');
    });

    it('should handle channel errors gracefully', async () => {
      discovery.fetchRSSFeed = jest.fn()
        .mockResolvedValueOnce({
          channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
          videos: [],
          error: 'HTTP 404'
        })
        .mockResolvedValueOnce({
          channelId: 'UCkJdvwRC-oGPhRHW_XPNokg',
          videos: [
            {
              id: 'video2',
              title: 'Working Video',
              publishedAt: '2024-01-14T15:20:00+00:00',
              channelTitle: 'Hanging Pawns'
            }
          ]
        });
      
      const result = await discovery.discoverNewVideos();
      
      expect(result.totalVideos).toBe(1);
      expect(result.channelsCovered).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
        error: 'HTTP 404'
      });
    });
  });

  describe('performance requirements', () => {
    it('should complete RSS discovery in under 5 seconds', async () => {
      const startTime = Date.now();
      
      // Mock fast RSS responses
      discovery.fetchRSSFeed = jest.fn().mockResolvedValue({
        channelId: 'test',
        videos: [],
        lastUpdated: new Date().toISOString()
      });
      
      await discovery.discoverNewVideos();
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('environment detection', () => {
    it('should skip delays in test environment', async () => {
      expect(process.env.NODE_ENV).toBe('test');
      
      // Mock to verify no artificial delays are added
      const spy = jest.spyOn(global, 'setTimeout');
      
      discovery.fetchRSSFeed = jest.fn().mockResolvedValue({
        channelId: 'test',
        videos: []
      });
      
      await discovery.discoverNewVideos();
      
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
