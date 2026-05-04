'use strict';

const fs = require('fs');
const path = require('path');
const { createResolver } = require('../resolve-family');

describe('coverage gate logic', () => {
  test('createResolver assigns uncategorised on miss and a real id on hit', () => {
    const families = { sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' } };
    const resolve = createResolver(families, { overrides: [] });
    expect(resolve({ eco: 'B20', name: 'Sicilian Defense: Najdorf' })).toBe('sicilian');
    expect(resolve({ eco: 'A00', name: 'Mystery Opening' })).toBe('uncategorised');
  });

  test('coverage report stays at or above 98% on real ECO data', () => {
    const reportPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'api',
      'data',
      'family-coverage-report.json'
    );
    if (!fs.existsSync(reportPath)) {
      // The report is generated during `node scripts/prepare-vercel-data.js`.
      // In CI / pre-merge runs it must exist. Locally, surface the missing file
      // rather than silently passing.
      throw new Error(
        `Coverage report not found at ${reportPath}. Run \`node scripts/prepare-vercel-data.js\` to regenerate it.`
      );
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.uncategorised / report.total).toBeLessThanOrEqual(0.02);
  });
});
