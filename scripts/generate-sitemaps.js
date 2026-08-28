const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { readOpenings, resolveCanonicals } = require('./generate-seo-lookup');

const PUBLIC_DIR = path.join(__dirname, '..', 'packages', 'web', 'public');

/**
 * siteConfig.ts is the one place the canonical host is written down, but it is
 * ESM TypeScript and this is a CommonJS build script — so read the constant out
 * of the source rather than keeping a second copy of it here to drift.
 */
function readPrimarySiteUrl() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'web', 'src', 'lib', 'siteConfig.ts'),
    'utf-8'
  );
  const match = source.match(/PRIMARY_SITE_URL\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('Could not read PRIMARY_SITE_URL from siteConfig.ts');
  }
  return match[1].replace(/\/$/, '');
}

const PRIMARY_SITE_URL = readPrimarySiteUrl();
const SITEMAP_DIR = path.join(PUBLIC_DIR, 'sitemaps');

const DATA_PATHS = ['api/data/eco', 'api/data/popularity_stats.json'];

function git(args) {
  return execFileSync('git', args, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/**
 * The date the openings last changed, or nothing at all.
 *
 * These files are rewritten wholesale by their pipelines rather than per
 * opening, so one date covers every URL. Stamping today on 12,106 URLs every
 * deploy is a claim that is false for almost all of them, and a `lastmod` that
 * always says now is one Google stops reading.
 *
 * It comes from git rather than the filesystem because **mtime does not survive
 * CI**: a fresh clone stamps every file with the checkout time, and
 * `vercel:prepare` rewrites the data files before this script runs.
 *
 * And git only answers when the history is long enough to know. In a shallow
 * clone the oldest available commit appears to introduce every file, so
 * `git log -1 -- api/data` returns that graft boundary rather than the real
 * last change. Vercel clones about ten commits deep, and production duly
 * shipped 2026-07-27 on all 12,108 URLs where the truth is 2026-06-06 — a
 * plausible wrong date that slides forward with every deploy, which is the
 * drifting `lastmod` this function exists to prevent. Reproduced by cloning
 * this repo at increasing depths: depth 1 returns today, depth 10 returns
 * 2026-07-27, depth 30 returns the truth.
 *
 * So the commit is checked against `.git/shallow`. If git's answer *is* a
 * boundary, the history cannot support it and the tag is omitted — an absent
 * date is neutral, an invented one is the fabricated-data trap in sitemap form.
 * `lastmodOmissionReason` names the cause in the build log, so "no date" is
 * distinguishable from "feature not working". Every dependency is injected so
 * the branches are testable without a real clone.
 */
function lastmodFromGit(io = {}) {
  const {
    commitSha = () => git(['rev-list', '--max-count=1', 'HEAD', '--', ...DATA_PATHS]),
    commitDate = (sha) => git(['log', '-1', '--format=%cs', sha]),
    shallowBoundaries = () => {
      const file = path.join(__dirname, '..', '.git', 'shallow');
      return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean) : [];
    },
  } = io;

  try {
    const sha = (commitSha() || '').trim();
    if (!sha) return null;
    if (shallowBoundaries().some((boundary) => boundary.trim() === sha)) return null;

    const date = (commitDate(sha) || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  } catch {
    return null;
  }
}

function dataLastModified() {
  return lastmodFromGit();
}

/**
 * Why the date is missing, for the build log.
 *
 * A silent omission is indistinguishable from the feature working, and the
 * likeliest cause on a build machine is a clone too shallow to contain the
 * commit that last touched the data — the openings change rarely, so that
 * commit can be a long way back. Naming the cause is what makes the first
 * deploy's log answer the question.
 */
function lastmodOmissionReason() {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'true'
      ? 'shallow clone — its history cannot date api/data, so no date is claimed'
      : 'git found no commit touching api/data';
  } catch {
    return 'git unavailable';
  }
}

const URLS_PER_SITEMAP = 2000;

// Google crawls a sitemap index roughly in order and a new domain does not get
// 12,000 URLs' worth of crawl budget. Sorting by game volume puts the openings
// most likely to be searched in the first shard rather than scattering them.
const TIERS = [
  { limit: 2000, priority: '0.9', changefreq: 'weekly' },
  { limit: 6000, priority: '0.7', changefreq: 'monthly' },
  { limit: Infinity, priority: '0.5', changefreq: 'monthly' },
];

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/analyse', priority: '0.7', changefreq: 'monthly' },
];

function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, priority, changefreq, lastmod }) {
  return (
    `<url><loc>${xmlEscape(PRIMARY_SITE_URL + loc)}</loc>` +
    // No date at all rather than a wrong one — see dataLastModified.
    (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
    `<changefreq>${changefreq}</changefreq>` +
    `<priority>${priority}</priority></url>`
  );
}

function tierFor(rank) {
  let seen = 0;
  for (const tier of TIERS) {
    seen += tier.limit;
    if (rank < seen) return tier;
  }
  return TIERS[TIERS.length - 1];
}

function generateSitemaps() {
  const rows = readOpenings();
  resolveCanonicals(rows);

  // Only pages that own their canonical URL belong in a sitemap. Asking Google
  // to crawl a page that points its canonical elsewhere wastes the budget the
  // rest of the set needs.
  const indexable = rows
    .filter((row) => !row.canonical)
    .sort((a, b) => (b.games || 0) - (a.games || 0));

  const lastmod = dataLastModified();

  const entries = STATIC_PAGES.map((page) => urlEntry({ ...page, lastmod })).concat(
    indexable.map((row, rank) => {
      const tier = tierFor(rank);
      return urlEntry({
        loc: `/opening/${encodeURIComponent(row.fen)}`,
        priority: tier.priority,
        changefreq: tier.changefreq,
        lastmod,
      });
    })
  );

  fs.rmSync(SITEMAP_DIR, { recursive: true, force: true });
  fs.mkdirSync(SITEMAP_DIR, { recursive: true });

  const files = [];
  for (let i = 0; i < entries.length; i += URLS_PER_SITEMAP) {
    const chunk = entries.slice(i, i + URLS_PER_SITEMAP);
    const name = `sitemap-${files.length + 1}.xml`;
    fs.writeFileSync(
      path.join(SITEMAP_DIR, name),
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        chunk.join('\n') +
        '\n</urlset>\n',
      'utf-8'
    );
    files.push(name);
  }

  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'sitemap-index.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      files
        .map(
          (name) =>
            `<sitemap><loc>${PRIMARY_SITE_URL}/sitemaps/${name}</loc>` +
            (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
            `</sitemap>`
        )
        .join('\n') +
      '\n</sitemapindex>\n',
    'utf-8'
  );

  // The flat sitemap.xml carried a byte-identical URL set to the shards and was
  // declared alongside them in robots.txt — the same 12,379 URLs submitted
  // twice. The index is the single declaration now.
  fs.rmSync(path.join(PUBLIC_DIR, 'sitemap.xml'), { force: true });

  console.log('Generated sitemaps:');
  console.log(`  Indexable opening pages: ${indexable.length}`);
  console.log(`  Canonicalised away:      ${rows.length - indexable.length}`);
  console.log(`  Files:                   ${files.length} (+ sitemap-index.xml)`);
  console.log(`  lastmod:                 ${lastmod || `(omitted — ${lastmodOmissionReason()})`}`);
}

if (require.main === module) {
  generateSitemaps();
}

module.exports = {
  generateSitemaps,
  dataLastModified,
  lastmodFromGit,
  lastmodOmissionReason,
  tierFor,
  URLS_PER_SITEMAP,
};
