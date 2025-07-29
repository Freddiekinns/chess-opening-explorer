/**
 * Test Suite: Pre-Filter Video Candidates
 * Phase 1 of Pipeline Overhaul - Quality Issues Fix
 * 
 * This service eliminates 80% of videos before expensive API calls
 * using title-based filtering and quality gates.
 */

const PreFilterVideos = require('../../tools/video-pipeline/2-prefilter-candidates');

describe('PreFilterVideos', () => {
  let preFilter;

  beforeEach(() => {
    preFilter = new PreFilterVideos();
  });

  describe('preFilterVideo', () => {
    const baseVideo = {
      id: 'test123',
      title: 'Sicilian Defense Complete Guide',
      publishedAt: '2024-01-15T10:30:00+00:00',
      channelTitle: 'Saint Louis Chess Club',
      channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
      qualityTier: 'premium'
    };

    describe('title-based exclusions', () => {
      it('should exclude tournament livestreams', () => {
        const tournamentVideo = { ...baseVideo, title: 'LIVE: World Championship Game 6' };
        expect(preFilter.preFilterVideo(tournamentVideo)).toBe(false);
      });

      it('should exclude sports content', () => {
        const sportsVideo = { ...baseVideo, title: 'NFL Draft Analysis' };
        expect(preFilter.preFilterVideo(sportsVideo)).toBe(false);
      });

      it('should exclude non-chess content', () => {
        const nonChessVideo = { ...baseVideo, title: 'Cooking Tutorial' };
        expect(preFilter.preFilterVideo(nonChessVideo)).toBe(false);
      });

      it('should exclude streams and podcasts', () => {
        const streamVideo = { ...baseVideo, title: 'Stream Highlights - Blitz Session' };
        expect(preFilter.preFilterVideo(streamVideo)).toBe(false);

        const podcastVideo = { ...baseVideo, title: 'Chess Podcast Episode 15' };
        expect(preFilter.preFilterVideo(podcastVideo)).toBe(false);
      });

      it('should exclude reaction and commentary videos', () => {
        const reactionVideo = { ...baseVideo, title: 'Reacting to Magnus vs Hikaru' };
        expect(preFilter.preFilterVideo(reactionVideo)).toBe(false);
      });

      it('should accept educational chess content', () => {
        const educationalVideo = { ...baseVideo, title: 'Sicilian Defense: Complete Guide' };
        expect(preFilter.preFilterVideo(educationalVideo)).toBe(true);
      });

      it('should accept opening-specific content', () => {
        const openingVideo = { ...baseVideo, title: 'French Defense Masterclass' };
        expect(preFilter.preFilterVideo(openingVideo)).toBe(true);
      });

      it('should accept tactical lessons', () => {
        const tacticalVideo = { ...baseVideo, title: 'Endgame Patterns Every Player Should Know' };
        expect(preFilter.preFilterVideo(tacticalVideo)).toBe(true);
      });
    });

    describe('quality gates', () => {
      it('should check minimum duration', () => {
        const shortVideo = { 
          ...baseVideo, 
          duration: 'PT2M30S', // 2.5 minutes
          title: 'Quick Chess Tip'
        };
        expect(preFilter.preFilterVideo(shortVideo)).toBe(false);
      });

      it('should accept videos above minimum duration', () => {
        const longVideo = { 
          ...baseVideo, 
          duration: 'PT15M30S', // 15.5 minutes
          title: 'In-depth Opening Analysis'
        };
        expect(preFilter.preFilterVideo(longVideo)).toBe(true);
      });

      it('should handle missing duration gracefully', () => {
        const videoWithoutDuration = { ...baseVideo };
        delete videoWithoutDuration.duration;
        expect(preFilter.preFilterVideo(videoWithoutDuration)).toBe(true);
      });

      it('should apply different standards for premium channels', () => {
        const premiumVideo = { 
          ...baseVideo, 
          qualityTier: 'premium',
          title: 'Short but Sweet Opening Tip',
          duration: 'PT4M00S' // 4 minutes
        };
        expect(preFilter.preFilterVideo(premiumVideo)).toBe(true);

        const standardVideo = { 
          ...baseVideo, 
          qualityTier: 'standard',
          title: 'Short Opening Tip',
          duration: 'PT4M00S' // 4 minutes
        };
        expect(preFilter.preFilterVideo(standardVideo)).toBe(false);
      });
    });

    describe('channel-specific rules', () => {
      it('should apply stricter filters to standard tier channels', () => {
        const casualVideo = { 
          ...baseVideo, 
          qualityTier: 'standard',
          title: 'Casual Blitz Game'
        };
        expect(preFilter.preFilterVideo(casualVideo)).toBe(false);
      });

      it('should be more lenient with premium channels', () => {
        const analysisVideo = { 
          ...baseVideo, 
          qualityTier: 'premium',
          title: 'Game Analysis: Kasparov vs Karpov'
        };
        expect(preFilter.preFilterVideo(analysisVideo)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle missing title gracefully', () => {
        const videoWithoutTitle = { ...baseVideo };
        delete videoWithoutTitle.title;
        expect(preFilter.preFilterVideo(videoWithoutTitle)).toBe(false);
      });

      it('should handle empty title gracefully', () => {
        const emptyTitleVideo = { ...baseVideo, title: '' };
        expect(preFilter.preFilterVideo(emptyTitleVideo)).toBe(false);
      });

      it('should handle null video gracefully', () => {
        expect(preFilter.preFilterVideo(null)).toBe(false);
      });
    });
  });

  describe('filterCandidates', () => {
    const sampleVideos = [
      {
        id: 'vid1',
        title: 'Sicilian Defense Complete Guide',
        channelTitle: 'Saint Louis Chess Club',
        qualityTier: 'premium'
      },
      {
        id: 'vid2',
        title: 'LIVE: Tournament Stream',
        channelTitle: 'Chess.com',
        qualityTier: 'standard'
      },
      {
        id: 'vid3',
        title: 'French Defense Masterclass',
        channelTitle: 'Hanging Pawns',
        qualityTier: 'standard'
      },
      {
        id: 'vid4',
        title: 'NFL Draft Analysis',
        channelTitle: 'Sports Channel',
        qualityTier: 'standard'
      }
    ];

    it('should filter out rejected videos and return statistics', () => {
      const result = preFilter.filterCandidates(sampleVideos);
      
      expect(result).toEqual({
        candidates: [
          expect.objectContaining({ id: 'vid1', title: 'Sicilian Defense Complete Guide' }),
          expect.objectContaining({ id: 'vid3', title: 'French Defense Masterclass' })
        ],
        totalInput: 4,
        totalCandidates: 2,
        rejectedCount: 2,
        reductionPercentage: 50
      });
    });

    it('should handle empty input', () => {
      const result = preFilter.filterCandidates([]);
      
      expect(result).toEqual({
        candidates: [],
        totalInput: 0,
        totalCandidates: 0,
        rejectedCount: 0,
        reductionPercentage: 0
      });
    });

    it('should handle all videos being rejected', () => {
      const badVideos = [
        { id: 'bad1', title: 'NFL Game Highlights', qualityTier: 'standard' },
        { id: 'bad2', title: 'LIVE Stream', qualityTier: 'standard' }
      ];
      
      const result = preFilter.filterCandidates(badVideos);
      
      expect(result.candidates).toHaveLength(0);
      expect(result.reductionPercentage).toBe(100);
    });
  });

  describe('performance requirements', () => {
    it('should filter 1000 videos in under 100ms', () => {
      const manyVideos = Array.from({ length: 1000 }, (_, i) => ({
        id: `vid${i}`,
        title: i % 2 === 0 ? 'Chess Opening Guide' : 'LIVE Stream',
        qualityTier: 'standard'
      }));

      const startTime = Date.now();
      const result = preFilter.filterCandidates(manyVideos);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.candidates).toHaveLength(500); // Half should pass
    });
  });

  describe('reduction targets', () => {
    it('should achieve target 80% reduction on realistic dataset', () => {
      // Simulate realistic mix: 20% educational, 30% tournaments/streams, 50% non-chess
      const realisticVideos = [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `edu${i}`,
          title: 'Chess Opening Analysis',
          qualityTier: 'premium'
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `live${i}`,
          title: 'LIVE Tournament Stream',
          qualityTier: 'standard'
        })),
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `other${i}`,
          title: 'NFL Sports News',
          qualityTier: 'standard'
        }))
      ];

      const result = preFilter.filterCandidates(realisticVideos);
      
      expect(result.reductionPercentage).toBeGreaterThanOrEqual(70); // Allow some variance
      expect(result.candidates.length).toBeLessThanOrEqual(30); // Should keep ~20% or less
    });
  });
});
