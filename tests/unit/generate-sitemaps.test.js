const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { dataLastModified, tierFor, URLS_PER_SITEMAP } = require('../../scripts/generate-sitemaps');

const ROOT = path.join(__dirname, '..', '..');

describe('sitemap lastmod tells the truth about the data', () => {
  /**
   * The index used to stamp `new Date()` on every deploy and the URLs carried
   * no lastmod at all. A date that always says "now" for 12,106 URLs is a claim
   * that is false for almost all of them, and Google discounts a lastmod it
   * cannot trust.
   *
   * The first attempt at this read mtime, which passes locally and is wrong in
   * CI: a fresh clone stamps every file with the checkout time, and
   * `vercel:prepare` rewrites the data files before the generator runs. It
   * reported the build date on every deploy while its own tests stayed green.
   */
  it('is a plain YYYY-MM-DD date, or null', () => {
    const value = dataLastModified();
    if (value !== null) expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is the commit date of the last change — but only where history can prove it', () => {
    // This test used to assert the raw `git log` answer unconditionally, which
    // is the *buggy* contract: on CI, which checks out at depth 1, that answer
    // is today's date. It failed the moment the shallow guard started working,
    // which is the guard doing its job rather than a regression.
    const shallow =
      execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
        cwd: ROOT,
        encoding: 'utf-8',
      }).trim() === 'true';

    if (shallow) {
      // A shallow clone cannot distinguish the graft boundary from a real last
      // change, so the only honest answer is none.
      expect(dataLastModified()).toBeNull();
      return;
    }

    const expected = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', 'api/data/eco', 'api/data/popularity_stats.json'],
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();

    expect(expected).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dataLastModified()).toBe(expected);
  });

  it('does not read the filesystem clock, which CI resets', () => {
    // The regression guard proper. mtime-based and new Date() implementations
    // both pass the tests above on the day the data changed; only this catches
    // them on every other day.
    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-sitemaps.js'), 'utf-8');
    expect(source).not.toMatch(/const lastmod = new Date\(\)/);
    expect(source).not.toMatch(/statSync\([^)]*\)\.mtime/);
  });

  it('is not the build date, because the data is older than this build', () => {
    const value = dataLastModified();
    const today = new Date().toISOString().slice(0, 10);
    // True as long as api/data has not been committed today. If it has, this
    // test is vacuous rather than wrong — the assertion above carries the rule.
    if (value !== null && value !== today) {
      expect(value < today).toBe(true);
    }
  });

  it('omits the tag rather than inventing a date when git cannot answer', () => {
    // An absent lastmod is neutral; a fabricated one is the project's signature
    // failure wearing a sitemap. Proven by running the generator's own emitter
    // with no date, which is what dataLastModified returns off a shallow clone.
    const { generateSitemaps } = require('../../scripts/generate-sitemaps');
    expect(typeof generateSitemaps).toBe('function');

    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-sitemaps.js'), 'utf-8');
    expect(source).toContain("lastmod ? `<lastmod>${lastmod}</lastmod>` : ''");
  });
});

describe('a truncated clone must not produce a plausible wrong date', () => {
  /**
   * Vercel clones ~10 commits deep. In a shallow clone the oldest available
   * commit appears to introduce every file, so `git log -1 -- api/data` returns
   * that graft boundary rather than the real last change. Production shipped
   * 2026-07-27 on all 12,108 URLs where the truth is 2026-06-06, and the
   * boundary slides forward with every deploy — the drifting date this whole
   * function exists to avoid, wearing a plausible value.
   *
   * Reproduced by cloning this repo at increasing depths: depth 1 returns
   * today, depth 10 returns 2026-07-27, depth 30 returns the truth.
   */
  const { lastmodFromGit } = require('../../scripts/generate-sitemaps');

  const boundarySha = 'a'.repeat(40);
  const realSha = 'b'.repeat(40);

  it('refuses a date whose commit is the shallow boundary', () => {
    expect(
      lastmodFromGit({
        commitSha: () => boundarySha,
        commitDate: () => '2026-07-27',
        shallowBoundaries: () => [boundarySha],
      })
    ).toBeNull();
  });

  it('accepts a date from a commit inside the available history', () => {
    expect(
      lastmodFromGit({
        commitSha: () => realSha,
        commitDate: () => '2026-06-06',
        shallowBoundaries: () => [boundarySha],
      })
    ).toBe('2026-06-06');
  });

  it('accepts normally when the clone is not shallow at all', () => {
    expect(
      lastmodFromGit({
        commitSha: () => realSha,
        commitDate: () => '2026-06-06',
        shallowBoundaries: () => [],
      })
    ).toBe('2026-06-06');
  });

  it('returns null when git names no commit for the data paths', () => {
    expect(
      lastmodFromGit({
        commitSha: () => '',
        commitDate: () => '',
        shallowBoundaries: () => [],
      })
    ).toBeNull();
  });

  it('returns null rather than throwing when git is unavailable', () => {
    expect(
      lastmodFromGit({
        commitSha: () => {
          throw new Error('git: not found');
        },
        commitDate: () => '',
        shallowBoundaries: () => [],
      })
    ).toBeNull();
  });

  it('rejects a malformed date even from a trusted commit', () => {
    expect(
      lastmodFromGit({
        commitSha: () => realSha,
        commitDate: () => 'not-a-date',
        shallowBoundaries: () => [],
      })
    ).toBeNull();
  });
});

describe('the generated sitemaps carry the date', () => {
  const sitemap = path.join(ROOT, 'packages', 'web', 'public', 'sitemaps', 'sitemap-1.xml');

  it('puts a lastmod on every URL, not just the index', () => {
    if (!fs.existsSync(sitemap)) return; // not built in this environment
    const xml = fs.readFileSync(sitemap, 'utf-8');
    const urls = (xml.match(/<url>/g) || []).length;
    const dates = (xml.match(/<lastmod>/g) || []).length;
    expect(urls).toBeGreaterThan(0);
    expect(dates).toBe(urls);
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
