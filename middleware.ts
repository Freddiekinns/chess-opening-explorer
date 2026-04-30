import { buildSiteUrl, LEGACY_VERCEL_HOST, SITE_NAME } from './packages/web/src/lib/siteConfig';

type SeoEntry = [name: string, eco: string, moves: string];
type SeoLookup = Record<string, SeoEntry>;

let seoLookupCache: SeoLookup | null = null;

async function getSeoLookup(origin: string): Promise<SeoLookup> {
  if (seoLookupCache) return seoLookupCache;
  try {
    const res = await fetch(`${origin}/seo-lookup.json`);
    if (res.ok) {
      seoLookupCache = (await res.json()) as SeoLookup;
      return seoLookupCache!;
    }
  } catch {
    // Fall through to empty lookup
  }
  return {};
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMetaTags(options: { title: string; description: string; url: string }): string {
  const { title, description, url } = options;
  const escaped = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    url: escapeHtml(url),
  };

  return [
    `<title>${escaped.title}</title>`,
    `<meta name="description" content="${escaped.description}" />`,
    `<link rel="canonical" href="${escaped.url}" />`,
    `<meta property="og:title" content="${escaped.title}" />`,
    `<meta property="og:description" content="${escaped.description}" />`,
    `<meta property="og:url" content="${escaped.url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${buildSiteUrl('/opening-book-icon.png')}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escaped.title}" />`,
    `<meta name="twitter:description" content="${escaped.description}" />`,
  ].join('\n    ');
}

export const config = {
  matcher: ['/((?!api/|assets/|sounds/|seo-lookup\.json|opening-book-icon\.png).*)'],
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
  let canonicalUrl = buildSiteUrl(pathname);

  if (pathname === '/analyse') {
    title = `Analyse Your Games — ${SITE_NAME}`;
    description =
      'Analyse your Chess.com and Lichess games to discover which openings you play and track your performance.';
  } else if (pathname.startsWith('/opening/')) {
    const fenEncoded = pathname.slice('/opening/'.length);
    try {
      const fen = decodeURIComponent(fenEncoded);
      const lookup = await getSeoLookup(url.origin);
      const entry = lookup[fen];

      if (entry) {
        const [name, eco, moves] = entry;
        const ecoLabel = eco ? ` (${eco})` : '';
        title = `${name}${ecoLabel} — ${SITE_NAME}`;
        description = `Explore the ${name}${ecoLabel}.${moves ? ` Played after ${moves}.` : ''} Learn key ideas, watch videos, and practice this opening.`;
      } else {
        title = `Chess Opening — ${SITE_NAME}`;
        description = 'Explore this chess opening. Learn key ideas, watch videos, and practice.';
      }
    } catch {
      // Bad FEN encoding — use defaults
    }
  }

  // Fetch index.html directly (not the original URL) to avoid middleware loop
  const indexUrl = new URL('/index.html', url.origin);
  const originResponse = await fetch(indexUrl);
  const html = await originResponse.text();

  // Replace existing title and meta description, inject new tags
  const metaTags = buildMetaTags({ title, description, url: canonicalUrl });

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

  return new Response(modifiedHtml, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
