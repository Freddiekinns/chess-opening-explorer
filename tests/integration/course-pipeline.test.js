/**
 * Integration test for PRD-F03 Course Recommendation Data Pipeline
 * Tests the complete course pipeline from service to API endpoints
 */

const request = require('supertest');
const express = require('express');
const createCourseRoutes = require('../../packages/api/src/routes/courses');
const CourseService = require('../../packages/api/src/services/course-service');
const fs = require('fs');
const path = require('path');

// Mock fs for controlled testing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readFile: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('PRD-F03 Course Pipeline Integration', () => {
  let app;
  let courseService;

  const mockCourseData = {
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": [
      {
        course_title: "King's Pawn Opening Masterclass",
        author: "GM Magnus Carlsen",
        platform: "ChessMaster Academy",
        repertoire_for: "White",
        publication_year: 2023,
        estimated_level: "Intermediate",
        scope: "Specialist",
        source_url: "https://chessmaster.com/karpov-kings-pawn",
        vetting_notes: "Comprehensive analysis of 1.e4 opening principles",
        last_verified_on: "2025-07-18",
        quality_score: {
          authority_score: 5,
          social_proof_score: 3,
          buzz_score: 2,
          total_score: 10
        },
        anchor_fens: ["rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup file system mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));
    
    // Create real service instance (will use mocked fs)
    courseService = new CourseService();
    
    // Setup Express app with real service
    app = express();
    app.use(express.json());
    app.use('/api/courses', createCourseRoutes(courseService));
  });

  describe('Complete Course Lookup Workflow', () => {
    test('should return courses for encoded FEN through full pipeline', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      
      const response = await request(app)
        .get(`/api/courses/${fen}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].course_title).toBe("King's Pawn Opening Masterclass");
      expect(response.body.courses[0].author).toBe("GM Magnus Carlsen");
      expect(response.body.count).toBe(1);
    });

    test('should return statistics through full pipeline', async () => {
      const response = await request(app)
        .get('/api/courses/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics.totalFens).toBe(1);
      expect(response.body.statistics.totalCourses).toBe(1);
      expect(response.body.statistics.platforms).toContain('ChessMaster Academy');
    });

    test('should return all courses through full pipeline', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });

    test('should handle non-existent FEN gracefully', async () => {
      const nonExistentFen = "rnbqkbnr%2Fpppp1ppp%2F8%2F4p3%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20w%20KQkq%20e6%200%202";
      
      const response = await request(app)
        .get(`/api/courses/${nonExistentFen}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.courses).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });
  });

  describe('Data Quality and Schema Validation', () => {
    test('should validate course schema compliance', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      
      const response = await request(app)
        .get(`/api/courses/${fen}`)
        .expect(200);

      const course = response.body.courses[0];
      
      // Required fields
      expect(course.course_title).toBeDefined();
      expect(course.author).toBeDefined();
      expect(course.platform).toBeDefined();
      expect(course.repertoire_for).toMatch(/^(White|Black|Both)$/);
      expect(course.estimated_level).toMatch(/^(Beginner|Intermediate|Advanced|Master)$/);
      expect(course.scope).toMatch(/^(Generalist|Specialist|System)$/);
      expect(course.source_url).toMatch(/^https?:\/\//);
      expect(course.quality_score).toBeDefined();
      expect(course.quality_score.total_score).toBeGreaterThan(4);
      expect(course.anchor_fens).toBeInstanceOf(Array);
      expect(course.last_verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }, 10000); // Increased timeout to 10 seconds

    test('should maintain data consistency across endpoints', async () => {
      // Get course via FEN endpoint
      const fenResponse = await request(app)
        .get('/api/courses/rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201')
        .expect(200);

      // Get same course via all courses endpoint
      const allResponse = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(fenResponse.body.courses[0]).toEqual(allResponse.body.courses[0]);
    });
  });

  describe('Performance Requirements', () => {
    test('should respond within performance targets', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/courses/rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201')
        .expect(200);
        
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(200); // <200ms requirement
    });

    test('should cache data efficiently', async () => {
      // First call
      await request(app).get('/api/courses/stats').expect(200);
      
      // Second call should use cached data
      await request(app).get('/api/courses/stats').expect(200);
      
      // fs.readFileSync should only be called once due to caching
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing course data file', async () => {
      fs.existsSync.mockReturnValue(false);
      const newService = new CourseService();
      const newApp = express();
      newApp.use('/api/courses', createCourseRoutes(newService));

      const response = await request(newApp)
        .get('/api/courses')
        .expect(200);

      expect(response.body.courses).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should handle corrupted course data file', async () => {
      fs.readFileSync.mockReturnValue('invalid json');
      const newService = new CourseService();
      const newApp = express();
      newApp.use('/api/courses', createCourseRoutes(newService));

      const response = await request(newApp)
        .get('/api/courses')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
