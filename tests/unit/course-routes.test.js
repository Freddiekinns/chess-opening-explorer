/**
 * Unit Tests for Course API Routes
 * Tests course endpoint functionality, validation, and error handling
 */

const request = require('supertest');
const express = require('express');
const createCourseRoutes = require('../../packages/api/src/routes/courses.routes');

describe('Course API Routes', () => {
  let app;
  let mockCourseService;

  const mockCourses = [
    {
      course_title: "King's Pawn Opening Masterclass",
      author: "GM Magnus Carlsen",
      platform: "ChessGym",
      repertoire_for: "White",
      publication_year: 2023,
      estimated_level: "Intermediate",
      scope: "Specialist",
      source_url: "https://chessgym.com/kings-pawn",
      vetting_notes: "Comprehensive coverage of 1.e4 systems",
      quality_score: {
        authority_score: 5,
        social_proof_score: 3,
        buzz_score: 2,
        total_score: 10
      },
      anchor_fens: ["rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"]
    }
  ];

  beforeEach(() => {
    // Create mock service instance
    mockCourseService = {
      getCoursesByFen: jest.fn(),
      getAllCourses: jest.fn(),
      getStatistics: jest.fn(),
      loadCourseData: jest.fn()
    };

    // Setup Express app with course routes and injected mock service
    app = express();
    app.use(express.json());
    app.use('/api/courses', createCourseRoutes(mockCourseService));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/courses/:fen', () => {
    test('should return courses for valid FEN', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      const decodedFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      mockCourseService.getCoursesByFen.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get(`/api/courses/${fen}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        fen: decodedFen,
        courses: mockCourses,
        count: 1
      });

      expect(mockCourseService.getCoursesByFen).toHaveBeenCalledWith(decodedFen);
    });

    test('should return empty array for FEN with no courses', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F8%2F8%2FPPPPPPPP%2FRNBQKBNR%20w%20KQkq%20-%200%201";
      const decodedFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      mockCourseService.getCoursesByFen.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/courses/${fen}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        fen: decodedFen,
        courses: [],
        count: 0
      });
    });

    test('should handle URL encoded FEN properly', async () => {
      const encodedFen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      const decodedFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      mockCourseService.getCoursesByFen.mockResolvedValue(mockCourses);

      await request(app)
        .get(`/api/courses/${encodedFen}`)
        .expect(200);

      expect(mockCourseService.getCoursesByFen).toHaveBeenCalledWith(decodedFen);
    });

    test('should validate FEN format', async () => {
      const invalidFen = "invalid-fen-string";

      const response = await request(app)
        .get(`/api/courses/${invalidFen}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid FEN format',
        message: 'FEN must contain 8 ranks separated by forward slashes'
      });

      expect(mockCourseService.getCoursesByFen).not.toHaveBeenCalled();
    });

    test('should handle missing FEN parameter', async () => {
      // Note: /api/courses/ hits the GET / route, not missing parameter
      mockCourseService.getAllCourses.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/api/courses/')
        .expect(200); // This should return all courses, not 404

      expect(mockCourseService.getAllCourses).toHaveBeenCalled();
      expect(mockCourseService.getCoursesByFen).not.toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      mockCourseService.getCoursesByFen.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/courses/${fen}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch courses for FEN'
      });
    }, 1000); // Add 1 second timeout

    test('should complete request in under 200ms', async () => {
      const fen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201";
      mockCourseService.getCoursesByFen.mockResolvedValue(mockCourses);

      const startTime = Date.now();
      await request(app)
        .get(`/api/courses/${fen}`)
        .expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('GET /api/courses', () => {
    test('should return all courses', async () => {
      mockCourseService.getAllCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        courses: mockCourses,
        count: 1
      });
    });

    test('should handle empty course database', async () => {
      mockCourseService.getAllCourses.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        courses: [],
        count: 0
      });
    });

    test('should handle service errors gracefully', async () => {
      mockCourseService.getAllCourses.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get('/api/courses')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch all courses'
      });
    });
  });

  describe('GET /api/courses/stats', () => {
    test('should return course statistics', async () => {
      const mockStats = {
        totalFens: 100,
        totalCourses: 250,
        averageCoursesPerFen: 2.5,
        platforms: ['Chess.com', 'Lichess', 'ChessGym']
      };
      mockCourseService.getStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/courses/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        statistics: mockStats
      });
    });

    test('should handle empty statistics', async () => {
      const emptyStats = {
        totalFens: 0,
        totalCourses: 0,
        averageCoursesPerFen: 0,
        platforms: []
      };
      mockCourseService.getStatistics.mockResolvedValue(emptyStats);

      const response = await request(app)
        .get('/api/courses/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        statistics: emptyStats
      });
    });

    test('should handle service errors gracefully', async () => {
      mockCourseService.getStatistics.mockRejectedValue(new Error('Statistics calculation failed'));

      const response = await request(app)
        .get('/api/courses/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch course statistics'
      });
    });
  });

  describe('input sanitization', () => {
    test('should sanitize malicious FEN input', async () => {
      const maliciousFen = "rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20e3%200%201%3Cscript%3Ealert('xss')%3C%2Fscript%3E";
      
      const response = await request(app)
        .get(`/api/courses/${maliciousFen}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid FEN format');
      expect(mockCourseService.getCoursesByFen).not.toHaveBeenCalled();
    });

    test('should handle oversized FEN input', async () => {
      const oversizedFen = 'a'.repeat(1000);
      
      const response = await request(app)
        .get(`/api/courses/${oversizedFen}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid FEN format');
      expect(mockCourseService.getCoursesByFen).not.toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    test('should reject POST requests to course endpoints', async () => {
      await request(app)
        .post('/api/courses/some-fen')
        .expect(404);
    });

    test('should reject PUT requests to course endpoints', async () => {
      await request(app)
        .put('/api/courses/some-fen')
        .expect(404);
    });

    test('should reject DELETE requests to course endpoints', async () => {
      await request(app)
        .delete('/api/courses/some-fen')
        .expect(404);
    });
  });
});
