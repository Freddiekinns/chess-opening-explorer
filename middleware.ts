import { buildSiteUrl, LEGACY_VERCEL_HOST, SITE_NAME } from './packages/web/src/lib/siteConfig';

/**
 * [name, eco, moves, description, games, white, draw, black, canonicalFen]
 * Trailing nulls are trimmed by the generator, so read defensively.
 */
type SeoEntry = [
  name: string,
  eco: string,
  moves: string,
  description?: string,
  games?: number | null,
  white?: number | null,
  draw?: number | null,
  black?: number | null,
  canonical?: string | null,
];
type SeoLookup = Record<string, SeoEntry>;

// The lookup is sharded into 64 files of ~120 KB by scripts/generate-seo-lookup.js
// so a request fetches (and caches) only the shard holding its FEN, instead of
// the full 8.9 MB dataset per edge cold start.
const SHARD_COUNT = 64;

/** djb2 string hash — MUST stay in sync with scripts/generate-seo-lookup.js. */
function shardForFen(fen: string, shardCount = SHARD_COUNT): number {
  let hash = 5381;
  for (let i = 0; i < fen.length; i++) {
    hash = ((hash << 5) + hash + fen.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) % shardCount;
}

const seoShardCache = new Map<number, SeoLookup>();

async function getSeoEntry(origin: string, fen: string): Promise<SeoEntry | undefined> {
  const shard = shardForFen(fen);
  let lookup = seoShardCache.get(shard);
  if (!lookup) {
    try {
      const res = await fetch(`${origin}/seo-lookup/${shard.toString(16)}.json`);
      if (!res.ok) return undefined;
      lookup = (await res.json()) as SeoLookup;
      seoShardCache.set(shard, lookup);
    } catch {
      return undefined;
    }
  }
  return lookup[fen];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Google shows roughly 155 characters. Cut on a sentence boundary where one
 * lands in range, otherwise on a word — never mid-word, and never with the
 * ellipsis dangling after a comma.
 */
function truncateForMeta(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;

  const window = clean.slice(0, limit + 1);
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '));
  if (sentenceEnd > limit * 0.55) return clean.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(' ');
  return clean.slice(0, wordEnd > 0 ? wordEnd : limit).replace(/[,;:]$/, '') + '…';
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function buildMetaTags(options: {
  title: string;
  description: string;
  url: string;
  canonical: string;
  jsonLd?: string;
}): string {
  const { title, description, url, canonical, jsonLd } = options;
  const escaped = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    url: escapeHtml(url),
    canonical: escapeHtml(canonical),
  };

  const tags = [
    `<title>${escaped.title}</title>`,
    `<meta name="description" content="${escaped.description}" />`,
    `<link rel="canonical" href="${escaped.canonical}" />`,
    `<meta property="og:title" content="${escaped.title}" />`,
    `<meta property="og:description" content="${escaped.description}" />`,
    `<meta property="og:url" content="${escaped.url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${buildSiteUrl('/opening-book-icon.png')}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escaped.title}" />`,
    `<meta name="twitter:description" content="${escaped.description}" />`,
  ];

  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${jsonLd}</script>`);
  }

  return tags.join('\n    ');
}

/**
 * The content Googlebot sees without running a line of JavaScript, and the
 * first paint a reader on a slow connection gets instead of a spinner.
 *
 * React replaces #root on mount, so this is the pre-hydration state of the
 * same page — not a second copy of it, and not hidden text.
 */
function buildOpeningBody(entry: SeoEntry, name: string, eco: string): string {
  const [, , moves, description, games, white, draw, black] = entry;

  const parts = [
    `<h1 style="font-family:'Bricolage Grotesque',serif;font-size:2rem;margin:0 0 .5rem">${escapeHtml(name)}</h1>`,
  ];

  const meta = [eco && `ECO ${escapeHtml(eco)}`, moves && escapeHtml(moves)]
    .filter(Boolean)
    .join(' · ');
  if (meta) {
    parts.push(`<p style="color:#a8a29e;margin:0 0 1.5rem">${meta}</p>`);
  }

  if (description) {
    parts.push(`<p style="margin:0 0 1.5rem">${escapeHtml(description)}</p>`);
  }

  // Never draw a rate we do not have: 16 positions carry null stats, and a
  // rounded null is 0% — a fabricated statistic wearing a type coercion.
  if (games != null && white != null && draw != null && black != null) {
    parts.push(
      `<h2 style="font-size:1.1rem;margin:0 0 .5rem">Win rate over ${games.toLocaleString('en-GB')} Lichess games</h2>`,
      `<ul style="list-style:none;padding:0;margin:0 0 1.5rem;color:#a8a29e">` +
        `<li>White wins ${pct(white)}</li>` +
        `<li>Draw ${pct(draw)}</li>` +
        `<li>Black wins ${pct(black)}</li>` +
        `</ul>`
    );
  }

  return `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem">${parts.join('')}</main>`;
}

function buildOpeningJsonLd(name: string, description: string, canonical: string): string {
  // Escaped for an inline <script>: the payload is data-file text, so the only
  // real hazard is a literal </script> or a comment opener closing the block.
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: buildSiteUrl('/') },
    about: { '@type': 'Thing', name },
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export const config = {
  matcher: [
    '/((?!api/|assets/|fonts/|sounds/|sitemaps/|sitemap\.xml|sitemap-index\.xml|robots\.txt|seo-lookup/|opening-book-icon\.png).*)',
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (url.host === LEGACY_VERCEL_HOST) {
    const redirectUrl = new URL(url.pathname, buildSiteUrl('/'));
    redirectUrl.search = url.search;

    return Response.redirect(redirectUrl.toString(), 308);
  }

  // Only process opening and analyse routes
  if (!pathname.startsWith('/opening/') && pathname !== '/analyse') {
    return fetch(request);
  }

  let title = `${SITE_NAME} — Discover, explore and learn chess openings`;
  let description =
    'Explore 12,000+ chess openings with videos, studies, win rates, and practice tools.';
  const requestUrl = buildSiteUrl(pathname);
  let canonicalUrl = requestUrl;
  let body = '';
  let jsonLd: string | undefined;
  let status = 200;

  if (pathname === '/analyse') {
    title = `Analyse Your Games — ${SITE_NAME}`;
    description =
      'Analyse your Chess.com and Lichess games to discover which openings you play and track your performance.';
  } else if (pathname.startsWith('/opening/')) {
    const fenEncoded = pathname.slice('/opening/'.length);
    let entry: SeoEntry | undefined;

    try {
      const fen = decodeURIComponent(fenEncoded);
      entry = await getSeoEntry(url.origin, fen);
    } catch {
      // Bad FEN encoding — falls through to the not-found branch below.
    }

    if (entry) {
      const [name, eco, moves, entryDescription, , , , , canonical] = entry;
      const ecoLabel = eco ? ` (${eco})` : '';
      title = `${name}${ecoLabel} — ${SITE_NAME}`;

      // The opening's own description, not a mail-merge sentence. Every page
      // used to advertise itself with the same template, which is a large part
      // of why a month of impressions earned a ~1% CTR.
      description = entryDescription
        ? truncateForMeta(entryDescription)
        : `Explore the ${name}${ecoLabel}.${moves ? ` Played after ${moves}.` : ''} Learn key ideas, watch videos, and practise this opening.`;

      // 2,071 pages shared a name with another and 1,490 more were generated
      // "<parent>, <move>" captions. They point at the page that owns the name
      // rather than competing with it for the same query.
      if (canonical) {
        canonicalUrl = buildSiteUrl(`/opening/${encodeURIComponent(canonical)}`);
      }

      body = buildOpeningBody(entry, name, eco);
      jsonLd = buildOpeningJsonLd(name, description, canonicalUrl);
    } else {
      // An unknown FEN used to return 200 with the landing page behind it —
      // a soft 404, and Search Console had started reporting them as such.
      status = 404;
      title = `Opening not found — ${SITE_NAME}`;
      description = 'This chess opening could not be found.';
      body =
        `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem">` +
        `<h1 style="font-family:'Bricolage Grotesque',serif;font-size:2rem;margin:0 0 .5rem">Opening not found</h1>` +
        `<p style="color:#a8a29e">We could not find that position. <a href="/" style="color:#e85d04">Search the openings</a>.</p>` +
        `</main>`;
    }
  }

  // Fetch index.html directly (not the original URL) to avoid middleware loop
  const indexUrl = new URL('/index.html', url.origin);
  const originResponse = await fetch(indexUrl);
  const html = await originResponse.text();

  // Replace existing title and meta description, inject new tags
  const metaTags = buildMetaTags({
    title,
    description,
    url: requestUrl,
    canonical: canonicalUrl,
    jsonLd,
  });

  let modifiedHtml = html;

  // Replace <title>...</title>
  modifiedHtml = modifiedHtml.replace(/<title>[^<]*<\/title>/, '');

  // Remove existing meta description
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, '');

  // Remove existing canonical tag from base HTML to avoid duplicates
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '');

  // Remove existing og/twitter tags from base HTML to avoid duplicates
  modifiedHtml = modifiedHtml.replace(/<meta\s+(?:property="og:|name="twitter:)[^>]*\/?>/g, '');

  // Inject all meta tags before </head>
  modifiedHtml = modifiedHtml.replace('</head>', `    ${metaTags}\n  </head>`);

  // Swap the loading spinner for the page's own content. React replaces #root
  // on mount, so this is what a crawler reads and what a reader sees first.
  // Greedy to the last </div> that closes the block, so the nested spinner
  // markup goes with it — a non-greedy match stops at the spinner's own
  // closing tag and leaves a stray </div> behind.
  if (body) {
    modifiedHtml = modifiedHtml.replace(
      /<div id="root">[\s\S]*<\/div>(?=\s*(?:<script|<\/body>))/,
      `<div id="root">${body}</div>`
    );
  }

  return new Response(modifiedHtml, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control':
        status === 404
          ? 's-maxage=3600, stale-while-revalidate=86400'
          : 's-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
