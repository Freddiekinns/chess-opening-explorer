/**
 * Unit Tests for CourseService
 * Tests course data loading, FEN lookup, and error handling
 */

const fs = require('fs');
const path = require('path');
const CourseService = require('../../packages/api/src/services/course-service');

// Mock fs module for fast, deterministic tests
jest.mock('fs');

describe('CourseService', () => {
  let courseService;
  const mockCourseData = {
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": [
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
    ],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2": [
      {
        course_title: "Open Game Fundamentals",
        author: "IM Anna Muzychuk", 
        platform: "Chess.com",
        repertoire_for: "Both",
        publication_year: 2024,
        estimated_level: "Beginner",
        scope: "Generalist",
        source_url: "https://chess.com/learn/open-games",
        vetting_notes: "Excellent for beginners learning open positions",
        quality_score: {
          authority_score: 4,
          social_proof_score: 3,
          buzz_score: 1,
          total_score: 8
        },
        anchor_fens: ["rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    courseService = new CourseService();
  });

  describe('constructor', () => {
    test('should initialize with correct file path', () => {
      expect(courseService.courseDataPath).toContain('courses.json');
    });

    test('should handle different working directories', () => {
      const service = new CourseService();
      expect(service.courseDataPath).toBeDefined();
      expect(typeof service.courseDataPath).toBe('string');
    });
  });

  describe('loadCourseData', () => {
    test('should load course data from file successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));

      const result = await courseService.loadCourseData();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        courseService.courseDataPath, 
        'utf8'
      );
      expect(result).toEqual(mockCourseData);
    });

    test('should return empty object when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await courseService.loadCourseData();

      expect(result).toEqual({});
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should throw error for invalid JSON', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      await expect(courseService.loadCourseData()).rejects.toThrow('Failed to load course data');
    });

    test('should throw error for file read failure', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(courseService.loadCourseData()).rejects.toThrow('Failed to load course data');
    });
  });

  describe('getCoursesByFen', () => {
    beforeEach(async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));
      await courseService.loadCourseData();
    });

    test('should return courses for valid FEN', async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      
      const courses = await courseService.getCoursesByFen(fen);

      expect(courses).toHaveLength(1);
      expect(courses[0].course_title).toBe("King's Pawn Opening Masterclass");
      expect(courses[0].author).toBe("GM Magnus Carlsen");
    });

    test('should return empty array for FEN with no courses', async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      
      const courses = await courseService.getCoursesByFen(fen);

      expect(courses).toEqual([]);
    });

    test('should handle null/undefined FEN', async () => {
      const coursesNull = await courseService.getCoursesByFen(null);
      const coursesUndefined = await courseService.getCoursesByFen(undefined);

      expect(coursesNull).toEqual([]);
      expect(coursesUndefined).toEqual([]);
    });

    test('should handle empty string FEN', async () => {
      const courses = await courseService.getCoursesByFen('');

      expect(courses).toEqual([]);
    });

    test('should validate course quality scores', async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      
      const courses = await courseService.getCoursesByFen(fen);

      expect(courses[0].quality_score.total_score).toBeGreaterThan(4);
      expect(courses[0].quality_score.authority_score).toBeGreaterThan(0);
      expect(courses[0].quality_score.authority_score).toBeLessThanOrEqual(5);
    });
  });

  describe('getAllCourses', () => {
    test('should return all courses from all FENs', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));

      const allCourses = await courseService.getAllCourses();

      expect(allCourses).toHaveLength(2);
      expect(allCourses.map(c => c.course_title)).toContain("King's Pawn Opening Masterclass");
      expect(allCourses.map(c => c.course_title)).toContain("Open Game Fundamentals");
    });

    test('should return empty array when no course data', async () => {
      fs.existsSync.mockReturnValue(false);

      const allCourses = await courseService.getAllCourses();

      expect(allCourses).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));
      await courseService.loadCourseData();
    });

    test('should return correct statistics', async () => {
      const stats = await courseService.getStatistics();

      expect(stats.totalFens).toBe(2);
      expect(stats.totalCourses).toBe(2);
      expect(stats.averageCoursesPerFen).toBe(1);
      expect(stats.platforms).toEqual(['ChessGym', 'Chess.com']);
    });

    test('should handle empty data', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');
      const emptyService = new CourseService();
      await emptyService.loadCourseData();

      const stats = await emptyService.getStatistics();

      expect(stats.totalFens).toBe(0);
      expect(stats.totalCourses).toBe(0);
      expect(stats.averageCoursesPerFen).toBe(0);
      expect(stats.platforms).toEqual([]);
    });
  });

  describe('performance requirements', () => {
    test('should complete FEN lookup in under 100ms', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));
      await courseService.loadCourseData();

      const startTime = Date.now();
      await courseService.getCoursesByFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should cache course data for subsequent calls', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCourseData));

      await courseService.loadCourseData();
      await courseService.loadCourseData(); // Second call

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    test('should handle corrupted course data gracefully', async () => {
      const corruptedData = {
        "valid_fen": [{ missing_required_fields: true }]
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(corruptedData));

      const courses = await courseService.getCoursesByFen("valid_fen");
      
      expect(courses).toEqual([{ missing_required_fields: true }]);
    });

    test('should handle filesystem errors gracefully', async () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      await expect(courseService.loadCourseData()).rejects.toThrow('Failed to load course data');
    });
  });
});
