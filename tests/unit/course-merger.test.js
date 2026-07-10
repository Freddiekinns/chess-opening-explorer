/**
 * Unit Tests for the courses.json writer
 * (merge helpers were removed with study matching v2 — the index is a full
 * rebuild from the study cache on every run)
 */

const { writeCourses } = require('../../tools/course-discovery/lib/course-merger');
const fs = require('fs');

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const FRENCH_FEN = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const entry = {
  study_title: 'French Defense Masterclass',
  chapter_title: 'Main line',
  study_url: 'https://lichess.org/study/abc123',
  chapter_url: 'https://lichess.org/study/abc123/ch001',
  author: 'tester',
  platform: 'Lichess',
  likes: 10,
  chapters_matched: 1,
  curated: true,
  match: { score: 80, depth: 2, reason: 'covers-position' },
  discovered_at: '2026-07-10T00:00:00.000Z',
};

describe('writeCourses', () => {
  test('writes compact JSON', () => {
    const data = { [FRENCH_FEN]: [entry] };
    fs.existsSync.mockReturnValue(true);

    writeCourses('/path/to/courses.json', data);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/path/to/courses.json',
      JSON.stringify(data),
      'utf8'
    );
  });

  test('creates the directory if it does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    writeCourses('/path/to/courses.json', {});

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });
});
