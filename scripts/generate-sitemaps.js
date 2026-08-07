const fs = require('fs');
const path = require('path');

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

function urlEntry({ loc, priority, changefreq }) {
  return (
    `<url><loc>${xmlEscape(PRIMARY_SITE_URL + loc)}</loc>` +
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

  const entries = STATIC_PAGES.map(urlEntry).concat(
    indexable.map((row, rank) => {
      const tier = tierFor(rank);
      return urlEntry({
        loc: `/opening/${encodeURIComponent(row.fen)}`,
        priority: tier.priority,
        changefreq: tier.changefreq,
      });
    })
  );

  fs.rmSync(SITEMAP_DIR, { recursive: true, force: true });
  fs.mkdirSync(SITEMAP_DIR, { recursive: true });

  const lastmod = new Date().toISOString().slice(0, 10);
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
            `<sitemap><loc>${PRIMARY_SITE_URL}/sitemaps/${name}</loc><lastmod>${lastmod}</lastmod></sitemap>`
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
  console.log(`  lastmod:                 ${lastmod}`);
}

if (require.main === module) {
  generateSitemaps();
}

module.exports = { generateSitemaps, tierFor, URLS_PER_SITEMAP };
