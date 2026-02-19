/**
 * Unit Tests for Add Studies Tool
 * Tests input parsing, deduplication, study ID extraction, and merge behavior
 */

const path = require('path');
const fs = require('fs');
const { parseInputText, extractStudyId, StateManager } = require('../../tools/course-discovery/add-studies');

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
    const content = [
      '',
      'French Defense',
      '',
      'https://lichess.org/study/abc123',
      '',
    ].join('\n');

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
    const content = [
      '🏰 Caro-Kann Defense🔥',
      'https://lichess.org/study/jtlLwUvh',
    ].join('\n');

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
    const content = [
      'Title A',
      'Title B',
      'https://lichess.org/study/abc123',
    ].join('\n');

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

describe('merge behavior', () => {
  // These test the merge logic as implemented in the run() function
  // by simulating the filter logic directly

  test('curated entries survive when auto_discovered entries are cleared', () => {
    const existing = {
      'fen1': [
        { course_title: 'Auto Study', auto_discovered: true },
        { course_title: 'Curated Study', curated: true },
      ],
    };

    // Simulate the merge filter from add-studies.js
    const merged = {};
    for (const [fen, courses] of Object.entries(existing)) {
      const kept = courses.filter((c) => c.auto_discovered !== true);
      if (kept.length > 0) {
        merged[fen] = kept;
      }
    }

    expect(merged['fen1']).toHaveLength(1);
    expect(merged['fen1'][0].course_title).toBe('Curated Study');
  });

  test('replaceCurated flag clears both auto and curated entries', () => {
    const existing = {
      'fen1': [
        { course_title: 'Auto Study', auto_discovered: true },
        { course_title: 'Curated Study', curated: true },
        { course_title: 'Manual Study' },
      ],
    };

    const replaceCurated = true;
    const merged = {};
    for (const [fen, courses] of Object.entries(existing)) {
      const kept = courses.filter((c) => {
        if (c.auto_discovered === true) return false;
        if (replaceCurated && c.curated === true) return false;
        return true;
      });
      if (kept.length > 0) {
        merged[fen] = kept;
      }
    }

    expect(merged['fen1']).toHaveLength(1);
    expect(merged['fen1'][0].course_title).toBe('Manual Study');
  });

  test('new curated entries are added to merged result', () => {
    const merged = {};
    const discovered = {
      'fen1': [{ course_title: 'New Study', curated: true }],
      'fen2': [{ course_title: 'Another Study', curated: true }],
    };

    for (const [fen, courses] of Object.entries(discovered)) {
      if (!merged[fen]) merged[fen] = [];
      merged[fen].push(...courses);
    }

    expect(Object.keys(merged)).toHaveLength(2);
    expect(merged['fen1'][0].course_title).toBe('New Study');
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
    expect(result[2]).toEqual({ displayTitle: '♦ All about the Sicilian Defense ♦', studyId: '8c8bmUfy' });
  });
});
