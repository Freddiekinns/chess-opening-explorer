/**
 * Test for LLM service for enrichment
 * Following TDD approach - Red phase
 */

const LLMService = require('../../packages/api/src/services/llm-service');

// Mock the Vertex AI module
jest.mock('@google-cloud/vertexai', () => {
  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

describe('LLM Service for Enrichment', () => {
  let llmService;
  let mockModel;

  beforeEach(() => {
    // Mock environment variable for tests
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test-client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token'
    });

    const { VertexAI } = require('@google-cloud/vertexai');
    const mockVertexAI = new VertexAI();
    mockModel = mockVertexAI.getGenerativeModel();
    
    llmService = new LLMService();
    llmService.model = mockModel;
  });

  afterEach(() => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  });

  describe('generateEnrichment', () => {
    test('should generate enrichment data for a chess opening', async () => {
      const opening = {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        eco: 'B00',
        name: 'King Pawn Opening',
        moves: '1. e4',
        src: 'eco_tsv'
      };

      // Mock LLM response (without books)
      const mockLLMResponse = {
        description: 'A fundamental chess opening that begins with the move 1. e4, controlling the center and developing pieces.',
        style_tags: ['Aggressive', 'Open', 'Tactical'],
        complexity: 'Beginner',
        strategic_themes: ['Central control', 'Quick development'],
        common_plans: ['Develop knights', 'Castle kingside'],
        tactical_tags: ['Central control', 'Tempo'],
        positional_tags: ['King safety', 'Development'],
        player_style_tags: ['Aggressive Player'],
        phase_tags: ['Opening Theory']
      };

      mockModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockLLMResponse)
              }]
            }
          }]
        }
      });

      const result = await llmService.generateEnrichment(opening);

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('style_tags');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('strategic_themes');
      expect(result).toHaveProperty('common_plans');
      expect(result).toHaveProperty('last_enriched_at');

      expect(result.version).toBe('1.0');
      expect(typeof result.description).toBe('string');
      expect(Array.isArray(result.style_tags)).toBe(true);
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(result.complexity);
      expect(Array.isArray(result.strategic_themes)).toBe(true);
      expect(Array.isArray(result.common_plans)).toBe(true);
    });

    test('should include enhanced tagging system with tactical and positional tags', async () => {
      const opening = {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        eco: 'C20',
        name: 'King Pawn Game',
        moves: '1. e4 e5',
        src: 'eco_tsv'
      };

      const mockLLMResponse = {
        description: 'The classic King Pawn Game opening.',
        style_tags: ['Classical', 'Open'],
        complexity: 'Beginner',
        strategic_themes: ['Central control'],
        common_plans: ['Develop pieces'],
        tactical_tags: ['Central control', 'Tempo'],
        positional_tags: ['King safety', 'Development'],
        player_style_tags: ['Positional Player'],
        phase_tags: ['Opening Theory', 'Middlegame Plans']
      };

      mockModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockLLMResponse)
              }]
            }
          }]
        }
      });

      const result = await llmService.generateEnrichment(opening);

      expect(result).toHaveProperty('tactical_tags');
      expect(result).toHaveProperty('positional_tags');
      expect(result).toHaveProperty('player_style_tags');
      expect(result).toHaveProperty('phase_tags');
      expect(Array.isArray(result.tactical_tags)).toBe(true);
      expect(Array.isArray(result.positional_tags)).toBe(true);
      expect(Array.isArray(result.player_style_tags)).toBe(true);
      expect(Array.isArray(result.phase_tags)).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      const badOpening = {
        fen: 'invalid_fen',
        eco: 'INVALID',
        name: '',
        moves: '',
        src: 'test'
      };

      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(llmService.generateEnrichment(badOpening)).rejects.toThrow('Failed to generate enrichment: API Error');
    });

    test('should validate response schema', async () => {
      const opening = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        eco: 'A00',
        name: 'Starting Position',
        moves: '',
        src: 'eco_tsv'
      };

      const mockLLMResponse = {
        description: 'The starting position of chess.',
        style_tags: ['Universal'],
        complexity: 'Beginner',
        strategic_themes: ['Development', 'Control'],
        common_plans: ['Develop pieces', 'Castle'],
        tactical_tags: ['Central control'],
        positional_tags: ['King safety'],
        player_style_tags: ['Universal Player'],
        phase_tags: ['Opening Theory']
      };

      mockModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockLLMResponse)
              }]
            }
          }]
        }
      });

      const result = await llmService.generateEnrichment(opening);

      // Validate structure matches our Analysis interface
      expect(result).toEqual({
        version: expect.any(String),
        description: expect.any(String),
        style_tags: expect.any(Array),
        complexity: expect.stringMatching(/^(Beginner|Intermediate|Advanced)$/),
        strategic_themes: expect.any(Array),
        common_plans: expect.any(Array),
        tactical_tags: expect.any(Array),
        positional_tags: expect.any(Array),
        player_style_tags: expect.any(Array),
        phase_tags: expect.any(Array),
        last_enriched_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      });
    });
  });
});
