import { isChessMove, isEcoCode } from './searchQuery';

/**
 * Ranking against the locally held slice of the search index.
 *
 * This is not the app's search — the server is, and its answer always wins. All
 * this does is paint something the instant a key lands, on every surface, from
 * the shared slice in `searchIndex.ts`.
 *
 * It follows the server's bands deliberately, move for move: see
 * `packages/api/src/services/search/NameIndex.js` and `searchByMove` in
 * `search-service.js`. The point is that the provisional list and the list that
 * replaces it a moment later are the same list. When they disagree the results
 * visibly reshuffle under the cursor, which reads as the search changing its
 * mind — and it used to, because this file scored by a pile of additive bonuses
 * (name prefix 500, contains 250, a popularity boost capped at 100) while the
 * server banded and sorted by play count. `local-server-parity.test.ts` pins
 * the two together.
 *
 * The slice carries fen/name/eco/moves/games_analyzed and nothing else, which is
 * the other reason this was rewritten: the old scorer read `analysis_json`
 * descriptions and style tags that the search-index payload has never included.
 */

export interface Opening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
  scid?: string;
  aliases?: Record<string, string>;
  analysis_json?: {
    description?: string;
    style_tags?: string[];
    popularity?: number;
  };
  /** Number of games this opening was played */
  games_analyzed?: number;
  /** Rank based on games_analyzed */
  popularity_rank?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  /** Attached by the server so the caller can tell a tie from a clear winner. */
  searchScore?: number;
}

/** Names as people type them — see `normalise` in NameIndex.js, which this mirrors. */
function normalise(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/defence/g, 'defense')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BAND_EXACT = 4;
const BAND_WORDS = 3;
const BAND_TYPING = 2;
const BAND_SUBSTRING = 1;
const BAND_NONE = 0;

function nameBand(name: string, queryWords: string[], queryNorm: string): number {
  const norm = normalise(name);
  if (!norm) return BAND_NONE;
  const words = norm.split(' ');

  if (queryWords.length > 1 && norm === queryNorm) return BAND_EXACT;

  const isWord = (word: string) => words.includes(word);
  if (queryWords.every(isWord)) return BAND_WORDS;

  const last = queryWords.length - 1;
  const leadingAreWords = queryWords.every((word, i) => i === last || isWord(word));
  if (leadingAreWords && words.some((word) => word.startsWith(queryWords[last]))) {
    return BAND_TYPING;
  }

  if (queryWords.every((word) => norm.includes(word))) return BAND_SUBSTRING;

  return BAND_NONE;
}

/** Where the move falls in the line. Mirrors `searchByMove`. */
function moveBand(moves: string, move: string): number {
  const line = (moves || '').toLowerCase();
  if (
    line === `1. ${move}` ||
    line.startsWith(`1. ${move} `) ||
    line === `1.${move}` ||
    line.startsWith(`1.${move} `)
  ) {
    return 6;
  }
  if (line.includes(`1... ${move}`) || line.includes(`1...${move}`)) return 5;
  if (line.includes(`2. ${move}`) || line.includes(`2.${move}`)) return 4;
  if (line.includes(`2... ${move}`) || line.includes(`2...${move}`)) return 3;
  if (line.includes(` ${move} `) || line.includes(` ${move}.`) || line.includes(`${move} `))
    return 2;
  if (line.includes(move)) return 1;
  return 0;
}

/**
 * A band plus a popularity fraction, so one number carries both and sorting by
 * it is sorting by (band, play count). The fraction stays under 1 for anything
 * up to ten billion games, so a result can never climb into the band above.
 */
function score(band: number, games: number | undefined): number {
  return band + Math.log10(Math.max(games ?? 0, 0) + 1) / 10;
}

function ranked(scored: { opening: Opening; searchScore: number }[]): Opening[] {
  return scored
    .sort((a, b) => b.searchScore - a.searchScore)
    .map(({ opening, searchScore }) => ({ ...opening, searchScore }));
}

export function findAndRankOpenings(query: string, openingsData: Opening[]): Opening[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // An ECO code is an exact label, so every opening carrying it is equally a
  // match and popularity decides the order. Flat scores, like the server's, so
  // a saved opening can be promoted among what are genuinely ties.
  if (isEcoCode(trimmed)) {
    const code = trimmed.toUpperCase();
    return openingsData
      .filter((opening) => (opening.eco || '').trim().toUpperCase() === code)
      .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
      .map((opening) => ({ ...opening, searchScore: 1 }));
  }

  if (isChessMove(trimmed)) {
    const move = trimmed.toLowerCase();
    const scored = [];
    for (const opening of openingsData) {
      const band = moveBand(opening.moves, move);
      if (band > 0) scored.push({ opening, searchScore: score(band, opening.games_analyzed) });
    }
    return ranked(scored);
  }

  const queryNorm = normalise(trimmed);
  if (!queryNorm) return [];
  const queryWords = queryNorm.split(' ');

  const scored = [];
  for (const opening of openingsData) {
    const band = nameBand(opening.name, queryWords, queryNorm);
    if (band > BAND_NONE) {
      scored.push({ opening, searchScore: score(band, opening.games_analyzed) });
    }
  }
  return ranked(scored);
}
