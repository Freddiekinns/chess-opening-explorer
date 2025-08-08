/**
 * Openings Routes Simple Tests
 * 
 * Basic test coverage for openings routes with proper mocking
 * Focus on routes that actually exist in the service
 */

const request = require('supertest');
const express = require('express');

// Mock services first
const mockECOService = {
  getECOAnalysis: jest.fn(),
  getOpeningsByECO: jest.fn(),
  getRandomOpening: jest.fn(),
  getAllOpenings: jest.fn(),
  getPopularOpenings: jest.fn(),
  getPopularOpeningsByECO: jest.fn(),
  getECOCategories: jest.fn(),
  getStatistics: jest.fn(),
  getOpeningsByClassification: jest.fn(),
  getOpeningByFEN: jest.fn(),
  getOpeningsByFamily: jest.fn()
};

const mockSearchService = {
  initialize: jest.fn(),
  search: jest.fn()
};

const mockVideoAccessService = {
  getVideosForOpening: jest.fn()
};

// Mock the service modules
jest.mock('../../packages/api/src/services/eco-service', () => {
  return jest.fn().mockImplementation(() => mockECOService);
});

jest.mock('../../packages/api/src/services/search-service', () => mockSearchService);

jest.mock('../../packages/api/src/services/video-access-service', () => {
  return jest.fn().mockImplementation(() => mockVideoAccessService);
});

// Mock the path resolver
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/path')
}));

// Import the routes after mocking
const openingsRouter = require('../../packages/api/src/routes/openings.routes');

describe('Openings Routes Simple Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/openings', openingsRouter);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockECOService.getECOAnalysis.mockReturnValue({
      eco: 'B20',
      name: 'Sicilian Defense',
      description: 'Aggressive opening'
    });

    mockECOService.getRandomOpening.mockReturnValue({
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq',
      eco: 'B20',
      name: 'Sicilian Defense'
    });

    mockECOService.getAllOpenings.mockReturnValue([
      { eco: 'B20', name: 'Sicilian Defense' },
      { eco: 'C00', name: 'French Defense' }
    ]);

    mockSearchService.search.mockResolvedValue({
      results: [{ eco: 'B20', name: 'Sicilian Defense' }],
      totalResults: 1,
      hasMore: false
    });
  });

  describe('GET /api/openings/eco-analysis/:code', () => {
    it('should return ECO analysis data', async () => {
      const response = await request(app)
        .get('/api/openings/eco-analysis/B20')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getECOAnalysis).toHaveBeenCalledWith('B20');
    });

    it('should return 404 for non-existent ECO code', async () => {
      mockECOService.getECOAnalysis.mockReturnValue(null);

      const response = await request(app)
        .get('/api/openings/eco-analysis/Z99')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors', async () => {
      mockECOService.getECOAnalysis.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/openings/eco-analysis/B20')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/random', () => {
    it('should return a random opening', async () => {
      const response = await request(app)
        .get('/api/openings/random')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getRandomOpening).toHaveBeenCalled();
    });

    it('should handle when no openings are available', async () => {
      mockECOService.getRandomOpening.mockReturnValue(null);

      const response = await request(app)
        .get('/api/openings/random')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/openings/search', () => {
    it('should search openings with query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=Sicilian')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockSearchService.search).toHaveBeenCalledWith('Sicilian', expect.any(Object));
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle search service errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/openings/search?q=test')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/openings/all', () => {
    it('should return all openings', async () => {
      const response = await request(app)
        .get('/api/openings/all')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getAllOpenings).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockECOService.getAllOpenings.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/openings/all')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/openings/popular', () => {
    it('should return popular openings', async () => {
      mockECOService.getPopularOpenings.mockReturnValue([
        { eco: 'B20', name: 'Sicilian Defense', popularity: 95 }
      ]);

      const response = await request(app)
        .get('/api/openings/popular')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getPopularOpenings).toHaveBeenCalled();
    });

    it('should handle limit parameter', async () => {
      mockECOService.getPopularOpenings.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings/popular?limit=5')
        .expect(200);

      expect(mockECOService.getPopularOpenings).toHaveBeenCalledWith(5, null);
    });
  });

  describe('GET /api/openings/categories', () => {
    it('should return ECO categories', async () => {
      mockECOService.getECOCategories.mockReturnValue(['A', 'B', 'C', 'D', 'E']);

      const response = await request(app)
        .get('/api/openings/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getECOCategories).toHaveBeenCalled();
    });
  });

  describe('GET /api/openings/stats', () => {
    it('should return opening statistics', async () => {
      mockECOService.getStatistics.mockReturnValue({
        totalOpenings: 100,
        categories: 5
      });

      const response = await request(app)
        .get('/api/openings/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockECOService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid routes', async () => {
      await request(app)
        .get('/api/openings/nonexistent')
        .expect(404);
    });

    it('should handle malformed requests', async () => {
      await request(app)
        .post('/api/openings/search')
        .send('invalid json')
        .expect(404); // Route doesn't exist for POST
    });
  });

  describe('Response format validation', () => {
    it('should return consistent success format', async () => {
      const response = await request(app)
        .get('/api/openings/random')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return consistent error format', async () => {
      mockECOService.getRandomOpening.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/api/openings/random')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should set appropriate content-type headers', async () => {
      const response = await request(app)
        .get('/api/openings/categories')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
