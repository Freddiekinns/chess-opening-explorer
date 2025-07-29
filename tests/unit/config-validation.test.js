const path = require('path');
const fs = require('fs');

describe('YouTube Configuration Validation', () => {
  let youtubeChannelConfig;
  let videoQualityConfig;

  beforeAll(() => {
    // Load YouTube channel configuration
    const channelConfigPath = path.join(__dirname, '../../config/youtube_channels.json');
    const qualityConfigPath = path.join(__dirname, '../../config/video_quality_filters.json');
    
    if (fs.existsSync(channelConfigPath)) {
      youtubeChannelConfig = JSON.parse(fs.readFileSync(channelConfigPath, 'utf8'));
    }
    
    if (fs.existsSync(qualityConfigPath)) {
      videoQualityConfig = JSON.parse(fs.readFileSync(qualityConfigPath, 'utf8'));
    }
  });

  describe('YouTube Channel Configuration', () => {
    it('should validate channel configuration structure', () => {
      expect(youtubeChannelConfig).toBeDefined();
      expect(youtubeChannelConfig.trusted_channels).toBeDefined();
      expect(Array.isArray(youtubeChannelConfig.trusted_channels)).toBe(true);
      expect(youtubeChannelConfig.trusted_channels.length).toBeGreaterThan(0);
      
      // Validate first channel structure
      const firstChannel = youtubeChannelConfig.trusted_channels[0];
      expect(firstChannel).toMatchObject({
        channel_id: expect.any(String),
        name: expect.any(String),
        priority: expect.any(Number),
        boost_factor: expect.any(Number),
        specialties: expect.any(Array)
      });
    });

    it('should validate search parameters', () => {
      expect(youtubeChannelConfig.search_parameters).toBeDefined();
      expect(youtubeChannelConfig.search_parameters).toMatchObject({
        max_results_per_opening: expect.any(Number),
        min_duration_seconds: expect.any(Number),
        max_duration_seconds: expect.any(Number),
        min_view_count: expect.any(Number),
        max_age_years: expect.any(Number)
      });
    });
  });

  describe('Video Quality Configuration', () => {
    it('should validate quality filters structure', () => {
      expect(videoQualityConfig).toBeDefined();
      expect(videoQualityConfig.quality_thresholds).toBeDefined();
      expect(videoQualityConfig.relevance_factors).toBeDefined();
    });

    it('should have valid quality thresholds', () => {
      const thresholds = videoQualityConfig.quality_thresholds;
      expect(thresholds.min_relevance_score).toBeGreaterThan(0);
      expect(thresholds.min_relevance_score).toBeLessThanOrEqual(1);
      expect(thresholds.trusted_channel_boost).toBeGreaterThan(1);
    });
  });
});
