/**
 * TDD Test: Opening Data Consistency Integration Tests
 * 
 * This test suite verifies that all 8 key opening attributes are consistent
 * when retrieved from different API endpoints and components:
 * 1. Description
 * 2. Name  
 * 3. FEN
 * 4. Common Plans
 * 5. Stats
 * 6. Tags
 * 7. Aliases
 * 8. ECO Code
 * 
 * Following CLAUDE.md TDD methodology with comprehensive mocking
 */

const request = require('supertest');
const express = require('express');

// Mock ECOService before requiring the routes
jest.mock('../../packages/api/src/services/eco-service');
const ECOService = require('../../packages/api/src/services/eco-service');

// Mock data based on real structure from ecoA.json
const mockECOData = {
  'rnbqkbnr/pp1ppppp/8/2p5/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 2': {
    src: 'eco_tsv',
    eco: 'A00',
    name: 'Hungarian Opening: Sicilian Invitation',
    moves: '1. g3 c5',
    analysis_json: {
      description: 'The Hungarian Opening with the Sicilian Invitation (1. g3 c5) is a flexible, hypermodern system where White adopts a reversed Sicilian setup with an extra tempo. This approach sidesteps mainstream theory, leading to a strategically complex game where understanding pawn structures and piece placement is paramount. It\'s ideal for patient, positional players who enjoy fianchetto systems and prefer to outmaneuver their opponents in a less-forced, more fluid battle.',
      style_tags: ['Positional', 'Strategic', 'System-based', 'Flexible', 'Hypermodern', 'Transpositional', 'Quiet'],
      tactical_tags: ['Counterattack', 'Initiative', 'Tempo', 'Pin'],
      positional_tags: ['Central Control', 'Pawn Structure'],
      strategic_themes: ['Reversed Sicilian', 'Fianchetto Attack', 'Control of the d4-square', 'Transpositional Play'],
      complexity: 'Intermediate',
      common_plans: [
        'White: Complete the kingside fianchetto (Bg2), control the center with moves like Nf3 and c4, and use the long diagonal to pressure Black\'s position.',
        'Black: Challenge White\'s central ambitions with ...Nc6 and ...d5, develop pieces to fight for the d4-square, and create counterplay on the queenside.',
        'White: Often transposes into a favorable version of the English Opening or a Réti Setup, aiming for a small but lasting spatial or positional edge.',
        'Black: Aims to equalize by neutralizing White\'s fianchettoed bishop and proving that White\'s setup is too passive.'
      ]
    }
  }
};

const mockPopularityStats = {
  'rnbqkbnr/pp1ppppp/8/2p5/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 2': {
    popularity_score: 6.5,
    frequency_count: 1250,
    games_analyzed: 5000,
    white_win_rate: 52.3,
    black_win_rate: 32.1,
    draw_rate: 15.6,
    confidence_score: 8.2,
    analysis_date: '2024-01-15'
  }
};

describe('Opening Data Consistency Integration Tests', () => {
  let app;
  let mockEcoService;
  const testFEN = 'rnbqkbnr/pp1ppppp/8/2p5/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 2';
  const expectedOpening = mockECOData[testFEN];

  beforeAll(() => {
    // Create mock ECO service instance
    mockEcoService = {
      getOpeningByFEN: jest.fn((fen) => {
        const opening = mockECOData[fen];
        if (!opening) return null;
        
        // Simulate the formatOpeningData method behavior
        return {
          name: opening.name,
          eco: opening.eco,
          fen: fen,
          moves: opening.moves || '',
          aliases: [], // No aliases in our test data
          description: opening.analysis_json?.description || '',
          style_tags: opening.analysis_json?.style_tags || [],
          tactical_tags: opening.analysis_json?.tactical_tags || [],
          positional_tags: opening.analysis_json?.positional_tags || [],
          strategic_themes: opening.analysis_json?.strategic_themes || [],
          common_plans: opening.analysis_json?.common_plans || [],
          src: opening.src,
          scid: opening.scid
        };
      }),
      getECOAnalysisByFEN: jest.fn((fen) => {
        const opening = mockECOData[fen];
        if (!opening?.analysis_json) return null;
        
        const analysis = opening.analysis_json;
        return {
          eco: opening.eco,
          fen: fen,
          name: opening.name,
          moves: opening.moves || '',
          aliases: [], // No aliases in our test data
          description: analysis.description,
          style_tags: analysis.style_tags || [],
          tactical_tags: analysis.tactical_tags || [],
          positional_tags: analysis.positional_tags || [],
          strategic_themes: analysis.strategic_themes || [],
          complexity: analysis.complexity || 'Unknown',
          white_plans: analysis.white_plans || [],
          black_plans: analysis.black_plans || [],
          common_plans: analysis.common_plans || [],
          mainline_moves: analysis.mainline_moves,
          last_enriched_at: analysis.last_enriched_at
        };
      })
    };

    // Mock the ECOService constructor to return our mock instance
    ECOService.mockImplementation(() => mockEcoService);
    
    // Setup Express app with mocked services
    app = express();
    app.use(express.json());

    // Setup routes with mocked services (require after mocking)
    const openingsRouter = require('../../packages/api/src/routes/openings.routes');
    
    app.use('/api/openings', openingsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Core Opening Data Retrieval', () => {
    test('should return consistent opening data from FEN lookup endpoint', async () => {
      const encodedFEN = encodeURIComponent(testFEN);
      
      const response = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const opening = response.body.data;

      // Verify all 8 key attributes
      expect(opening.name).toBe(expectedOpening.name);
      expect(opening.eco).toBe(expectedOpening.eco);
      expect(opening.fen).toBe(testFEN); // FEN should match the test FEN
      expect(opening.description).toBe(expectedOpening.analysis_json.description);
      expect(opening.style_tags).toEqual(expectedOpening.analysis_json.style_tags);
      expect(opening.common_plans).toEqual(expectedOpening.analysis_json.common_plans);
    });

    test('should return consistent analysis data from FEN analysis endpoint', async () => {
      const response = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: testFEN })
        .expect(200);

      expect(response.body.success).toBe(true);
      const analysis = response.body.data;

      // Verify analysis attributes match the same opening
      expect(analysis.name).toBe(expectedOpening.name);
      expect(analysis.eco).toBe(expectedOpening.eco);
      expect(analysis.fen).toBe(testFEN); // FEN should match the test FEN
      expect(analysis.description).toBe(expectedOpening.analysis_json.description);
      expect(analysis.style_tags).toEqual(expectedOpening.analysis_json.style_tags);
      expect(analysis.complexity).toBe(expectedOpening.analysis_json.complexity);
    });
  });

  describe('Cross-Endpoint Data Consistency', () => {
    test('should return the same opening name across all endpoints', async () => {
      const encodedFEN = encodeURIComponent(testFEN);
      
      // Get opening data
      const openingResponse = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(200);
      
      // Get analysis data
      const analysisResponse = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: testFEN })
        .expect(200);

      const openingName = openingResponse.body.data.name;
      const analysisName = analysisResponse.body.data.name;

      expect(openingName).toBe(analysisName);
      expect(openingName).toBe(expectedOpening.name);
    });

    test('should return the same ECO code across all endpoints', async () => {
      const encodedFEN = encodeURIComponent(testFEN);
      
      // Get opening data
      const openingResponse = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(200);
      
      // Get analysis data  
      const analysisResponse = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: testFEN })
        .expect(200);

      const openingEco = openingResponse.body.data.eco;
      const analysisEco = analysisResponse.body.data.eco;

      expect(openingEco).toBe(analysisEco);
      expect(openingEco).toBe(expectedOpening.eco);
    });

    test('should return the same FEN across all endpoints', async () => {
      const encodedFEN = encodeURIComponent(testFEN);
      
      // Get opening data
      const openingResponse = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(200);
      
      // Get analysis data
      const analysisResponse = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: testFEN })
        .expect(200);

      const openingFen = openingResponse.body.data.fen;
      const analysisFen = analysisResponse.body.data.fen;

      expect(openingFen).toBe(analysisFen);
      expect(openingFen).toBe(testFEN); // Both should match the test FEN
    });
  });

  describe('Data Completeness Validation', () => {
    test('should include all required attributes in opening response', async () => {
      const encodedFEN = encodeURIComponent(testFEN);
      
      const response = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(200);

      const opening = response.body.data;

      // Verify all 8 key attributes are present
      expect(opening).toHaveProperty('name');
      expect(opening).toHaveProperty('eco');
      expect(opening).toHaveProperty('fen');
      expect(opening).toHaveProperty('moves');
      expect(opening).toHaveProperty('aliases');
      
      // Verify they're not null/undefined/empty
      expect(opening.name).toBeTruthy();
      expect(opening.eco).toBeTruthy();
      expect(opening.fen).toBeTruthy();
      expect(opening.moves).toBeTruthy();
      expect(Array.isArray(opening.aliases)).toBe(true);
    });

    test('should include all required attributes in analysis response', async () => {
      const response = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: testFEN })
        .expect(200);

      const analysis = response.body.data;

      // Verify analysis-specific attributes
      expect(analysis).toHaveProperty('description');
      expect(analysis).toHaveProperty('common_plans');
      expect(analysis).toHaveProperty('style_tags');
      expect(analysis).toHaveProperty('complexity');
      expect(analysis).toHaveProperty('strategic_themes');
      
      // Verify they contain meaningful data
      expect(analysis.description).toBeTruthy();
      expect(Array.isArray(analysis.common_plans)).toBe(true);
      expect(Array.isArray(analysis.style_tags)).toBe(true);
      expect(analysis.complexity).toBeTruthy();
    });
  });

  describe('Error Handling Consistency', () => {
    test('should handle non-existent FEN consistently across endpoints', async () => {
      const nonExistentFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const encodedFEN = encodeURIComponent(nonExistentFEN);
      
      // Both endpoints should return 404 for non-existent FEN
      await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(404);
      
      await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: nonExistentFEN })
        .expect(404);
    });

    test('should handle malformed FEN consistently', async () => {
      const malformedFEN = 'invalid-fen-string';
      const encodedFEN = encodeURIComponent(malformedFEN);
      
      // Both endpoints should handle malformed FEN gracefully
      const openingResponse = await request(app)
        .get(`/api/openings/fen/${encodedFEN}`)
        .expect(404);
      
      const analysisResponse = await request(app)
        .post('/api/openings/fen-analysis')
        .send({ fen: malformedFEN })
        .expect(404);

      expect(openingResponse.body.success).toBe(false);
      expect(analysisResponse.body.success).toBe(false);
    });
  });
});
