/**
 * Unit Tests for PathResolver
 * Tests environment-aware path resolution for both local and Vercel environments.
 */

const path = require('path');

describe('PathResolver - local environment', () => {
  let resolver;

  beforeAll(() => {
    delete process.env.VERCEL;
    jest.resetModules();
    resolver = require('../../packages/api/src/utils/path-resolver');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
  });

  describe('getDataPath()', () => {
    const mockExisting = (...existing) => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => existing.includes(candidate));
    };

    test('returns correct base path when running from project root', () => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/chess-opening-explorer');
      mockExisting('/home/user/chess-opening-explorer/api/data');
      const result = resolver.getDataPath();
      expect(result).toBe('/home/user/chess-opening-explorer/api/data');
    });

    test('appends subPath when provided', () => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/chess-opening-explorer');
      mockExisting('/home/user/chess-opening-explorer/api/data');
      const result = resolver.getDataPath('eco');
      expect(result).toBe('/home/user/chess-opening-explorer/api/data/eco');
    });

    test('returns workspace-relative path when not running from root', () => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/chess-opening-explorer/packages/api');
      mockExisting('/home/user/chess-opening-explorer/api/data');
      const result = resolver.getDataPath();
      // Resolves up two levels from packages/api to the repo root
      expect(result).toContain('api/data');
      expect(result).not.toBe('/home/user/chess-opening-explorer/packages/api/api/data');
    });

    test('falls back to the resolver file repo root in a git worktree checkout', () => {
      // Worktree checkouts are not named chess-opening-explorer and have no
      // cwd-relative api/data — the __dirname-anchored candidate must win.
      jest.spyOn(process, 'cwd').mockReturnValue('/somewhere/else/worktree-x');
      const fs = require('fs');
      const anchored = path.resolve(
        __dirname,
        '..',
        '..',
        'packages',
        'api',
        'src',
        'utils',
        '..',
        '..',
        '..',
        '..',
        'api',
        'data'
      );
      jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => candidate === anchored);
      expect(resolver.getDataPath()).toBe(anchored);
    });
  });

  describe('convenience path methods', () => {
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/chess-opening-explorer');
    });

    test('getECODataPath() returns path ending with /eco', () => {
      expect(resolver.getECODataPath()).toMatch(/[/\\]eco$/);
    });

    test('getVideosDataPath() returns path ending with /Videos', () => {
      expect(resolver.getVideosDataPath()).toMatch(/[/\\]Videos$/);
    });

    test('getPopularityStatsPath() returns path ending with popularity_stats.json', () => {
      expect(resolver.getPopularityStatsPath()).toMatch(/popularity_stats\.json$/);
    });

    test('getMostPopularOpeningsPath() returns path ending with most_popular_openings.json', () => {
      expect(resolver.getMostPopularOpeningsPath()).toMatch(/most_popular_openings\.json$/);
    });
  });

  describe('exists()', () => {
    test('returns true when fs.existsSync returns true', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      expect(resolver.exists('/some/path')).toBe(true);
    });

    test('returns false when fs.existsSync returns false', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(resolver.exists('/some/missing/path')).toBe(false);
    });
  });

  describe('getAPIDataPath()', () => {
    test('returns a path containing the filename', () => {
      const result = resolver.getAPIDataPath('openings.json');
      expect(result).toMatch(/openings\.json$/);
    });

    test('returns a path containing the data directory', () => {
      const result = resolver.getAPIDataPath('openings.json');
      expect(result).toContain('data');
    });
  });
});

describe('PathResolver - Vercel environment', () => {
  let resolver;
  let fs;

  beforeAll(() => {
    process.env.VERCEL = '1';
    jest.resetModules();
    jest.spyOn(process, 'cwd').mockReturnValue('/var/task');
    fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => {
      if (typeof candidate !== 'string') return false;
      return candidate.startsWith('/var/task/api/data');
    });
    resolver = require('../../packages/api/src/utils/path-resolver');
  });

  afterAll(() => {
    delete process.env.VERCEL;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('getDataPath() uses Vercel-style cwd path', () => {
    expect(resolver.getDataPath()).toBe('/var/task/api/data');
  });

  test('getDataPath(subPath) appends subPath in Vercel mode', () => {
    expect(resolver.getDataPath('eco')).toBe('/var/task/api/data/eco');
  });

  test('getAPIDataPath() uses Vercel cwd-relative path', () => {
    const result = resolver.getAPIDataPath('test.json');
    expect(result).toBe('/var/task/api/data/test.json');
  });
});
