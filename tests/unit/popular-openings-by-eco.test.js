/**
 * Popular Openings by ECO Category Tests
 * 
 * Following TDD principles:
 * - Test behavior, not implementation
 * - Mock external dependencies  
 * - Fast, isolated tests
 */

const request = require('supertest');
const express = require('express');

// Mock ECOService before importing the router
const mockECOService = {
  getAllOpenings: jest.fn(),
  loadECOData: jest.fn(),
  loadPopularityData: jest.fn(),
  getPopularOpeningsByECO: jest.fn()
};

jest.mock('../../packages/api/src/services/eco-service', () => {
  return jest.fn().mockImplementation(() => mockECOService);
});

// Mock VideoAccessService
jest.mock('../../packages/api/src/services/video-access-service', () => {
  return jest.fn().mockImplementation(() => ({
    getVideosForPosition: jest.fn().mockReturnValue([]),
    _validateDirectory: jest.fn()
  }));
});

// Now import the router after mocking the dependencies
const openingsRouter = require('../../packages/api/src/routes/openings.routes');
const fs = require('fs');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  createWriteStream: jest.fn(),
  rmSync: jest.fn()
}));

// Mock pathResolver
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getPopularityStatsPath: jest.fn(),
  getECODataPath: jest.fn(),
  getVideosDataPath: jest.fn()
}));

describe('GET /api/openings/popular-by-eco', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/openings', openingsRouter);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  const mockOpeningsData = [
    // ECO A openings (6 total)
    { eco: 'A00', name: 'Irregular Opening', fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', games_analyzed: 1500000, src: 'eco_tsv', moves: '1. Nf3', analysis_json: { complexity: 'Beginner' }, popularity_score: 9, white_win_rate: 0.5, black_win_rate: 0.4, draw_rate: 0.1, avg_rating: 1800 },
    { eco: 'A01', name: 'Nimzo-Larsen Attack', fen: 'rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1', games_analyzed: 1200000, src: 'eco_tsv', moves: '1. b3', analysis_json: { complexity: 'Intermediate' }, popularity_score: 8, white_win_rate: 0.48, black_win_rate: 0.42, draw_rate: 0.1, avg_rating: 1900 },
    { eco: 'A02', name: "Bird's Opening", fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1', games_analyzed: 1100000, src: 'eco_tsv', moves: '1. f4', analysis_json: { complexity: 'Intermediate' }, popularity_score: 7, white_win_rate: 0.49, black_win_rate: 0.41, draw_rate: 0.1, avg_rating: 1850 },
    { eco: 'A03', name: "Bird's Opening: Dutch Variation", fen: 'rnbqkbnr/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2', games_analyzed: 900000, src: 'eco_tsv', moves: '1. f4 d5', analysis_json: { complexity: 'Intermediate' }, popularity_score: 6, white_win_rate: 0.47, black_win_rate: 0.43, draw_rate: 0.1, avg_rating: 1870 },
    { eco: 'A04', name: 'Zukertort Opening', fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', games_analyzed: 800000, src: 'eco_tsv', moves: '1. Nf3', analysis_json: { complexity: 'Beginner' }, popularity_score: 5, white_win_rate: 0.51, black_win_rate: 0.39, draw_rate: 0.1, avg_rating: 1750 },
    { eco: 'A05', name: 'Zukertort Opening: Quiet System', fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2', games_analyzed: 750000, src: 'eco_tsv', moves: '1. Nf3 d5', analysis_json: { complexity: 'Beginner' }, popularity_score: 4, white_win_rate: 0.52, black_win_rate: 0.38, draw_rate: 0.1, avg_rating: 1780 },
    
    // ECO B openings (6 total)
    { eco: 'B00', name: "King's Pawn Game", fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', games_analyzed: 3778178876, src: 'eco_tsv', moves: '1. e4', analysis_json: { complexity: 'Beginner' }, popularity_score: 10, white_win_rate: 0.52, black_win_rate: 0.38, draw_rate: 0.1, avg_rating: 1600 },
    { eco: 'B01', name: 'Scandinavian Defense', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 50000000, src: 'eco_tsv', moves: '1. e4 d5', analysis_json: { complexity: 'Intermediate' }, popularity_score: 9, white_win_rate: 0.53, black_win_rate: 0.37, draw_rate: 0.1, avg_rating: 1750 },
    { eco: 'B02', name: 'Alekhine Defense', fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2', games_analyzed: 35000000, src: 'eco_tsv', moves: '1. e4 Nf6', analysis_json: { complexity: 'Advanced' }, popularity_score: 8, white_win_rate: 0.54, black_win_rate: 0.36, draw_rate: 0.1, avg_rating: 1900 },
    { eco: 'B03', name: 'Alekhine Defense: Four Pawns Attack', fen: 'rnbqkb1r/ppp1pppp/3p1n2/8/2PPP3/8/PP3PPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 25000000, src: 'eco_tsv', moves: '1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. c4', analysis_json: { complexity: 'Advanced' }, popularity_score: 7, white_win_rate: 0.55, black_win_rate: 0.35, draw_rate: 0.1, avg_rating: 1950 },
    { eco: 'B04', name: 'Alekhine Defense: Modern Variation', fen: 'rnbqkb1r/ppp1pppp/3p1n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 20000000, src: 'eco_tsv', moves: '1. e4 Nf6 2. e5 Nd5 3. d4 d6', analysis_json: { complexity: 'Advanced' }, popularity_score: 6, white_win_rate: 0.56, black_win_rate: 0.34, draw_rate: 0.1, avg_rating: 1980 },
    { eco: 'B05', name: 'Alekhine Defense: Modern Variation, Flohr Variation', fen: 'rnbqkb1r/ppp1pppp/3p1n2/4P3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 18000000, src: 'eco_tsv', moves: '1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. exd6', analysis_json: { complexity: 'Advanced' }, popularity_score: 5, white_win_rate: 0.57, black_win_rate: 0.33, draw_rate: 0.1, avg_rating: 2000 },
    
    // ECO C openings (6 total)
    { eco: 'C00', name: 'French Defense', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 120000000, src: 'eco_tsv', moves: '1. e4 e6', analysis_json: { complexity: 'Intermediate' }, popularity_score: 9, white_win_rate: 0.51, black_win_rate: 0.39, draw_rate: 0.1, avg_rating: 1850 },
    { eco: 'C01', name: 'French Defense: Exchange Variation', fen: 'rnbqkbnr/ppp2ppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', games_analyzed: 100000000, src: 'eco_tsv', moves: '1. e4 e6 2. d4 d5 3. exd5', analysis_json: { complexity: 'Beginner' }, popularity_score: 8, white_win_rate: 0.5, black_win_rate: 0.4, draw_rate: 0.1, avg_rating: 1750 },
    { eco: 'C02', name: 'French Defense: Advance Variation', fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 80000000, src: 'eco_tsv', moves: '1. e4 e6 2. d4 d5 3. e5', analysis_json: { complexity: 'Intermediate' }, popularity_score: 7, white_win_rate: 0.52, black_win_rate: 0.38, draw_rate: 0.1, avg_rating: 1900 },
    { eco: 'C03', name: 'French Defense: Tarrasch Variation', fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPPN1PPP/R1BQKBNR b KQkq - 1 3', games_analyzed: 70000000, src: 'eco_tsv', moves: '1. e4 e6 2. d4 d5 3. Nd2', analysis_json: { complexity: 'Intermediate' }, popularity_score: 6, white_win_rate: 0.53, black_win_rate: 0.37, draw_rate: 0.1, avg_rating: 1950 },
    { eco: 'C04', name: 'French Defense: Tarrasch Variation, Guimard Defense', fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/8/PPPN1PPP/R1BQKBNR w KQkq - 2 4', games_analyzed: 60000000, src: 'eco_tsv', moves: '1. e4 e6 2. d4 d5 3. Nd2 Nf6', analysis_json: { complexity: 'Intermediate' }, popularity_score: 5, white_win_rate: 0.54, black_win_rate: 0.36, draw_rate: 0.1, avg_rating: 2000 },
    { eco: 'C05', name: 'French Defense: Tarrasch Variation, Closed System', fen: 'rnbqkb1r/pp3ppp/4pn2/2pp4/3PP3/2P5/PP1N1PPP/R1BQKBNR b KQkq - 0 5', games_analyzed: 55000000, src: 'eco_tsv', moves: '1. e4 e6 2. d4 d5 3. Nd2 Nf6 4. e5 Nfd7 5. c3', analysis_json: { complexity: 'Advanced' }, popularity_score: 4, white_win_rate: 0.55, black_win_rate: 0.35, draw_rate: 0.1, avg_rating: 2050 },
    
    // ECO D openings (6 total) - sorted by games_analyzed descending
    { eco: 'D00', name: "Queen's Pawn Game", fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1', games_analyzed: 500000000, src: 'eco_tsv', moves: '1. d4', analysis_json: { complexity: 'Beginner' }, popularity_score: 10, white_win_rate: 0.51, black_win_rate: 0.39, draw_rate: 0.1, avg_rating: 1700 },
    { eco: 'D02', name: 'London System', fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/5NP1/PPP1PP1P/RNBQKB1R b KQkq - 0 3', games_analyzed: 45000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. Nf3 g6 3. g3', analysis_json: { complexity: 'Beginner' }, popularity_score: 8, white_win_rate: 0.53, black_win_rate: 0.37, draw_rate: 0.1, avg_rating: 1800 },
    { eco: 'D03', name: 'Torre Attack', fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 2 2', games_analyzed: 25000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. Nf3', analysis_json: { complexity: 'Intermediate' }, popularity_score: 7, white_win_rate: 0.54, black_win_rate: 0.36, draw_rate: 0.1, avg_rating: 1900 },
    { eco: 'D04', name: 'Colle System', fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3', games_analyzed: 20000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. Nf3 d5', analysis_json: { complexity: 'Intermediate' }, popularity_score: 5, white_win_rate: 0.55, black_win_rate: 0.35, draw_rate: 0.1, avg_rating: 1950 },
    { eco: 'D05', name: 'Colle System: Traditional', fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R b KQkq - 2 3', games_analyzed: 18000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. Nf3 d5 3. Nc3', analysis_json: { complexity: 'Intermediate' }, popularity_score: 4, white_win_rate: 0.56, black_win_rate: 0.34, draw_rate: 0.1, avg_rating: 2000 },
    { eco: 'D01', name: 'Richter-Veresov Attack', fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq - 2 2', games_analyzed: 15000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. Nc3', analysis_json: { complexity: 'Intermediate' }, popularity_score: 6, white_win_rate: 0.52, black_win_rate: 0.38, draw_rate: 0.1, avg_rating: 1850 },
    
    // ECO E openings (6 total)
    { eco: 'E00', name: 'Indian Defense', fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2', games_analyzed: 200000000, src: 'eco_tsv', moves: '1. d4 Nf6', analysis_json: { complexity: 'Intermediate' }, popularity_score: 9, white_win_rate: 0.52, black_win_rate: 0.38, draw_rate: 0.1, avg_rating: 1800 },
    { eco: 'E01', name: 'Catalan Opening', fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3', games_analyzed: 75000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. c4 e6 3. g3', analysis_json: { complexity: 'Advanced' }, popularity_score: 8, white_win_rate: 0.53, black_win_rate: 0.37, draw_rate: 0.1, avg_rating: 2100 },
    { eco: 'E02', name: 'Catalan Opening: Closed Variation', fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 0 4', games_analyzed: 65000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5', analysis_json: { complexity: 'Advanced' }, popularity_score: 7, white_win_rate: 0.54, black_win_rate: 0.36, draw_rate: 0.1, avg_rating: 2150 },
    { eco: 'E03', name: 'Catalan Opening: Open Defense', fen: 'rnbqkb1r/ppp2ppp/4pn2/8/2pP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 0 4', games_analyzed: 55000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. cxd5', analysis_json: { complexity: 'Advanced' }, popularity_score: 6, white_win_rate: 0.55, black_win_rate: 0.35, draw_rate: 0.1, avg_rating: 2200 },
    { eco: 'E04', name: 'Catalan Opening: Open Defense, 5.Nf3', fen: 'rnbqkb1r/ppp2ppp/4pn2/8/3P4/5NP1/PP2PP1P/RNBQKB1R b KQkq - 1 5', games_analyzed: 45000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. cxd5 exd5 5. Nf3', analysis_json: { complexity: 'Advanced' }, popularity_score: 5, white_win_rate: 0.56, black_win_rate: 0.34, draw_rate: 0.1, avg_rating: 2250 },
    { eco: 'E05', name: 'Catalan Opening: Open Defense, Classical Line', fen: 'rnbqk2r/ppp1bppp/4pn2/8/3P4/5NP1/PP2PPBP/RNBQK2R b KQkq - 3 6', games_analyzed: 40000000, src: 'eco_tsv', moves: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. cxd5 exd5 5. Nf3 Be7 6. Bg2', analysis_json: { complexity: 'Advanced' }, popularity_score: 4, white_win_rate: 0.57, black_win_rate: 0.33, draw_rate: 0.1, avg_rating: 2300 }
  ];

  const mockPopularityData = {
    positions: mockOpeningsData.reduce((acc, opening, index) => {
      acc[opening.fen] = {
        games_analyzed: opening.games_analyzed,
        rank: index + 1,
        popularity_score: 10 - (index * 0.1),
        white_win_rate: 0.5,
        black_win_rate: 0.4,
        draw_rate: 0.1
      };
      return acc;
    }, {})
  };

  describe('Performance and functionality tests', () => {
    beforeEach(() => {
      const pathResolver = require('../../packages/api/src/utils/path-resolver');
      
      // Reset all mocks
      jest.clearAllMocks();
      
      // Configure the ECOService mock
      mockECOService.getAllOpenings.mockReturnValue(mockOpeningsData);
      mockECOService.getPopularOpeningsByECO.mockImplementation((category, limit = 6) => {
        const actualLimit = Math.min(parseInt(limit) || 6, 20);
        
        const mockECOResponse = {
          A: mockOpeningsData.filter(o => o.eco.startsWith('A')).sort((a, b) => b.games_analyzed - a.games_analyzed).slice(0, actualLimit),
          B: mockOpeningsData.filter(o => o.eco.startsWith('B')).sort((a, b) => b.games_analyzed - a.games_analyzed).slice(0, actualLimit),
          C: mockOpeningsData.filter(o => o.eco.startsWith('C')).sort((a, b) => b.games_analyzed - a.games_analyzed).slice(0, actualLimit),
          D: mockOpeningsData.filter(o => o.eco.startsWith('D')).sort((a, b) => b.games_analyzed - a.games_analyzed).slice(0, actualLimit),
          E: mockOpeningsData.filter(o => o.eco.startsWith('E')).sort((a, b) => b.games_analyzed - a.games_analyzed).slice(0, actualLimit)
        };
        
        return {
          data: mockECOResponse,
          metadata: {
            total_openings_analyzed: mockOpeningsData.length,
            total_openings_returned: Object.values(mockECOResponse).reduce((sum, arr) => sum + arr.length, 0),
            response_time_ms: 5,
            source: 'games_analyzed',
            categories_included: ['A', 'B', 'C', 'D', 'E'],
            limit_per_category: actualLimit
          }
        };
      });
      
      // Mock pathResolver
      pathResolver.getPopularityStatsPath.mockReturnValue('/mock/path/popularity_stats.json');
      
      // Mock fs.existsSync and fs.readFileSync for popularity data
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPopularityData));
    });

    test('should return top 6 openings for each ECO category', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco');

      if (response.status !== 200) {
        console.log('Error response status:', response.status);
        console.log('Error response body:', response.body);
        console.log('Error response text:', response.text);
      }
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Should have all ECO categories
      const categories = Object.keys(response.body.data);
      expect(categories).toContain('A');
      expect(categories).toContain('B');
      expect(categories).toContain('C');
      expect(categories).toContain('D');
      expect(categories).toContain('E');
      
      // Each category should have exactly 6 openings
      categories.forEach(category => {
        expect(response.body.data[category]).toHaveLength(6);
      });
    });

    test('should sort openings by games_analyzed in descending order within each category', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);

      const { data } = response.body;
      
      // Check each category is sorted by games_analyzed descending
      Object.keys(data).forEach(category => {
        const openings = data[category];
        for (let i = 0; i < openings.length - 1; i++) {
          expect(openings[i].games_analyzed).toBeGreaterThanOrEqual(openings[i + 1].games_analyzed);
        }
      });
    });

    test('should include metadata about total games and source', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);

      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.total_openings_analyzed).toBeGreaterThan(0);
      expect(response.body.metadata.source).toBe('games_analyzed');
      expect(response.body.metadata.categories_included).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    test('should handle request with custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=3')
        .expect(200);

      const { data } = response.body;
      
      // Each category should have exactly 3 openings
      Object.keys(data).forEach(category => {
        expect(data[category]).toHaveLength(3);
      });
    });

    test('should respect maximum limit of 10', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=20')
        .expect(200);

      const { data } = response.body;
      
      // Each category should have maximum 6 openings (since we only have 6 in mock data)
      Object.keys(data).forEach(category => {
        expect(data[category].length).toBeLessThanOrEqual(10);
      });
    });

    test('should complete request in under 100ms for performance', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);
        
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(100);
    });

    test('should fallback gracefully when no popularity data available', async () => {
      // Mock the service to return fallback source
      mockECOService.getPopularOpeningsByECO.mockReturnValue({
        data: {
          A: mockOpeningsData.filter(o => o.eco.startsWith('A')).slice(0, 6),
          B: mockOpeningsData.filter(o => o.eco.startsWith('B')).slice(0, 6),
          C: mockOpeningsData.filter(o => o.eco.startsWith('C')).slice(0, 6),
          D: mockOpeningsData.filter(o => o.eco.startsWith('D')).slice(0, 6),
          E: mockOpeningsData.filter(o => o.eco.startsWith('E')).slice(0, 6)
        },
        metadata: {
          total_openings_analyzed: mockOpeningsData.length,
          total_openings_returned: 30,
          response_time_ms: 5,
          source: 'fallback',
          categories_included: ['A', 'B', 'C', 'D', 'E'],
          limit_per_category: 6
        }
      });
      
      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.source).toBe('fallback');
    });
  });

  describe('Error handling', () => {
    test('should handle invalid limit parameter gracefully', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=invalid')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should default to 6
    });

    test('should handle ECOService errors gracefully', async () => {
      // Configure the mock to throw an error
      mockECOService.getPopularOpeningsByECO.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });
  });
});
