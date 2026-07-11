/**
 * Tests for the local study cache (offline rematch support).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  saveStudy,
  loadStudy,
  loadAllStudies,
  hasStudy,
} = require('../../tools/course-discovery/lib/study-cache');

describe('study-cache', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-cache-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const study = {
    studyId: 'abc123',
    name: 'Test Study',
    author: 'tester',
    likes: 42,
    pgn: '[Event "Test"]\n\n1. e4 *',
    fetched_at: '2026-07-10T00:00:00.000Z',
    source: 'curated',
  };

  test('round-trips a study', () => {
    saveStudy(dir, study);
    expect(hasStudy(dir, 'abc123')).toBe(true);
    expect(loadStudy(dir, 'abc123')).toEqual(study);
  });

  test('loadStudy returns null for missing ids', () => {
    expect(loadStudy(dir, 'nope')).toBeNull();
    expect(hasStudy(dir, 'nope')).toBe(false);
  });

  test('loadAllStudies returns every cached study', () => {
    saveStudy(dir, study);
    saveStudy(dir, { ...study, studyId: 'def456' });
    const all = loadAllStudies(dir);
    expect(all.map((s) => s.studyId).sort()).toEqual(['abc123', 'def456']);
  });

  test('loadAllStudies returns [] when the directory does not exist', () => {
    expect(loadAllStudies(path.join(dir, 'missing'))).toEqual([]);
  });
});
