/**
 * The video-match audit must be able to see the gaps the 2026-11 review found
 * by hand: coverage that depends on how a page is named ("QGD: …" at 5%),
 * family root pages led by a sub-variation lecture, and #1 slots concentrated
 * in three channels.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit } = require('../../scripts/audit-video-matches');

const video = (id, title, channel, overrides = {}) => ({
  id,
  title,
  channel,
  duration: 1200,
  views: 1000,
  published: '2024-01-01T00:00:00Z',
  score: 100,
  ...overrides,
});

const position = (fen, name, eco, videos) => ({ opening: { id: fen, name, eco }, videos });

function auditIndex(positions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-audit-'));
  const indexPath = path.join(dir, 'video-index.json');
  fs.writeFileSync(
    indexPath,
    JSON.stringify({
      generated: new Date().toISOString(),
      positions: Object.fromEntries(positions.map((p) => [p.opening.id, p])),
    })
  );
  try {
    return audit(indexPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('audit-video-matches', () => {
  describe('coverage by name prefix', () => {
    it('lists the worst-covered prefixes, largest gap first', () => {
      const pages = [];
      for (let i = 0; i < 20; i++) {
        pages.push(position(`qgd${i}`, `QGD: Line ${i}`, 'D35', []));
        pages.push(
          position(`sic${i}`, `Sicilian: Line ${i}`, 'B40', [video('v', 'Sicilian', 'A')])
        );
      }
      pages[0].videos = [video('q', "Queen's Gambit Declined", 'A')];

      const report = auditIndex(pages);

      expect(report.coverage.worst_prefixes[0]).toEqual({
        prefix: 'QGD',
        pages: 20,
        covered: 1,
        covered_pct: 5,
      });
      expect(report.coverage.worst_prefixes.map((p) => p.prefix)).not.toContain('Sicilian');
    });

    it('ignores prefixes too small to be a pattern', () => {
      const report = auditIndex([position('a', 'Rare: Line', 'A00', [])]);
      expect(report.coverage.worst_prefixes).toEqual([]);
    });
  });

  describe('family root pages', () => {
    it('counts root pages led by a video about one variation', () => {
      const report = auditIndex([
        position('root1', 'Sicilian Defense', 'B20', [
          video('n', 'The Najdorf', 'A', { level: 'variation' }),
          video('o', 'Sicilian Defense overview', 'A'),
        ]),
        position('root2', 'French Defense', 'C00', [video('f', 'French Defense overview', 'A')]),
        position('var', 'Sicilian Defense: Najdorf Variation', 'B90', [
          video('n', 'The Najdorf', 'A', { level: 'variation' }),
        ]),
      ]);

      expect(report.root_pages).toEqual({
        root_pages_with_videos: 2,
        led_by_variation_video: 1,
        led_by_variation_video_pct: 50,
      });
    });
  });

  describe('creators', () => {
    it('reports how concentrated the #1 slots are', () => {
      const lead = (fen, channel) =>
        position(fen, `Opening ${fen}`, 'B20', [
          video(`v-${fen}`, 'Sicilian Defense', channel),
          video(`w-${fen}`, 'Sicilian Defense', 'Runner Up'),
        ]);
      const report = auditIndex([
        lead('a', 'One'),
        lead('b', 'One'),
        lead('c', 'Two'),
        lead('d', 'Three'),
        lead('e', 'Four'),
      ]);

      expect(report.creators.channels_shown).toBe(5);
      expect(report.creators.top3_share_of_first_slots_pct).toBe(80);
      expect(report.creators.first_slots[0]).toEqual({ channel: 'One', first_slots: 2, pct: 40 });
    });
  });
});
