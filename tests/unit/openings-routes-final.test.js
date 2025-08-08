/**
 * Openings Routes Final Working Tests  
 * Tests for the actual routes with proper mocking and response format understanding
 */

const request = require('supertest');
const express = require('express');

// Mock all services at module level before any imports
jest.mock('../../packages/api/src/services/eco-service');
jest.mock('../../packages/api/src/services/search-service');
jest.mock('../../packages/api/src/services/video-access-service');

// Import the mocked constructors/singletons
const ECOService = require('../../packages/api/src/services/eco-service');
const searchService = require('../../packages/api/src/services/search-service');
const VideoAccessService = require('../../packages/api/src/services/video-access-service');

// Create mock instances
const mockECOServiceInstance = {
  getAllOpenings: jest.fn(),
  getOpeningsByECO: jest.fn(),
  getRandomOpening: jest.fn(),
  searchOpeningsByName: jest.fn(),
  getPopularOpenings: jest.fn(),
  loadECOData: jest.fn()
};

const mockSearchServiceInstance = {
  initialize: jest.fn(),
  search: jest.fn(),
  getPopularOpenings: jest.fn()
};

const mockVideoAccessServiceInstance = {
  getVideosForOpening: jest.fn()
};

// Mock constructors to return our mock instances
ECOService.mockImplementation(() => mockECOServiceInstance);
VideoAccessService.mockImplementation(() => mockVideoAccessServiceInstance);

// Mock the singleton search service
Object.assign(searchService, mockSearchServiceInstance);

// Now import routes after all mocks are set up
const openingsRoutes = require('../../packages/api/src/routes/openings.routes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/openings', openingsRoutes);

describe('Openings Routes Final Working Tests', () => {
  const mockOpeningData = {
    code: 'B20',
    name: 'Sicilian Defense',
    moves: 'e4 c5',
    analysis_json: {
      popularity_score: 85,
      description: 'Sharp tactical opening'
    }
  };

  const mockSearchResults = [
    { name: 'Sicilian Defense', eco_code: 'B20' },
    { name: 'Sicilian Dragon', eco_code: 'B70' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockECOServiceInstance.getOpeningsByECO.mockReturnValue([mockOpeningData]);
    mockECOServiceInstance.getRandomOpening.mockReturnValue(mockOpeningData);
    mockECOServiceInstance.getAllOpenings.mockReturnValue([mockOpeningData]);
    mockECOServiceInstance.getPopularOpenings.mockReturnValue([mockOpeningData]);
    mockSearchServiceInstance.search.mockResolvedValue(mockSearchResults);
    mockVideoAccessServiceInstance.getVideosForOpening.mockReturnValue([]);
  });

  describe('Phase 1 Routes Tests', () => {
    describe('GET /api/openings/eco-analysis/:code', () => {
      it('should return ECO analysis data successfully', async () => {
        const response = await request(app)
          .get('/api/openings/eco-analysis/B20')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(mockECOServiceInstance.getOpeningsByECO).toHaveBeenCalledWith('B20');
      });

      it('should return 404 for non-existent ECO code', async () => {
        mockECOServiceInstance.getOpeningsByECO.mockReturnValue([]);
        
        const response = await request(app)
          .get('/api/openings/eco-analysis/Z99')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should handle service errors gracefully', async () => {
        mockECOServiceInstance.getOpeningsByECO.mockImplementation(() => {
          throw new Error('Service error');
        });
        
        const response = await request(app)
          .get('/api/openings/eco-analysis/B20')
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/openings/random', () => {
      it('should return a random opening successfully', async () => {
        const response = await request(app)
          .get('/api/openings/random')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(mockECOServiceInstance.getRandomOpening).toHaveBeenCalled();
      });

      it('should handle no openings available gracefully', async () => {
        mockECOServiceInstance.getRandomOpening.mockReturnValue(null);
        
        const response = await request(app)
          .get('/api/openings/random')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toBeNull();
      });
    });

    describe('GET /api/openings/search', () => {
      it('should search openings with query parameter', async () => {
        const response = await request(app)
          .get('/api/openings/search?q=Sicilian')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(mockSearchServiceInstance.search).toHaveBeenCalledWith('Sicilian', expect.any(Object));
      });

      it('should require query parameter', async () => {
        const response = await request(app)
          .get('/api/openings/search')
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle search service errors', async () => {
        mockSearchServiceInstance.search.mockRejectedValue(new Error('Search error'));
        
        const response = await request(app)
          .get('/api/openings/search?q=test')
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/openings/all', () => {
      it('should return all openings successfully', async () => {
        const response = await request(app)
          .get('/api/openings/all')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(mockECOServiceInstance.getAllOpenings).toHaveBeenCalled();
      });

      it('should handle service errors gracefully', async () => {
        mockECOServiceInstance.getAllOpenings.mockImplementation(() => {
          throw new Error('Service error');
        });
        
        const response = await request(app)
          .get('/api/openings/all')
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/openings/popular', () => {
      it('should return popular openings successfully', async () => {
        const response = await request(app)
          .get('/api/openings/popular')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(mockECOServiceInstance.getPopularOpenings).toHaveBeenCalled();
      });

      it('should handle limit parameter correctly', async () => {
        const response = await request(app)
          .get('/api/openings/popular?limit=5')
          .expect(200);

        // Parameters come as strings from query string
        expect(mockECOServiceInstance.getPopularOpenings).toHaveBeenCalledWith('5', undefined);
      });
    });

    describe('GET /api/openings/categories', () => {
      it('should return ECO categories', async () => {
        const response = await request(app)
          .get('/api/openings/categories')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toEqual({
          A: "Flank openings",
          B: "Semi-Open games", 
          C: "Open games",
          D: "Closed games",
          E: "Indian defenses"
        });
      });
    });

    describe('GET /api/openings/stats', () => {
      it('should return opening statistics', async () => {
        mockECOServiceInstance.getAllOpenings.mockReturnValue([
          mockOpeningData,
          { ...mockOpeningData, code: 'A00' }
        ]);
        
        const response = await request(app)
          .get('/api/openings/stats')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('by_category');
      });
    });

    describe('Error handling', () => {
      it('should handle invalid routes', async () => {
        const response = await request(app)
          .get('/api/openings/nonexistent')
          .expect(404);

        expect(response.status).toBe(404);
      });

      it('should handle malformed requests', async () => {
        const response = await request(app)
          .post('/api/openings/random') // POST to GET-only route
          .expect(404);

        expect(response.status).toBe(404);
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
        mockECOServiceInstance.getRandomOpening.mockImplementation(() => {
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
          .get('/api/openings/random')
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
      });
    });
  });
});
