import {
  buildOpeningDescription,
  buildSiteUrl,
  LEGACY_VERCEL_HOST,
  SITE_NAME,
  STATIC_ROUTES,
} from './packages/web/src/lib/siteConfig';

/**
 * [name, eco, moves, description, games, white, draw, black, canonicalFen,
 *  sharesName]
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
  sharesName?: 1 | null,
];
type SeoLookup = Record<string, SeoEntry>;

// The lookup is sharded into 96 files (mean 162 KB, largest 224 KB) by
// scripts/generate-seo-lookup.js so a request fetches — and this isolate then
// holds — only the shard containing its FEN, rather than the full 15.6 MB.
// A crawler sweeping every opening will eventually pull all 96 into one
// isolate; that is the deliberate ceiling, and it is well inside the edge
// memory limit. It was 64 until the ancestor and related-opening links landed
// and pushed the largest shard to 322 KB — the split changes what one request
// pays for, not what a full sweep costs.
const SHARD_COUNT = 96;

/** djb2 string hash — MUST stay in sync with scripts/generate-seo-lookup.js. */
function shardForFen(fen: string, shardCount = SHARD_COUNT): number {
  let hash = 5381;
  for (let i = 0; i < fen.length; i++) {
    hash = ((hash << 5) + hash + fen.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) % shardCount;
}

const seoShardCache = new Map<number, SeoLookup>();

/**
 * "The shard says this FEN does not exist" and "the shard did not load" are
 * different answers and must stay that way. The first is a real 404; the second
 * has to fail open, because 404ing on a transient CDN miss would take all
 * 12,377 opening pages out of the index — the failure this change exists to
 * undo, inflicted faster.
 */
type LookupResult =
  | { status: 'found'; entry: SeoEntry }
  | { status: 'missing' }
  | { status: 'unavailable' };

async function getSeoEntry(origin: string, fen: string): Promise<LookupResult> {
  const shard = shardForFen(fen);
  let lookup = seoShardCache.get(shard);
  if (!lookup) {
    try {
      const res = await fetch(`${origin}/seo-lookup/${shard.toString(16)}.json`);
      if (!res.ok) return { status: 'unavailable' };
      const parsed = await res.json();
      // Valid JSON that is not an object — `null`, an array, a truncated body
      // reassembled into a scalar — must not reach the lookup below, where
      // indexing it throws and the caller's catch reads that as "no such
      // opening" and 404s a page that exists.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { status: 'unavailable' };
      }
      lookup = parsed as SeoLookup;
      seoShardCache.set(shard, lookup);
    } catch {
      return { status: 'unavailable' };
    }
  }
  const entry = lookup[fen];
  return entry ? { status: 'found', entry } : { status: 'missing' };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    parts.push(`<p style="color:var(--color-text-secondary);margin:0 0 1.5rem">${meta}</p>`);
  }

  if (description) {
    parts.push(`<p style="margin:0 0 1.5rem">${escapeHtml(description)}</p>`);
  }

  // Never draw a rate we do not have: 16 positions carry null stats, and a
  // rounded null is 0% — a fabricated statistic wearing a type coercion.
  if (games != null && white != null && draw != null && black != null) {
    parts.push(
      `<h2 style="font-size:1.1rem;margin:0 0 .5rem">Win rate over ${games.toLocaleString('en-GB')} Lichess games</h2>`,
      `<ul style="list-style:none;padding:0;margin:0 0 1.5rem;color:var(--color-text-secondary)">` +
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

const NOT_FOUND_BODY =
  `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem">` +
  `<h1 style="font-family:'Bricolage Grotesque',serif;font-size:2rem;margin:0 0 .5rem">Page not found</h1>` +
  `<p style="color:var(--color-text-secondary)">We could not find that page. <a href="/" style="color:var(--color-brand-orange)">Search the openings</a>.</p>` +
  `</main>`;

async function fetchIndexHtml(origin: string): Promise<string> {
  // Fetch index.html directly (not the original URL) to avoid a middleware loop.
  const res = await fetch(new URL('/index.html', origin));
  return res.text();
}

/**
 * Swap the base document's placeholder head and spinner for this page's own.
 *
 * Both the good path and the not-found path go through here, so the two cannot
 * drift on which tags get removed — a stale og: tag left behind on one of them
 * is the duplicate-metadata failure this file exists to undo.
 */
function injectIntoHtml(html: string, metaTags: string, body: string): string {
  let out = html;

  // Replace <title>...</title>
  out = out.replace(/<title>[^<]*<\/title>/, '');
  // Remove existing meta description
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, '');
  // Remove existing canonical tag from base HTML to avoid duplicates
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '');
  // Remove existing og/twitter tags from base HTML to avoid duplicates
  out = out.replace(/<meta\s+(?:property="og:|name="twitter:)[^>]*\/?>/g, '');
  // Inject all meta tags before </head>
  out = out.replace('</head>', `    ${metaTags}\n  </head>`);

  // Swap the loading spinner for the page's own content. React replaces #root
  // on mount, so this is what a crawler reads and what a reader sees first.
  // Greedy to the last </div> that closes the block, so the nested spinner
  // markup goes with it — a non-greedy match stops at the spinner's own
  // closing tag and leaves a stray </div> behind.
  if (body) {
    out = out.replace(
      /<div id="root">[\s\S]*<\/div>(?=\s*(?:<script|<\/body>))/,
      `<div id="root">${body}</div>`
    );
  }

  return out;
}

/**
 * A path that is neither an opening nor a page is not a page.
 *
 * `App.tsx` renders LandingPage for `*`, so without this every typo and every
 * stale URL answered 200 with the landing page behind it — Search Console was
 * reporting 42 of them as soft 404s.
 */
function notFoundResponse(html: string): Response {
  const metaTags = buildMetaTags({
    title: `Page not found — ${SITE_NAME}`,
    description: 'This page could not be found.',
    url: buildSiteUrl('/'),
    canonical: buildSiteUrl('/'),
  });
  return new Response(injectIntoHtml(html, metaTags, NOT_FOUND_BODY), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
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

  // Only opening pages and /analyse get their head rewritten. Everything else
  // either belongs to the origin untouched or does not exist at all.
  if (!pathname.startsWith('/opening/') && pathname !== '/analyse') {
    // A real page the middleware has no metadata for, or anything that looks
    // like a file. The matcher already excludes every static file the build
    // emits, but a 404 served over a real asset is a worse failure than the
    // soft 404 this branch exists to fix, so the extension check earns its
    // line.
    if ((STATIC_ROUTES as readonly string[]).includes(pathname) || pathname.includes('.')) {
      return fetch(request);
    }
    return notFoundResponse(await fetchIndexHtml(url.origin));
  }

  let title = `${SITE_NAME} — Discover, explore and learn chess openings`;
  let description =
    'Explore 12,000+ chess openings with videos, studies, win rates, and practice tools.';
  const requestUrl = buildSiteUrl(pathname);
  let canonicalUrl = requestUrl;
  let body = '';
  let jsonLd: string | undefined;
  let status = 200;
  let degraded = false;

  if (pathname === '/analyse') {
    title = `Analyse Your Games — ${SITE_NAME}`;
    description =
      'Analyse your Chess.com and Lichess games to discover which openings you play and track your performance.';
  } else if (pathname.startsWith('/opening/')) {
    const fenEncoded = pathname.slice('/opening/'.length);
    let result: LookupResult;

    try {
      result = await getSeoEntry(url.origin, decodeURIComponent(fenEncoded));
    } catch {
      // Malformed percent-encoding: no position can exist at this URL.
      result = { status: 'missing' };
    }

    if (result.status === 'found') {
      const entry = result.entry;
      const [name, eco, moves, entryDescription, , , , , canonical, sharesName] = entry;
      const ecoLabel = eco ? ` (${eco})` : '';

      // 2,071 pages carry a name another page also has — different positions,
      // same ECO label. They are not duplicates and keep their own URL, but two
      // identical <title>s in a SERP are indistinguishable, so the sharers name
      // the line that reaches them. Every shared name separates this way.
      const disambiguator = sharesName && moves ? `: ${moves}` : '';
      title = `${name}${disambiguator}${ecoLabel} — ${SITE_NAME}`;

      // The opening's own writing, not a mail-merge sentence — and built by the
      // same helper the React page uses, because React 19 hoists its <meta> to
      // <head> beside this one instead of replacing it.
      description = buildOpeningDescription({ name, eco, moves, description: entryDescription });

      // Only a genuine duplicate gets a canonical: 271 URLs whose FEN differs
      // from another's in nothing but the move counters, so both address the
      // same board.
      if (canonical) {
        canonicalUrl = buildSiteUrl(`/opening/${encodeURIComponent(canonical)}`);
      }

      body = buildOpeningBody(entry, name, eco);
      jsonLd = buildOpeningJsonLd(name, description, canonicalUrl);
    } else if (result.status === 'missing') {
      // An unknown FEN used to return 200 with the landing page behind it —
      // a soft 404, and Search Console had started reporting them as such.
      status = 404;
      title = `Opening not found — ${SITE_NAME}`;
      description = 'This chess opening could not be found.';
      body =
        `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem">` +
        `<h1 style="font-family:'Bricolage Grotesque',serif;font-size:2rem;margin:0 0 .5rem">Opening not found</h1>` +
        `<p style="color:var(--color-text-secondary)">We could not find that position. <a href="/" style="color:var(--color-brand-orange)">Search the openings</a>.</p>` +
        `</main>`;
    } else {
      // 'unavailable': the shard did not load, which is not evidence the page
      // does not exist. Serve 200 and let the app render the position client
      // side — but this response carries the *landing page's* title and
      // description, so caching it for a day the way a good one is cached would
      // pin identical boilerplate onto every opening URL in the shard. That is
      // the duplicate-metadata failure this file exists to undo, so a degraded
      // response is held only long enough to absorb the incident.
      degraded = true;
    }
  }

  const html = await fetchIndexHtml(url.origin);

  const metaTags = buildMetaTags({
    title,
    description,
    url: requestUrl,
    canonical: canonicalUrl,
    jsonLd,
  });

  return new Response(injectIntoHtml(html, metaTags, body), {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // A good page is worth a day at the edge and a week stale. A 404 and a
      // degraded fallback are both provisional answers, so they get minutes,
      // not days — long enough to shield the origin through an incident,
      // short enough that recovery is not stuck behind a stale entry.
      'cache-control': degraded
        ? 's-maxage=60, stale-while-revalidate=60'
        : status === 404
          ? 's-maxage=3600, stale-while-revalidate=86400'
          : 's-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
