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
const openingsRouter = require('../../packages/api/src/routes/openings');
const ECOService = require('../../packages/api/src/services/eco-service');
const fs = require('fs');

// Mock ECOService
jest.mock('../../packages/api/src/services/eco-service');
jest.mock('fs');

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
    // ECO A openings
    { eco: 'A00', name: 'Irregular Opening', fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', games_analyzed: 1500000 },
    { eco: 'A01', name: 'Nimzo-Larsen Attack', fen: 'rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1', games_analyzed: 1200000 },
    { eco: 'A02', name: "Bird's Opening", fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1', games_analyzed: 1100000 },
    { eco: 'A03', name: "Bird's Opening: Dutch Variation", fen: 'rnbqkbnr/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2', games_analyzed: 900000 },
    { eco: 'A04', name: 'Zukertort Opening', fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', games_analyzed: 800000 },
    { eco: 'A05', name: 'Zukertort Opening: Quiet System', fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2', games_analyzed: 750000 },
    { eco: 'A06', name: 'Zukertort Opening: Tennison Gambit', fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2', games_analyzed: 700000 },
    
    // ECO B openings  
    { eco: 'B00', name: "King's Pawn Game", fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', games_analyzed: 3778178876 },
    { eco: 'B01', name: 'Scandinavian Defense', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 50000000 },
    { eco: 'B02', name: 'Alekhine Defense', fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2', games_analyzed: 35000000 },
    { eco: 'B03', name: 'Alekhine Defense: Four Pawns Attack', fen: 'rnbqkb1r/ppp1pppp/3p1n2/8/2PPP3/8/PP3PPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 30000000 },
    { eco: 'B04', name: 'Alekhine Defense: Modern Variation', fen: 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 1 3', games_analyzed: 25000000 },
    { eco: 'B05', name: 'Alekhine Defense: Modern, Flohr Variation', fen: 'r1bqkb1r/ppp1pppp/2np1n2/8/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 2 4', games_analyzed: 20000000 },
    { eco: 'B06', name: 'Robatsch Defense', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 15000000 },
    
    // ECO C openings
    { eco: 'C00', name: 'French Defense', fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 120000000 },
    { eco: 'C01', name: 'French Defense: Exchange Variation', fen: 'rnbqkbnr/ppp2ppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', games_analyzed: 100000000 },
    { eco: 'C02', name: 'French Defense: Advance Variation', fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', games_analyzed: 95000000 },
    { eco: 'C03', name: 'French Defense: Tarrasch Variation', fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 3', games_analyzed: 90000000 },
    { eco: 'C04', name: 'French Defense: Tarrasch, Guimard Main Line', fen: 'r1bqkbnr/ppp2ppp/2n1p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 4', games_analyzed: 85000000 },
    { eco: 'C05', name: 'French Defense: Tarrasch, Closed Variation', fen: 'r1bqkbnr/ppp2ppp/2n1p3/3p4/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 2 4', games_analyzed: 80000000 },
    { eco: 'C06', name: 'French Defense: Tarrasch, Closed, Main Line', fen: 'r1bqkb1r/ppp2ppp/2n1pn2/3p4/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 3 5', games_analyzed: 75000000 },
    
    // ECO D openings
    { eco: 'D00', name: "Queen's Pawn Game", fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', games_analyzed: 200000000 },
    { eco: 'D01', name: 'Richter-Veresov Attack', fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq - 1 2', games_analyzed: 180000000 },
    { eco: 'D02', name: "Queen's Pawn Game: London System", fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 1 2', games_analyzed: 170000000 },
    { eco: 'D03', name: "Queen's Pawn Game: Torre Attack", fen: 'rnbqkbnr/ppp2ppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3', games_analyzed: 160000000 },
    { eco: 'D04', name: "Queen's Pawn Game: Colle System", fen: 'rnbqkbnr/ppp2ppp/8/3p4/3P4/3B1N2/PPP1PPPP/RNBQK2R b KQkq - 2 3', games_analyzed: 150000000 },
    { eco: 'D05', name: "Queen's Pawn Game: Colle System, Traditional", fen: 'r1bqkbnr/ppp2ppp/2n5/3p4/3P4/3B1N2/PPP1PPPP/RNBQK2R w KQkq - 3 4', games_analyzed: 140000000 },
    { eco: 'D06', name: "Queen's Gambit Declined", fen: 'rnbqkbnr/ppp2ppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2', games_analyzed: 135000000 },
    
    // ECO E openings
    { eco: 'E00', name: "Queen's Pawn Game: Neo-Indian Attack", fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2', games_analyzed: 52000000 },
    { eco: 'E01', name: 'Catalan Opening', fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3', games_analyzed: 45000000 },
    { eco: 'E02', name: 'Catalan Opening: Open Defense', fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 0 4', games_analyzed: 40000000 },
    { eco: 'E03', name: 'Catalan Opening: Open Defense, Alekhine Line', fen: 'r1bqkb1r/ppp2ppp/2n1pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 1 5', games_analyzed: 38000000 },
    { eco: 'E04', name: 'Catalan Opening: Open Defense, 5.Nf3', fen: 'r1bqkb1r/ppp2ppp/2n1pn2/3p4/2PP4/5NP1/PP2PP1P/RNBQKB1R b KQkq - 2 5', games_analyzed: 35000000 },
    { eco: 'E05', name: 'Catalan Opening: Open Defense, Classical Line', fen: 'r1bqk2r/ppp1bppp/2n1pn2/3p4/2PP4/5NP1/PP2PP1P/RNBQKB1R w KQkq - 3 6', games_analyzed: 32000000 },
    { eco: 'E06', name: 'Catalan Opening: Closed', fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/5NP1/PP2PP1P/RNBQKB1R b KQkq - 1 4', games_analyzed: 30000000 }
  ];

  const mockPopularityData = {
    top_100_openings: mockOpeningsData.map((opening, index) => ({
      rank: index + 1,
      games_analyzed: opening.games_analyzed,
      name: opening.name,
      eco: opening.eco,
      fen: opening.fen
    }))
  };

  describe('Performance and functionality tests', () => {
    beforeEach(() => {
      // Mock ECOService.getAllOpenings()
      ECOService.prototype.getAllOpenings = jest.fn().mockReturnValue(mockOpeningsData);
      
      // Mock fs.existsSync and fs.readFileSync for popularity data
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPopularityData));
    });

    test('should return top 6 openings for each ECO category', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco')
        .expect(200);

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
      
      // Check ECO B category (highest volume)
      const ecoB = data.B;
      expect(ecoB[0].eco).toBe('B00');
      expect(ecoB[0].games_analyzed).toBe(3778178876);
      expect(ecoB[1].games_analyzed).toBeLessThanOrEqual(ecoB[0].games_analyzed);
      expect(ecoB[2].games_analyzed).toBeLessThanOrEqual(ecoB[1].games_analyzed);
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
      
      // Each category should have exactly 3 openings when limit=3
      Object.keys(data).forEach(category => {
        expect(data[category]).toHaveLength(3);
      });
    });

    test('should respect maximum limit of 10', async () => {
      const response = await request(app)
        .get('/api/openings/popular-by-eco?limit=20')
        .expect(200);

      const { data } = response.body;
      
      // Each category should have maximum 10 openings even when requesting 20
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
      // Mock empty popularity data
      fs.readFileSync.mockReturnValue(JSON.stringify({ top_100_openings: [] }));
      
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
      Object.values(response.body.data).forEach(categoryOpenings => {
        expect(categoryOpenings).toHaveLength(6);
      });
    });

    test('should handle ECOService errors gracefully', async () => {
      ECOService.prototype.getAllOpenings = jest.fn().mockImplementation(() => {
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
