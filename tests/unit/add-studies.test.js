/**
 * Unit Tests for Add Studies Tool
 * Tests input parsing, deduplication, study ID extraction, and cache-driven
 * index building (study matching v2).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  parseInputText,
  extractStudyId,
  StateManager,
  buildIndexFromCache,
} = require('../../tools/course-discovery/add-studies');
const { saveStudy } = require('../../tools/course-discovery/lib/study-cache');

describe('parseInputText', () => {
  test('should parse title + URL pairs', () => {
    const content = [
      'French Defense Study',
      'https://lichess.org/study/abc123',
      'Sicilian Defense',
      'https://lichess.org/study/def456',
    ].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ displayTitle: 'French Defense Study', studyId: 'abc123' });
    expect(result[1]).toEqual({ displayTitle: 'Sicilian Defense', studyId: 'def456' });
  });

  test('should deduplicate study IDs', () => {
    const content = [
      'Study A',
      'https://lichess.org/study/abc123',
      'Study B (duplicate)',
      'https://lichess.org/study/abc123',
      'Study C',
      'https://lichess.org/study/def456',
    ].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(2);
    expect(result[0].studyId).toBe('abc123');
    expect(result[0].displayTitle).toBe('Study A');
    expect(result[1].studyId).toBe('def456');
  });

  test('should skip comment lines', () => {
    const content = [
      '# This is a comment',
      'French Defense',
      'https://lichess.org/study/abc123',
      '# Another comment',
      'Sicilian',
      'https://lichess.org/study/def456',
    ].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(2);
  });

  test('should handle empty lines', () => {
    const content = ['', 'French Defense', '', 'https://lichess.org/study/abc123', ''].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(1);
    expect(result[0].displayTitle).toBe('French Defense');
  });

  test('should handle URLs without preceding title', () => {
    const content = 'https://lichess.org/study/abc123\nhttps://lichess.org/study/def456';
    const result = parseInputText(content);
    expect(result).toHaveLength(2);
    expect(result[0].displayTitle).toBe('');
    expect(result[1].displayTitle).toBe('');
  });

  test('should handle emoji in titles', () => {
    const content = ['🏰 Caro-Kann Defense🔥', 'https://lichess.org/study/jtlLwUvh'].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(1);
    expect(result[0].displayTitle).toBe('🏰 Caro-Kann Defense🔥');
    expect(result[0].studyId).toBe('jtlLwUvh');
  });

  test('should return empty array for empty content', () => {
    expect(parseInputText('')).toEqual([]);
  });

  test('should return empty array for only comments', () => {
    expect(parseInputText('# comment 1\n# comment 2')).toEqual([]);
  });

  test('should handle consecutive titles (only last used)', () => {
    const content = ['Title A', 'Title B', 'https://lichess.org/study/abc123'].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(1);
    // Title B is the last non-URL line before the URL
    expect(result[0].displayTitle).toBe('Title B');
  });
});

describe('extractStudyId', () => {
  test('should extract ID from standard URL', () => {
    expect(extractStudyId('https://lichess.org/study/abc123')).toBe('abc123');
  });

  test('should extract ID from URL with chapter', () => {
    expect(extractStudyId('https://lichess.org/study/abc123/ch456')).toBe('abc123');
  });

  test('should return null for invalid URL', () => {
    expect(extractStudyId('https://lichess.org/game/abc')).toBeNull();
  });

  test('should return null for empty string', () => {
    expect(extractStudyId('')).toBeNull();
  });

  test('should handle mixed-case IDs', () => {
    expect(extractStudyId('https://lichess.org/study/AbC123xYz')).toBe('AbC123xYz');
  });
});

describe('StateManager', () => {
  const testStateFile = path.join(__dirname, '.test-add-studies-state.json');

  afterEach(() => {
    if (fs.existsSync(testStateFile)) {
      fs.unlinkSync(testStateFile);
    }
  });

  test('should start with empty state when no file exists', () => {
    const sm = new StateManager(testStateFile);
    expect(sm.isProcessed('abc')).toBe(false);
  });

  test('should track processed studies', () => {
    const sm = new StateManager(testStateFile);
    sm.markProcessed('abc');
    sm.markProcessed('def');
    expect(sm.isProcessed('abc')).toBe(true);
    expect(sm.isProcessed('def')).toBe(true);
    expect(sm.isProcessed('ghi')).toBe(false);
  });

  test('should not duplicate study IDs', () => {
    const sm = new StateManager(testStateFile);
    sm.markProcessed('abc');
    sm.markProcessed('abc');
    expect(sm.state.processedStudies).toHaveLength(1);
  });

  test('should persist and reload state', () => {
    const sm1 = new StateManager(testStateFile);
    sm1.markProcessed('abc');
    sm1.save();

    const sm2 = new StateManager(testStateFile);
    expect(sm2.isProcessed('abc')).toBe(true);
  });

  test('should handle null state file (no persistence)', () => {
    const sm = new StateManager(null);
    sm.markProcessed('abc');
    sm.save(); // Should not throw
    expect(sm.isProcessed('abc')).toBe(true);
  });
});

describe('buildIndexFromCache', () => {
  test('builds a v2 index from cached studies using the real ECO index', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-studies-'));
    saveStudy(dir, {
      studyId: 'sic99',
      name: 'Sicilian Defense Basics',
      author: 'tester',
      likes: 100,
      pgn: '[Event "Sicilian Defense Basics: Intro"]\n[ChapterURL "https://lichess.org/study/sic99/c1"]\n\n1. e4 c5 *',
      fetched_at: '2026-07-10T00:00:00.000Z',
      source: 'curated',
    });
    const index = buildIndexFromCache(dir);
    const allEntries = Object.values(index).flat();
    expect(allEntries.length).toBeGreaterThan(0);
    expect(allEntries[0].study_title).toBe('Sicilian Defense Basics');
    expect(allEntries[0].match.score).toBeGreaterThanOrEqual(25);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('real curated-studies.txt format', () => {
  test('should parse the actual input file format', () => {
    const content = [
      '# Chess Opening Studies — Master List (695 studies)',
      '# Sources: Lichess Staff Picks',
      'Opening Traps',
      'https://lichess.org/study/Of3mcPk8',
      '🏰 Caro-Kann Defense🔥',
      'https://lichess.org/study/jtlLwUvh',
      '♦ All about the Sicilian Defense ♦',
      'https://lichess.org/study/8c8bmUfy',
    ].join('\n');

    const result = parseInputText(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ displayTitle: 'Opening Traps', studyId: 'Of3mcPk8' });
    expect(result[1]).toEqual({ displayTitle: '🏰 Caro-Kann Defense🔥', studyId: 'jtlLwUvh' });
    expect(result[2]).toEqual({
      displayTitle: '♦ All about the Sicilian Defense ♦',
      studyId: '8c8bmUfy',
    });
  });
});
