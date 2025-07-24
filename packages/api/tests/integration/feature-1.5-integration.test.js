const request = require('supertest');
const app = require('../../src/server');

describe('Feature 1.5 Integration Tests', () => {
  describe('Complete API to Frontend Flow', () => {
    it('should serve popularity stats through complete API', async () => {
      // Test 1: Health check
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('ok');
      
      // Test 2: Stats lookup using a FEN that exists in real data
      const realFen = 'rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
      const statsResponse = await request(app)
        .get(`/api/stats/${encodeURIComponent(realFen)}`)
        .expect(200);
      
      expect(statsResponse.body.success).toBe(true);
      expect(typeof statsResponse.body.data.popularity_score).toBe('number');
      expect(typeof statsResponse.body.data.games_analyzed).toBe('number');
      
      // Test 3: Verify the API is correctly integrated
      expect(statsResponse.body.data).toHaveProperty('popularity_score');
      expect(statsResponse.body.data).toHaveProperty('games_analyzed');
      expect(statsResponse.body.data).toHaveProperty('confidence_score');
    });

    it('should handle non-existent openings gracefully', async () => {
      // Test with a FEN that doesn't exist in our dataset
      const nonExistentFen = 'rnbqkbnr/pppppppp/8/8/7P/8/PPPPPPP1/RNBQKBNR b KQkq h3 0 1';
      
      const response = await request(app)
        .get(`/api/stats/${encodeURIComponent(nonExistentFen)}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Statistics not found');
    });

    it('should validate PopularityStats schema compliance', async () => {
      // Use URL-encoded version of our real FEN position
      const encodedFen = encodeURIComponent('rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3');
      const response = await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(200);
      
      const stats = response.body.data;
      
      // Required fields
      expect(stats).toHaveProperty('popularity_score');
      expect(stats).toHaveProperty('frequency_count');
      expect(stats).toHaveProperty('games_analyzed');
      expect(stats).toHaveProperty('confidence_score');
      expect(stats).toHaveProperty('analysis_date');
      
      // Type validation
      expect(typeof stats.popularity_score).toBe('number');
      expect(typeof stats.frequency_count).toBe('number');
      expect(typeof stats.games_analyzed).toBe('number');
      expect(typeof stats.confidence_score).toBe('number');
      expect(typeof stats.analysis_date).toBe('string');
      
      // Range validation
      expect(stats.popularity_score).toBeGreaterThanOrEqual(0);
      expect(stats.popularity_score).toBeLessThanOrEqual(10);
      expect(stats.confidence_score).toBeGreaterThanOrEqual(0);
      expect(stats.confidence_score).toBeLessThanOrEqual(1);
    });

    it('should meet performance requirements', async () => {
      const startTime = Date.now();
      
      const encodedFen = encodeURIComponent('rnbqkbnr/pppp2pp/4p3/5p2/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3');
      await request(app)
        .get(`/api/stats/${encodedFen}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Under 100ms as per PRD
    });
  });
});
