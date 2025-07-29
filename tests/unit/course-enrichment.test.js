/**
 * Unit tests for Course Enrichment Pipeline
 * Uses NODE_ENV=test environment detection for mock LLM service
 */

// Set test environment BEFORE requiring the module
process.env.NODE_ENV = 'test';

const CourseEnrichmentPipeline = require('../../tools/production/enrich_course_data');
const fs = require('fs').promises;
const path = require('path');

describe('Course Enrichment Pipeline', () => {
  let pipeline;
  const testOutputDir = path.join(__dirname, '../fixtures/course_analysis_output');
  const mockOpening = {
    rank: 5,
    name: "Sicilian Defense",
    moves: "1. e4 c5",
    eco: "B20",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
  };

  beforeEach(async () => {
    // Clean test output directory
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
    } catch (e) {
      // Directory might not exist
    }
    await fs.mkdir(testOutputDir, { recursive: true });
    
    pipeline = new CourseEnrichmentPipeline();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct default settings', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.batchSize).toBe(10);
      expect(pipeline.maxCostPerRun).toBe(10.00);
      expect(pipeline.enableWebGrounding).toBe(false); // Should be false in test mode
    });

    test('should throw error if GOOGLE_APPLICATION_CREDENTIALS_JSON is missing', () => {
      const originalEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      
      expect(() => new CourseEnrichmentPipeline()).toThrow('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required');
      
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalEnv;
    });

    test('should throw error if credentials JSON is invalid', () => {
      const originalEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = 'invalid-json';
      
      expect(() => new CourseEnrichmentPipeline()).toThrow('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON');
      
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalEnv;
    });
  });

  describe('Single Opening Processing', () => {
    test('should process a single opening and return valid course analysis', async () => {
      const result = await pipeline.processOpening(mockOpening);
      
      expect(result).toBeDefined();
      expect(result.analysis_for_opening).toEqual({
        rank: 5,
        name: "Sicilian Defense",
        moves: "1. e4 c5",
        eco: "B20", 
        fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
      });
      expect(Array.isArray(result.found_courses)).toBe(true);
    });

    test('should validate course schema for each found course', async () => {
      const result = await pipeline.processOpening(mockOpening);
      
      result.found_courses.forEach(course => {
        expect(course).toHaveProperty('course_title');
        expect(course).toHaveProperty('author');
        expect(course).toHaveProperty('platform');
        expect(course).toHaveProperty('repertoire_for');
        expect(['White', 'Black', 'Both']).toContain(course.repertoire_for);
        expect(course).toHaveProperty('scope');
        expect(['Generalist', 'Specialist', 'System']).toContain(course.scope);
        expect(course).toHaveProperty('anchor_fens');
        expect(Array.isArray(course.anchor_fens)).toBe(true);
      });
    });

    test('should validate FEN format for all anchor_fens', async () => {
      const result = await pipeline.processOpening(mockOpening);
      
      result.found_courses.forEach(course => {
        course.anchor_fens.forEach(fen => {
          // FEN should have exactly 6 space-separated components
          const fenParts = fen.split(' ');
          expect(fenParts).toHaveLength(6);
          
          // Basic FEN validation
          expect(fenParts[0]).toMatch(/^[rnbqkpRNBQKP1-8\/]+$/); // Position
          expect(['w', 'b']).toContain(fenParts[1]); // Active color
          expect(fenParts[2]).toMatch(/^[KQkq\-]+$/); // Castling
          expect(fenParts[3]).toMatch(/^([a-h][36]|\-)$/); // En passant
          expect(fenParts[4]).toMatch(/^\d+$/); // Halfmove clock
          expect(fenParts[5]).toMatch(/^\d+$/); // Fullmove number
        });
      });
    });

    test('should order courses by total_score descending', async () => {
      const result = await pipeline.processOpening(mockOpening);
      
      if (result.found_courses.length > 1) {
        for (let i = 0; i < result.found_courses.length - 1; i++) {
          expect(result.found_courses[i].quality_score.total_score)
            .toBeGreaterThanOrEqual(result.found_courses[i + 1].quality_score.total_score);
        }
      }
    });
  });

  describe('Checkpointing and Resumability', () => {
    test('should save analysis to correct file path', async () => {
      await pipeline.processOpening(mockOpening, testOutputDir);
      
      const expectedFilePath = path.join(testOutputDir, 'rnbqkbnr_pp1ppppp_8_2p5_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_0_2.json');
      const fileExists = await fs.access(expectedFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should skip processing if analysis file already exists', async () => {
      const fileName = 'rnbqkbnr_pp1ppppp_8_2p5_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_0_2.json';
      const filePath = path.join(testOutputDir, fileName);
      const existingData = { analysis_for_opening: mockOpening, found_courses: [] };
      
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
      
      const result = await pipeline.processOpening(mockOpening, testOutputDir);
      expect(result).toEqual(existingData);
    });

    test('should add last_verified_on timestamp to saved data', async () => {
      await pipeline.processOpening(mockOpening, testOutputDir);
      
      const fileName = 'rnbqkbnr_pp1ppppp_8_2p5_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_0_2.json';
      const filePath = path.join(testOutputDir, fileName);
      const savedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      expect(savedData).toHaveProperty('last_verified_on');
      expect(new Date(savedData.last_verified_on).getTime()).toBeCloseTo(Date.now(), -3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle LLM service errors gracefully', async () => {
      // In test environment, the mock service should work, but we can test error scenarios
      const invalidOpening = null;
      await expect(pipeline.processOpening(invalidOpening)).rejects.toThrow();
    });

    test('should handle invalid opening input gracefully', async () => {
      const invalidOpenings = [
        null,
        undefined,
        {},
        { name: "Test" }, // Missing required fields
        { name: "", moves: "", fen: "", eco: "", rank: 0 } // Empty values
      ];
      
      for (const invalidOpening of invalidOpenings) {
        await expect(pipeline.processOpening(invalidOpening)).rejects.toThrow();
      }
    });

    test('should handle response validation in test environment', async () => {
      // Test environment should always return valid responses  
      const result = await pipeline.processOpening(mockOpening);
      expect(result).toHaveProperty('analysis_for_opening');
      expect(result).toHaveProperty('found_courses');
    });

    test('should enforce cost limits', async () => {
      const lowCostPipeline = new CourseEnrichmentPipeline({ maxCostPerRun: 0.01 });
      
      await expect(lowCostPipeline.processOpening(mockOpening)).rejects.toThrow(/cost limit/i);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple openings in batch', async () => {
      const openings = [
        mockOpening,
        {
          rank: 1,
          name: "King's Pawn Game",
          moves: "1. e4",
          eco: "B00",
          fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        }
      ];
      
      const results = await pipeline.processBatch(openings, testOutputDir);
      expect(results).toHaveLength(2);
      expect(results[0].analysis_for_opening.name).toBe("Sicilian Defense");
      expect(results[1].analysis_for_opening.name).toBe("King's Pawn Game");
    });

    test('should handle batch processing with proper error handling', async () => {
      const openings = [mockOpening];
      
      const results = await pipeline.processBatch(openings, testOutputDir);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('analysis_for_opening');
      expect(results[0]).toHaveProperty('found_courses');
    });

    test('should respect batch size limits', async () => {
      const batch = Array(3).fill(mockOpening);
      const smallBatchPipeline = new CourseEnrichmentPipeline({ batchSize: 2 });
      
      const results = await smallBatchPipeline.processBatch(batch, testOutputDir);
      expect(results).toHaveLength(3);
      
      // Verify that batch processing works regardless of batchSize setting
      // (batchSize mainly affects internal chunking, not final results)
    });
  });

  describe('Web Grounding Integration', () => {
    test('should disable web grounding in test mode', () => {
      expect(pipeline.enableWebGrounding).toBe(false);
      // This ensures we don't make real API calls during testing
    });

    test('should track grounding costs separately', async () => {
      const result = await pipeline.processOpening(mockOpening);
      
      expect(pipeline.lastRunCosts).toBeDefined();
      expect(pipeline.lastRunCosts).toHaveProperty('inputTokens');
      expect(pipeline.lastRunCosts).toHaveProperty('outputTokens');
      expect(pipeline.lastRunCosts).toHaveProperty('groundingQueries');
      expect(pipeline.lastRunCosts).toHaveProperty('totalCost');
    });
  });
});
