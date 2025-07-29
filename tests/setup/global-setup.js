/**
 * Global Test Setup Configuration
 * 
 * This file configures the testing environment for all tests
 * following the TDD principles from the coding instructions.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout (keep tests fast)
jest.setTimeout(5000);

// Setup global mocks for external dependencies
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            analysis_for_opening: { test: 'data' },
            found_courses: []
          })
        }
      })
    })
  }))
}));

// Mock YouTube API to prevent real API calls
jest.mock('googleapis', () => ({
  google: {
    youtube: jest.fn().mockReturnValue({
      search: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: { videoId: 'test-video-id' },
                snippet: {
                  title: 'Test Chess Video',
                  channelTitle: 'Test Channel',
                  publishedAt: '2024-01-01T00:00:00Z'
                }
              }
            ]
          }
        })
      }
    })
  }
}));

// Mock file system operations for consistent testing
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    stat: jest.fn()
  }
}));

// Global test utilities
global.testUtils = {
  // Create mock opening data
  createMockOpening: (overrides = {}) => ({
    rank: 1,
    name: 'Test Opening',
    moves: '1. e4',
    eco: 'B00',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    ...overrides
  }),

  // Create mock video data
  createMockVideo: (overrides = {}) => ({
    id: 'test-video-id',
    title: 'Test Chess Video',
    channel: 'Test Channel',
    publishedAt: '2024-01-01T00:00:00Z',
    match_score: 0.85,
    ...overrides
  }),

  // Clean up test database/files
  cleanupTest: async () => {
    // Reset all mocks
    jest.clearAllMocks();
  }
};

// Global setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  await global.testUtils.cleanupTest();
});

// Suppress console.log in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Keep warnings
  error: console.error // Keep errors
};
