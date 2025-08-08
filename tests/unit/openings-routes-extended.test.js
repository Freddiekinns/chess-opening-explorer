/**
 * Openings Routes Extended Coverage Tests
 * 
 * Comprehensive tests for openings.routes.js to reach 70%+ coverage
 * Focus on route parameter validation, error handling, and response formats
 */

const request = require('supertest');
const express = require('express');

// Mock all the services
jest.mock('../../packages/api/src/services/eco-service', () => {
  return function() {
    return {
      getAllOpenings: jest.fn(),
      getOpeningsByECO: jest.fn(),
      getRandomOpening: jest.fn(),
      searchOpenings: jest.fn(),
      getPopularOpeningsByECO: jest.fn()
    };
  };
});

jest.mock('../../packages/api/src/services/search-service', () => ({
  initialize: jest.fn(),
  search: jest.fn()
}));

jest.mock('../../packages/api/src/services/video-access-service', () => {
  return function() {
    return {
      getVideosForOpening: jest.fn()
    };
  };
});

describe('Openings Routes Extended Coverage', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    const openingsRouter = require('../../packages/api/src/routes/openings.routes');
    app.use('/api/openings', openingsRouter);
  });

  describe('GET /api/openings', () => {
    it('should return all openings successfully', async () => {
      const mockOpenings = [
        { eco: 'A00', name: 'Test Opening 1', moves: '1. e4' },
        { eco: 'A01', name: 'Test Opening 2', moves: '1. d4' }
      ];

      mockEcoService.getAllOpenings.mockReturnValue(mockOpenings);

      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.body).toEqual(mockOpenings);
      expect(mockEcoService.getAllOpenings).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      mockEcoService.getAllOpenings.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty result set', async () => {
      mockEcoService.getAllOpenings.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/openings/eco/:ecoCode', () => {
    it('should return openings for valid ECO code', async () => {
      const mockOpenings = [
        { eco: 'A00', name: 'Test Opening', moves: '1. e4' }
      ];

      mockEcoService.getOpeningsByECO.mockReturnValue(mockOpenings);

      const response = await request(app)
        .get('/api/openings/eco/A00')
        .expect(200);

      expect(response.body).toEqual(mockOpenings);
      expect(mockEcoService.getOpeningsByECO).toHaveBeenCalledWith('A00');
    });

    it('should validate ECO code format', async () => {
      const response = await request(app)
        .get('/api/openings/eco/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid ECO code format');
    });

    it('should handle case-insensitive ECO codes', async () => {
      const mockOpenings = [
        { eco: 'A00', name: 'Test Opening', moves: '1. e4' }
      ];

      mockEcoService.getOpeningsByECO.mockReturnValue(mockOpenings);

      const response = await request(app)
        .get('/api/openings/eco/a00')
        .expect(200);

      expect(response.body).toEqual(mockOpenings);
      expect(mockEcoService.getOpeningsByECO).toHaveBeenCalledWith('a00');
    });

    it('should return 404 for non-existent ECO code', async () => {
      mockEcoService.getOpeningsByECO.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings/eco/Z99')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No openings found');
    });

    it('should handle service errors', async () => {
      mockEcoService.getOpeningsByECO.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/openings/eco/A00')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/random', () => {
    it('should return a random opening', async () => {
      const mockOpening = { eco: 'A00', name: 'Random Opening', moves: '1. e4' };
      mockEcoService.getRandomOpening.mockReturnValue(mockOpening);

      const response = await request(app)
        .get('/api/openings/random')
        .expect(200);

      expect(response.body).toEqual(mockOpening);
      expect(mockEcoService.getRandomOpening).toHaveBeenCalledTimes(1);
    });

    it('should handle empty database', async () => {
      mockEcoService.getRandomOpening.mockReturnValue(null);

      const response = await request(app)
        .get('/api/openings/random')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No openings available');
    });

    it('should handle service errors', async () => {
      mockEcoService.getRandomOpening.mockImplementation(() => {
        throw new Error('Random selection failed');
      });

      const response = await request(app)
        .get('/api/openings/random')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/search', () => {
    beforeEach(() => {
      mockSearchService.initialize.mockResolvedValue();
    });

    it('should search openings with query parameter', async () => {
      const mockResults = [
        { eco: 'A00', name: 'Sicilian Defense', moves: '1. e4 c5' }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/openings/search?q=Sicilian')
        .expect(200);

      expect(response.body).toEqual(mockResults);
      expect(mockSearchService.search).toHaveBeenCalledWith('Sicilian', expect.any(Object));
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query parameter');
    });

    it('should handle empty query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should apply limit parameter', async () => {
      const mockResults = [
        { eco: 'A00', name: 'Opening 1', moves: '1. e4' },
        { eco: 'A01', name: 'Opening 2', moves: '1. d4' }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/openings/search?q=defense&limit=5')
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('defense', 
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should apply filter parameters', async () => {
      const mockResults = [
        { eco: 'A00', name: 'Test Opening', moves: '1. e4' }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/openings/search?q=test&eco=A00&difficulty=beginner')
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('test', 
        expect.objectContaining({
          filters: expect.objectContaining({
            eco: 'A00',
            difficulty: 'beginner'
          })
        })
      );
    });

    it('should handle search service initialization failure', async () => {
      mockSearchService.initialize.mockRejectedValue(new Error('Init failed'));

      const response = await request(app)
        .get('/api/openings/search?q=test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle search service errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/openings/search?q=test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/popular-by-eco', () => {
    it('should return popular openings by ECO', async () => {
      const mockData = {
        'A': [{ eco: 'A00', name: 'Popular Opening A', moves: '1. e4' }],
        'B': [{ eco: 'B00', name: 'Popular Opening B', moves: '1. d4' }]
      };

      mockEcoService.getPopularOpeningsByECO.mockReturnValue(mockData);

      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);

      expect(response.body).toEqual(mockData);
      expect(mockEcoService.getPopularOpeningsByECO).toHaveBeenCalledTimes(1);
    });

    it('should apply limit parameter', async () => {
      const mockData = { 'A': [] };
      mockEcoService.getPopularOpeningsByECO.mockReturnValue(mockData);

      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=5')
        .expect(200);

      expect(mockEcoService.getPopularOpeningsByECO).toHaveBeenCalledWith(5);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=abc')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid limit parameter');
    });

    it('should enforce maximum limit', async () => {
      const mockData = { 'A': [] };
      mockEcoService.getPopularOpeningsByECO.mockReturnValue(mockData);

      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=1000')
        .expect(200);

      // Should be capped at max limit (e.g., 100)
      expect(mockEcoService.getPopularOpeningsByECO).toHaveBeenCalledWith(100);
    });

    it('should handle service errors', async () => {
      mockEcoService.getPopularOpeningsByECO.mockImplementation(() => {
        throw new Error('Popular openings service failed');
      });

      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/:openingId/videos', () => {
    it('should return videos for opening', async () => {
      const mockVideos = [
        { id: 1, title: 'Sicilian Defense Tutorial', url: 'youtube.com/watch?v=123' },
        { id: 2, title: 'Advanced Sicilian', url: 'youtube.com/watch?v=456' }
      ];

      mockVideoService.getVideosForOpening.mockReturnValue(mockVideos);

      const response = await request(app)
        .get('/api/openings/sicilian-defense/videos')
        .expect(200);

      expect(response.body).toEqual(mockVideos);
      expect(mockVideoService.getVideosForOpening).toHaveBeenCalledWith('sicilian-defense');
    });

    it('should validate opening ID parameter', async () => {
      const response = await request(app)
        .get('/api/openings//videos') // Empty ID
        .expect(404); // Express will return 404 for invalid route
    });

    it('should handle no videos found', async () => {
      mockVideoService.getVideosForOpening.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings/rare-opening/videos')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No videos found');
    });

    it('should handle video service errors', async () => {
      mockVideoService.getVideosForOpening.mockImplementation(() => {
        throw new Error('Video service unavailable');
      });

      const response = await request(app)
        .get('/api/openings/test-opening/videos')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error handling and middleware', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/openings/invalid-endpoint')
        .send('{"invalid": json}')
        .expect(404); // Route not found
    });

    it('should set appropriate content-type headers', async () => {
      mockEcoService.getAllOpenings.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.header['content-type']).toMatch(/application\/json/);
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/openings')
        .expect(404); // No CORS middleware configured in test
    });

    it('should handle large request payloads', async () => {
      const largeQuery = 'a'.repeat(10000);
      
      mockSearchService.initialize.mockResolvedValue();
      mockSearchService.search.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/openings/search?q=${largeQuery}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Response format validation', () => {
    it('should return consistent error format', async () => {
      mockEcoService.getAllOpenings.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
    });

    it('should include timestamp in error responses', async () => {
      mockEcoService.getAllOpenings.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      expect(response.body).toHaveProperty('timestamp');
    });

    it('should sanitize error messages for security', async () => {
      mockEcoService.getAllOpenings.mockImplementation(() => {
        const error = new Error('Database password: secret123');
        error.stack = 'sensitive stack trace';
        throw error;
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      // Should not expose sensitive information
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret123');
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
