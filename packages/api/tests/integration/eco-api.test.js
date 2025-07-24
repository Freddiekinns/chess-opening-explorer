const request = require('supertest');
const app = require('../../src/server');

describe('ECO API Integration with Real Data', () => {
  describe('GET /api/openings/random', () => {
    it('should return a random opening with valid ECO data structure', async () => {
      const response = await request(app)
        .get('/api/openings/random')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const opening = response.body.data;
      expect(opening.fen).toBeDefined();
      expect(opening.eco).toMatch(/^[ABCDE]\d{2}$/); // Valid ECO code format
      expect(opening.name).toBeDefined();
      expect(opening.moves).toBeDefined();
      expect(opening.src).toBeDefined();
    });
  });

  describe('GET /api/openings/search', () => {
    it('should search openings by name', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=King')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify at least some results contain "King" in the name
      const hasKingInName = response.body.data.some(opening => 
        opening.name.toLowerCase().includes('king')
      );
      expect(hasKingInName).toBe(true);
    });

    it('should search openings by ECO code', async () => {
      const response = await request(app)
        .get('/api/openings/search?q=B20')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify all results have ECO code B20
      response.body.data.forEach(opening => {
        expect(opening.eco).toBe('B20');
      });
    });
  });

  describe('GET /api/openings/eco/:code', () => {
    it('should return openings for specific ECO code', async () => {
      const response = await request(app)
        .get('/api/openings/eco/A00')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      response.body.data.forEach(opening => {
        expect(opening.eco).toBe('A00');
      });
    });
  });

  describe('GET /api/openings/categories', () => {
    it('should return all ECO categories', async () => {
      const response = await request(app)
        .get('/api/openings/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(100); // Should have many ECO codes
      
      // Should include some known ECO codes
      expect(response.body.data).toContain('A00');
      expect(response.body.data).toContain('B00');
      expect(response.body.data).toContain('C00');
      expect(response.body.data).toContain('D00');
      expect(response.body.data).toContain('E00');
    });
  });

  describe('GET /api/openings/fen/:fen', () => {
    it('should return opening data for a specific FEN position', async () => {
      // Use the starting position FEN
      const startingFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const encodedFen = encodeURIComponent(startingFen);
      
      const response = await request(app)
        .get(`/api/openings/fen/${encodedFen}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.moves).toContain('e4');
    });
  });
});
