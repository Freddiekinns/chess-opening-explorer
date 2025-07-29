/**
 * Course Discovery Integration Tests
 * 
 * Tests the complete course discovery workflow:
 * - LLM enrichment pipeline
 * - Course data validation
 * - File system integration
 * - Error handling across services
 */

const fs = require('fs').promises;
const path = require('path');
const CourseEnrichmentPipeline = require('../../tools/production/enrich_course_data');

// Mock external APIs but allow internal service communication
jest.mock('@google-cloud/vertexai');
jest.mock('googleapis');

describe('Course Discovery Integration', () => {
  let pipeline;
  let testOutputDir;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    testOutputDir = path.join(__dirname, '../fixtures/integration-test-output');
    
    // Ensure test directory exists
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  beforeEach(() => {
    // Create fresh pipeline instance
    pipeline = new CourseEnrichmentPipeline({
      maxCostPerRun: 1.00, // Low cost limit for testing
      batchSize: 2 // Small batch for testing
    });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
      await fs.mkdir(testOutputDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Course Enrichment', () => {
    test('should process opening and generate course recommendations', async () => {
      const testOpening = {
        rank: 1,
        name: 'French Defense',
        moves: '1. e4 e6',
        eco: 'C00',
        fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      };

      // Process the opening
      const result = await pipeline.processOpening(testOpening, testOutputDir);

      // Verify structure
      expect(result).toHaveProperty('analysis_for_opening');
      expect(result).toHaveProperty('found_courses');
      expect(result).toHaveProperty('last_verified_on');

      // Verify analysis quality
      expect(result.analysis_for_opening).toHaveProperty('name', 'French Defense');
      expect(result.analysis_for_opening).toHaveProperty('eco', 'C00');
      expect(result.analysis_for_opening).toHaveProperty('moves', '1. e4 e6');

      // Verify courses structure
      expect(Array.isArray(result.found_courses)).toBe(true);
      
      if (result.found_courses.length > 0) {
        const course = result.found_courses[0];
        expect(course).toHaveProperty('title');
        expect(course).toHaveProperty('author');
        expect(course).toHaveProperty('skill_level');
        expect(course).toHaveProperty('relevance_score');
        expect(course.relevance_score).toBeGreaterThanOrEqual(0.7);
      }
    });

    test('should persist results to file system', async () => {
      const testOpening = {
        rank: 1,
        name: 'Sicilian Defense',
        moves: '1. e4 c5',
        eco: 'B20',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      };

      // Process opening
      await pipeline.processOpening(testOpening, testOutputDir);

      // Verify file was created
      const fileName = 'rnbqkbnr_pp1ppppp_8_2p5_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_0_2.json';
      const filePath = path.join(testOutputDir, fileName);
      
      const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      expect(data).toHaveProperty('analysis_for_opening');
      expect(data).toHaveProperty('found_courses');
      expect(data).toHaveProperty('last_verified_on');
      
      // Verify timestamp is recent
      const timestamp = new Date(data.last_verified_on);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    test('should handle batch processing correctly', async () => {
      const testOpenings = [
        global.testUtils.createMockOpening({ 
          name: 'Opening 1', 
          eco: 'A01',
          fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1'
        }),
        global.testUtils.createMockOpening({ 
          name: 'Opening 2', 
          eco: 'A02',
          fen: 'rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1'
        }),
        global.testUtils.createMockOpening({ 
          name: 'Opening 3', 
          eco: 'A03',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPBPPP/RNBQK1NR b KQkq - 1 1'
        })
      ];

      // Process batch
      const results = await pipeline.processBatch(testOpenings, testOutputDir);

      // Verify all processed
      expect(results).toHaveLength(3);
      expect(results.every(r => r.analysis_for_opening && r.found_courses)).toBe(true);

      // Verify files created
      const files = await fs.readdir(testOutputDir);
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(3);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle invalid opening data gracefully', async () => {
      const invalidOpenings = [
        null,
        undefined,
        {},
        { name: 'Incomplete' }, // Missing required fields
        { name: '', moves: '', fen: '', eco: '' } // Empty fields
      ];

      for (const invalidOpening of invalidOpenings) {
        await expect(pipeline.processOpening(invalidOpening, testOutputDir))
          .rejects.toThrow();
      }

      // Should not create any files for invalid data
      const files = await fs.readdir(testOutputDir);
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(0);
    });

    test('should handle file system errors', async () => {
      const testOpening = global.testUtils.createMockOpening();
      const invalidPath = '/invalid/path/that/does/not/exist';

      await expect(pipeline.processOpening(testOpening, invalidPath))
        .rejects.toThrow();
    });

    test('should respect cost limits', async () => {
      const lowCostPipeline = new CourseEnrichmentPipeline({ 
        maxCostPerRun: 0.001 // Very low limit
      });
      
      const testOpening = global.testUtils.createMockOpening();

      await expect(lowCostPipeline.processOpening(testOpening, testOutputDir))
        .rejects.toThrow(/cost limit/i);
    });

    test('should handle partial batch failures', async () => {
      const testOpenings = [
        global.testUtils.createMockOpening({ name: 'Valid Opening 1' }),
        null, // This will cause an error
        global.testUtils.createMockOpening({ name: 'Valid Opening 2' })
      ];

      // Should handle mixed success/failure
      const results = await pipeline.processBatch(testOpenings, testOutputDir, { 
        continueOnError: true 
      });

      // Should have results for valid openings and errors for invalid ones
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('analysis_for_opening');
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toHaveProperty('analysis_for_opening');
    });
  });

  describe('Data Quality and Validation', () => {
    test('should validate course data quality', async () => {
      const testOpening = global.testUtils.createMockOpening({
        name: 'Caro-Kann Defense',
        moves: '1. e4 c6',
        eco: 'B10'
      });

      const result = await pipeline.processOpening(testOpening, testOutputDir);

      // Verify course quality standards
      if (result.found_courses.length > 0) {
        result.found_courses.forEach(course => {
          // Required fields
          expect(course).toHaveProperty('title');
          expect(course).toHaveProperty('author');
          expect(course).toHaveProperty('skill_level');
          expect(course).toHaveProperty('relevance_score');

          // Quality standards
          expect(course.title).toBeTruthy();
          expect(course.title.length).toBeGreaterThan(5);
          expect(course.author).toBeTruthy();
          expect(course.relevance_score).toBeGreaterThanOrEqual(0.7);
          expect(['beginner', 'intermediate', 'advanced']).toContain(course.skill_level);
        });
      }
    });

    test('should generate consistent FEN-based filenames', async () => {
      const testOpening = global.testUtils.createMockOpening();
      
      // Process same opening twice
      await pipeline.processOpening(testOpening, testOutputDir);
      await pipeline.processOpening(testOpening, testOutputDir);

      // Should create only one file (second should update the first)
      const files = await fs.readdir(testOutputDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      expect(jsonFiles).toHaveLength(1);

      // Filename should be based on FEN
      const expectedFileName = testOpening.fen
        .replace(/\s+/g, '_')
        .replace(/\//g, '_')
        .replace(/-/g, '_') + '.json';
      expect(jsonFiles[0]).toBe(expectedFileName);
    });
  });
});
