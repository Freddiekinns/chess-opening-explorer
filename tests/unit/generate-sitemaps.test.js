const fs = require('fs');
const path = require('path');

const { dataLastModified, tierFor, URLS_PER_SITEMAP } = require('../../scripts/generate-sitemaps');

const ROOT = path.join(__dirname, '..', '..');

describe('sitemap lastmod tells the truth about the data', () => {
  /**
   * The index used to stamp `new Date()` on every deploy, and the URLs carried
   * no lastmod at all. A date that always says "now" for 12,106 URLs is a claim
   * that is false for almost all of them, and Google discounts a lastmod it
   * cannot trust. The openings change when their pipelines rewrite these files,
   * so that is the date worth sending.
   */
  it('is a plain YYYY-MM-DD date', () => {
    expect(dataLastModified()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is the newest mtime across the ECO shards and the popularity stats', () => {
    const sources = [
      ...['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'].map((n) =>
        path.join(ROOT, 'api', 'data', 'eco', `${n}.json`)
      ),
      path.join(ROOT, 'api', 'data', 'popularity_stats.json'),
    ].filter((file) => fs.existsSync(file));

    expect(sources.length).toBeGreaterThan(0);
    const newest = Math.max(...sources.map((file) => fs.statSync(file).mtimeMs));
    expect(dataLastModified()).toBe(new Date(newest).toISOString().slice(0, 10));
  });

  it('is not simply today, unless the data really did change today', () => {
    // Guards the regression directly: a `new Date()` implementation passes the
    // two tests above on the day the data changed and lies every other day.
    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-sitemaps.js'), 'utf-8');
    expect(source).not.toMatch(/const lastmod = new Date\(\)/);
  });
});

describe('sitemap tiers are unchanged by the lastmod work', () => {
  it('puts the first 2000 openings in the weekly tier', () => {
    expect(tierFor(0).changefreq).toBe('weekly');
    expect(tierFor(1999).priority).toBe('0.9');
    expect(tierFor(2000).changefreq).toBe('monthly');
  });

  it('still chunks at 2000 URLs per file', () => {
    expect(URLS_PER_SITEMAP).toBe(2000);
  });
});
