const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const statsRoutes = require('../../src/routes/stats');

const app = express();
app.use('/api/stats', statsRoutes);

describe('Stats API Routes', () => {
  const mockDataPath = path.join(__dirname, '../../src/data/mock_popularity_stats.json');
  
  beforeAll(() => {
    // Ensure mock data exists
    expect(fs.existsSync(mockDataPath)).toBe(true);
  });

  describe('GET /api/stats/:fen', () => {
    it('should return popularity stats for a valid FEN', async () => {
      // Use a FEN that actually exists in the real popularity data
      const testFen = 'rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
      const encodedFen = encodeURIComponent(testFen);
      
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Validate PopularityStats structure
      const stats = response.body.data;
      expect(typeof stats.popularity_score).toBe('number');
      expect(typeof stats.frequency_count).toBe('number');
      expect(typeof stats.games_analyzed).toBe('number');
      expect(typeof stats.confidence_score).toBe('number');
      expect(typeof stats.analysis_date).toBe('string');
    });

    it('should return 404 for an opening not in the dataset', async () => {
      // Use a valid FEN that doesn't exist in our dataset
      const testFen = 'rnbqkbnr/pppppppp/8/8/7P/8/PPPPPPP1/RNBQKBNR b KQkq h3 0 1';
      const encodedFen = encodeURIComponent(testFen);
      
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Statistics not found');
    });

    it('should return 404 for non-existent FEN', async () => {
      const testFen = 'invalid/fen/position';
      const encodedFen = encodeURIComponent(testFen);
      
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Statistics not found for this opening');
    });

    it('should handle malformed FEN gracefully', async () => {
      const testFen = 'clearly-not-a-fen';
      const encodedFen = encodeURIComponent(testFen);
      
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Statistics not found for this opening');
    }, 10000); // Increased timeout to 10 seconds

    it('should validate response structure matches PopularityStats interface', async () => {
      // Use a FEN that actually exists in the real popularity data
      const testFen = 'rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
      const encodedFen = encodeURIComponent(testFen);
      
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(200);
      
      const stats = response.body.data;
      const requiredFields = [
        'popularity_score', 'frequency_count', 'games_analyzed',
        'confidence_score', 'analysis_date'
      ];
      
      requiredFields.forEach(field => {
        expect(stats).toHaveProperty(field);
      });
      
      // Type checks
      expect(typeof stats.popularity_score).toBe('number');
      expect(typeof stats.frequency_count).toBe('number');
      expect(typeof stats.games_analyzed).toBe('number');
      expect(typeof stats.confidence_score).toBe('number');
      expect(typeof stats.analysis_date).toBe('string');
    });

    it('should respond in under 100ms for performance requirement', async () => {
      // Use a FEN that actually exists in the real popularity data
      const testFen = 'rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
      const encodedFen = encodeURIComponent(testFen);
      
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });
});
