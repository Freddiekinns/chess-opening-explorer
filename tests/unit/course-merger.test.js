/**
 * Unit Tests for Course Merger
 * Tests merging auto-discovered entries while preserving manual curation
 */

const {
  loadExistingCourses,
  mergeDiscoveries,
  writeCourses,
} = require('../../tools/course-discovery/lib/course-merger');
const fs = require('fs');

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const FRENCH_FEN = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const SICILIAN_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';

const manualEntry = {
  course_title: 'French Defense Masterclass',
  author: 'GM Anish Giri',
  platform: 'Chessable',
  quality_score: { total_score: 24 },
};

const autoEntry = {
  course_title: 'French Opening Study - Main Line',
  author: 'Fins',
  platform: 'Lichess',
  source_url: 'https://lichess.org/study/abc123/ch001',
  anchor_fens: [FRENCH_FEN],
  auto_discovered: true,
  discovered_at: '2026-02-10T00:00:00.000Z',
};

const autoEntry2 = {
  course_title: 'French Study - Winawer',
  author: 'Fins',
  platform: 'Lichess',
  source_url: 'https://lichess.org/study/abc123/ch002',
  anchor_fens: [FRENCH_FEN],
  auto_discovered: true,
  discovered_at: '2026-02-10T00:00:00.000Z',
};

describe('loadExistingCourses', () => {
  test('should load and parse courses.json', () => {
    const mockData = { [FRENCH_FEN]: [manualEntry] };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const result = loadExistingCourses('/path/to/courses.json');
    expect(result).toEqual(mockData);
  });

  test('should return empty object when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = loadExistingCourses('/path/to/courses.json');
    expect(result).toEqual({});
  });
});

describe('mergeDiscoveries', () => {
  test('should preserve manual entries after merge', () => {
    const existing = { [FRENCH_FEN]: [manualEntry] };
    const discovered = { [FRENCH_FEN]: [autoEntry] };

    const merged = mergeDiscoveries(existing, discovered);

    expect(merged[FRENCH_FEN]).toHaveLength(2);
    expect(merged[FRENCH_FEN][0]).toEqual(manualEntry);
    expect(merged[FRENCH_FEN][1]).toEqual(autoEntry);
  });

  test('should replace old auto-discovered entries on re-run', () => {
    const existing = {
      [FRENCH_FEN]: [manualEntry, autoEntry],
    };
    const newAutoEntry = {
      ...autoEntry,
      course_title: 'Updated French Study',
      discovered_at: '2026-02-11T00:00:00.000Z',
    };
    const discovered = { [FRENCH_FEN]: [newAutoEntry] };

    const merged = mergeDiscoveries(existing, discovered);

    expect(merged[FRENCH_FEN]).toHaveLength(2);
    expect(merged[FRENCH_FEN][0]).toEqual(manualEntry);
    expect(merged[FRENCH_FEN][1].course_title).toBe('Updated French Study');
  });

  test('should add new FEN keys alongside existing', () => {
    const existing = { [FRENCH_FEN]: [manualEntry] };
    const sicilianAuto = {
      ...autoEntry,
      course_title: 'Sicilian Study',
      anchor_fens: [SICILIAN_FEN],
    };
    const discovered = { [SICILIAN_FEN]: [sicilianAuto] };

    const merged = mergeDiscoveries(existing, discovered);

    expect(Object.keys(merged)).toHaveLength(2);
    expect(merged[FRENCH_FEN]).toHaveLength(1);
    expect(merged[SICILIAN_FEN]).toHaveLength(1);
  });

  test('should handle empty existing data', () => {
    const existing = {};
    const discovered = { [FRENCH_FEN]: [autoEntry] };

    const merged = mergeDiscoveries(existing, discovered);

    expect(merged[FRENCH_FEN]).toHaveLength(1);
    expect(merged[FRENCH_FEN][0]).toEqual(autoEntry);
  });

  test('should handle empty discovered data', () => {
    const existing = { [FRENCH_FEN]: [manualEntry] };
    const discovered = {};

    const merged = mergeDiscoveries(existing, discovered);

    expect(merged[FRENCH_FEN]).toHaveLength(1);
    expect(merged[FRENCH_FEN][0]).toEqual(manualEntry);
  });

  test('should clear all auto entries before fresh insert', () => {
    const existing = {
      [FRENCH_FEN]: [manualEntry, autoEntry, autoEntry2],
    };
    const newAutoEntry = {
      ...autoEntry,
      course_title: 'Only New Entry',
      discovered_at: '2026-02-11T00:00:00.000Z',
    };
    const discovered = { [FRENCH_FEN]: [newAutoEntry] };

    const merged = mergeDiscoveries(existing, discovered);

    const autoEntries = merged[FRENCH_FEN].filter((c) => c.auto_discovered === true);
    expect(autoEntries).toHaveLength(1);
    expect(autoEntries[0].course_title).toBe('Only New Entry');
  });

  test('should remove FEN key if only auto entries existed and none discovered', () => {
    const existing = {
      [FRENCH_FEN]: [autoEntry, autoEntry2],
    };
    const discovered = {};

    const merged = mergeDiscoveries(existing, discovered);

    // FEN key should be gone since it only had auto entries
    expect(merged[FRENCH_FEN]).toBeUndefined();
  });
});

describe('writeCourses', () => {
  test('should write JSON with 2-space indentation', () => {
    const data = { [FRENCH_FEN]: [manualEntry] };
    fs.existsSync.mockReturnValue(true);

    writeCourses('/path/to/courses.json', data);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/path/to/courses.json',
      JSON.stringify(data, null, 2),
      'utf8'
    );
  });

  test('should create directory if it does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    writeCourses('/path/to/courses.json', {});

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });
});
