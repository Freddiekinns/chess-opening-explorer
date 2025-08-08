/**
 * Openings Routes Basic Tests
 * 
 * Comprehensive test coverage for openings routes to reach 70%+ coverage
 * Focus on API endpoints, parameter validation, and error handling
 */

const request = require('supertest');
const express = require('express');

// Mock services
const mockECOService = {
  getAllOpenings: jest.fn(),
  getOpeningsByECO: jest.fn(),
  getRandomOpening: jest.fn(),
  searchOpenings: jest.fn()
};

const mockSearchService = {
  search: jest.fn(),
  initialize: jest.fn()
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

// Import the routes after mocking
const openingsRouter = require('../../packages/api/src/routes/openings.routes');

describe('Openings Routes Basic Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/openings', openingsRouter);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockECOService.getAllOpenings.mockReturnValue([
      { eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5' },
      { eco: 'C00', name: 'French Defense', moves: '1. e4 e6' }
    ]);

    mockECOService.getOpeningsByECO.mockReturnValue({
      eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5'
    });

    mockECOService.getRandomOpening.mockReturnValue({
      eco: 'D20', name: "Queen's Gambit", moves: '1. d4 d5 2. c4'
    });

    mockECOService.searchOpenings.mockReturnValue([
      { eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5' }
    ]);

    mockSearchService.search.mockResolvedValue({
      results: [{ eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5' }],
      totalResults: 1,
      hasMore: false
    });

    mockVideoAccessService.getVideosForOpening.mockReturnValue([]);
  });

  describe('GET /api/openings', () => {
    it('should return all openings', async () => {
      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('eco');
      expect(response.body[0]).toHaveProperty('name');
      expect(mockECOService.getAllOpenings).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockECOService.getAllOpenings.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return empty array when no openings exist', async () => {
      mockECOService.getAllOpenings.mockReturnValue([]);

      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/openings/random', () => {
    it('should return a random opening', async () => {
      const response = await request(app)
        .get('/api/openings/random')
        .expect(200);

      expect(response.body).toHaveProperty('eco');
      expect(response.body).toHaveProperty('name');
      expect(response.body.name).toBe("Queen's Gambit");
      expect(mockECOService.getRandomOpening).toHaveBeenCalled();
    });

    it('should handle when no openings are available', async () => {
      mockECOService.getRandomOpening.mockReturnValue(null);

      const response = await request(app)
        .get('/api/openings/random')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No openings available');
    });

    it('should handle service errors', async () => {
      mockECOService.getRandomOpening.mockImplementation(() => {
        throw new Error('Random selection failed');
      });

      const response = await request(app)
        .get('/api/openings/random')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/openings/search', () => {
    it('should search openings with query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=Sicilian')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('totalResults');
      expect(response.body).toHaveProperty('hasMore');
      expect(mockSearchService.search).toHaveBeenCalledWith('Sicilian', expect.any(Object));
    });

    it('should handle empty query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(mockSearchService.search).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('should handle missing query parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(mockSearchService.search).toHaveBeenCalled();
    });

    it('should handle search service errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/openings/search?q=test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle limit parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=test&limit=5')
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('test', 
        expect.objectContaining({ limit: 5 }));
    });

    it('should handle offset parameter', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=test&offset=10')
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('test', 
        expect.objectContaining({ offset: 10 }));
    });
  });

  describe('GET /api/openings/:eco', () => {
    it('should return opening by ECO code', async () => {
      const response = await request(app)
        .get('/api/openings/B20')
        .expect(200);

      expect(response.body).toHaveProperty('eco', 'B20');
      expect(response.body).toHaveProperty('name', 'Sicilian Defense');
      expect(mockECOService.getOpeningsByECO).toHaveBeenCalledWith('B20');
    });

    it('should return 404 for non-existent ECO code', async () => {
      mockECOService.getOpeningsByECO.mockReturnValue(null);

      const response = await request(app)
        .get('/api/openings/Z99')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Opening not found');
    });

    it('should handle invalid ECO code format', async () => {
      const response = await request(app)
        .get('/api/openings/invalid-eco')
        .expect(200); // Will still try to lookup, service decides validity

      expect(mockECOService.getOpeningsByECO).toHaveBeenCalledWith('invalid-eco');
    });

    it('should handle service errors for ECO lookup', async () => {
      mockECOService.getOpeningsByECO.mockImplementation(() => {
        throw new Error('ECO lookup failed');
      });

      const response = await request(app)
        .get('/api/openings/B20')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/openings/bulk-search', () => {
    it('should handle bulk search requests', async () => {
      const response = await request(app)
        .post('/api/openings/bulk-search')
        .send({ queries: ['Sicilian', 'French'] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should validate bulk search payload', async () => {
      const response = await request(app)
        .post('/api/openings/bulk-search')
        .send({}) // Missing queries
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty queries array', async () => {
      const response = await request(app)
        .post('/api/openings/bulk-search')
        .send({ queries: [] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(0);
    });
  });

  describe('Error handling and security', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/openings/bulk-search')
        .send('invalid json')
        .expect(400);
    });

    it('should handle very long query strings', async () => {
      const longQuery = 'a'.repeat(10000);
      
      const response = await request(app)
        .get(`/api/openings/search?q=${longQuery}`)
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalled();
    });

    it('should handle special characters in ECO parameter', async () => {
      const response = await request(app)
        .get('/api/openings/@#$%')
        .expect(200); // Will attempt lookup

      expect(mockECOService.getOpeningsByECO).toHaveBeenCalledWith('@#$%');
    });

    it('should handle SQL injection attempts in search', async () => {
      const maliciousQuery = "'; DROP TABLE openings; --";
      
      const response = await request(app)
        .get(`/api/openings/search?q=${encodeURIComponent(maliciousQuery)}`)
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith(maliciousQuery, expect.any(Object));
    });

    it('should handle concurrent requests', async () => {
      const requests = [
        request(app).get('/api/openings'),
        request(app).get('/api/openings/random'),
        request(app).get('/api/openings/search?q=test'),
        request(app).get('/api/openings/B20')
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(4);
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response format for search', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=test')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('totalResults');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should return proper error format', async () => {
      mockECOService.getAllOpenings.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/api/openings')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should set appropriate content-type headers', async () => {
      const response = await request(app)
        .get('/api/openings')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
