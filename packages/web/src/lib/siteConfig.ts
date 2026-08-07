export const SITE_NAME = 'Opening Book';
export const PRIMARY_SITE_URL = 'https://openingbook.xyz';
export const PRIMARY_SITE_HOST = 'openingbook.xyz';
export const LEGACY_VERCEL_HOST = 'openingbook.vercel.app';

export function buildSiteUrl(pathname = '/'): string {
  return new URL(pathname, PRIMARY_SITE_URL).toString();
}

/**
 * Google shows roughly 155 characters. Cut on a sentence boundary where one
 * lands in range, otherwise on a word — never mid-word, and never with the
 * ellipsis dangling after a comma.
 */
export function truncateForMeta(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;

  const window = clean.slice(0, limit + 1);
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '));
  if (sentenceEnd > limit * 0.55) return clean.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(' ');
  return clean.slice(0, wordEnd > 0 ? wordEnd : limit).replace(/[,;:]$/, '') + '…';
}

/**
 * The meta description for an opening page.
 *
 * `middleware.ts` writes this into the HTML Googlebot reads, and
 * `OpeningDetailPage` re-renders it after hydration — React 19 hoists the tag
 * to <head> alongside the one already there rather than replacing it, so if the
 * two ever disagreed the crawler's rendered DOM would carry both. They must
 * come from here.
 *
 * The template is the fallback, not the default: for a month every one of
 * 12,377 pages shipped that sentence and nothing else, and the set was
 * de-indexed on 30 July 2026 having earned a ~1% CTR.
 */
export function buildOpeningDescription(opening: {
  name?: string;
  eco?: string;
  moves?: string;
  description?: string;
}): string {
  if (opening.description) return truncateForMeta(opening.description);

  const name = opening.name || 'this chess opening';
  const ecoLabel = opening.eco ? ` (${opening.eco})` : '';
  // Only the opening moves, and truncated like any other description: the
  // lookup carries the full line now, and interpolating twenty plies raw would
  // push this well past the ~155 characters Google shows.
  const opening7 = opening.moves ? opening.moves.split(/\s+/).slice(0, 7).join(' ') : '';
  const moves = opening7 ? ` Played after ${opening7}.` : '';
  return truncateForMeta(
    `Explore the ${name}${ecoLabel}.${moves} Learn key ideas, watch videos, and practise this opening.`
  );
}
