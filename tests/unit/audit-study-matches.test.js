/**
 * Tests for the dual-schema study match audit script.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit, detectSchema } = require('../../scripts/audit-study-matches');

const SICILIAN_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function writeTemp(data) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')), 'courses.json');
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

describe('detectSchema', () => {
  test('v1 entries have course_title, v2 entries have study_title', () => {
    expect(detectSchema([{ course_title: 'x' }])).toBe('v1');
    expect(detectSchema([{ study_title: 'x', match: { score: 1 } }])).toBe('v2');
  });
});

describe('audit', () => {
  test('counts contamination for a conflicting v1 entry', () => {
    const file = writeTemp({
      [SICILIAN_FEN]: [
        {
          course_title: 'London System Guide - London System Guide: Intro',
          author: 'a',
          platform: 'Lichess',
          source_url: 'https://lichess.org/study/x/y',
          curated: true,
          likes: 1,
        },
      ],
    });
    const m = audit(file);
    expect(m.schema).toBe('v1');
    expect(m.contaminationCount).toBe(1);
    expect(m.titleDuplicationCount).toBe(1);
  });

  test('clean v2 entry produces zero contamination and duplication', () => {
    const file = writeTemp({
      [SICILIAN_FEN]: [
        {
          study_title: 'Sicilian Repertoire',
          chapter_title: 'Intro',
          study_url: 'https://lichess.org/study/x',
          chapter_url: 'https://lichess.org/study/x/y',
          author: 'a',
          platform: 'Lichess',
          likes: 1,
          chapters_matched: 1,
          curated: true,
          match: { score: 80, depth: 2, reason: 'covers-position' },
        },
      ],
    });
    const m = audit(file);
    expect(m.schema).toBe('v2');
    expect(m.contaminationCount).toBe(0);
    expect(m.duplicateStudyEntries).toBe(0);
    expect(m.titleDuplicationCount).toBe(0);
    expect(m.rankingTies).toBe(0);
  });
});
