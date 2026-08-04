/**
 * Literal name matching — which is what almost every search actually is.
 *
 * The search route ran every text query through Fuse over name, moves,
 * style_tags and description with `ignoreLocation` and a 0.4 threshold. Bitap
 * across 12,377 descriptions costs real time: "sicilian" took 1,046ms,
 * "king's indian defense" 2,489ms, "queen's gambit declined" 2,829ms. The
 * landing hero hid that behind a locally held index; the top bar and the mobile
 * overlay had nothing to hide it with, so the same two characters felt instant
 * in one box and hung for three seconds in another.
 *
 * It bought nothing, either. Fuzzy-matching "sicilian" against half-page
 * descriptions returned 4,269 of 12,377 openings — a third of the corpus as
 * "matches" — and the ranking work downstream existed to undo that noise.
 *
 * So: match names literally first, and keep Fuse for what only Fuse can do,
 * which is a typo. `search()` falls through to it when nothing here matches.
 */

/**
 * Names as people type them.
 *
 * Diacritics fold (nobody types "Sämisch"), apostrophes and punctuation drop
 * ("king's" and "kings" are the same word, and "Defense:" is not a word ending
 * in a colon), hyphens split ("Caro-Kann" is two words, and someone typing
 * "caro kann" means it), and British spelling normalises — the corpus itself
 * carries both "Defense" and "Defence" on the same opening.
 */
function normalise(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/defence/g, 'defense')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(text) {
  const normalised = normalise(text);
  return normalised ? normalised.split(' ') : [];
}

/**
 * How well a name answers the query, coarsely, in five bands.
 *
 * Bands rather than a score because the ordering inside one is not a matter of
 * text at all — it is popularity, and popularity is the thing users mean. Two
 * openings whose names both contain "najdorf" are equally named that; the one
 * played 24 million times is the one being asked for.
 *
 *   4  the name is the query          (phrases only, see below)
 *   3  every query word is a word of the name
 *   2  as 3, except the last word is still being typed
 *   1  every query word appears somewhere in the name
 *   0  no match
 *
 * Band 4 is deliberately withheld from single-word queries. One word is a
 * family, not an opening's name: "sicilian" is the name of a B30 line played
 * 8.7M times and also the first word of the Sicilian Defense played 693M times,
 * and the second is what the user means. A phrase — "queen's gambit declined" —
 * is someone naming a specific opening, so an exact hit leads.
 *
 * Band 2 is the as-you-type band. "kings ind" is not a word match on "King's
 * Indian Defense", but it is the King's Indian being typed, and it must not
 * rank below whatever band 1 sweeps up on a bare substring.
 */
const BAND_EXACT = 4;
const BAND_WORDS = 3;
const BAND_TYPING = 2;
const BAND_SUBSTRING = 1;
const BAND_NONE = 0;

function band(entry, queryWords, queryNorm) {
  if (queryWords.length > 1 && entry.norm === queryNorm) return BAND_EXACT;

  const isWord = (queryWord) => entry.words.includes(queryWord);
  if (queryWords.every(isWord)) return BAND_WORDS;

  const lastIndex = queryWords.length - 1;
  const leadingAreWords = queryWords.every((word, i) => i === lastIndex || isWord(word));
  if (leadingAreWords && entry.words.some((word) => word.startsWith(queryWords[lastIndex]))) {
    return BAND_TYPING;
  }

  if (queryWords.every((word) => entry.norm.includes(word))) return BAND_SUBSTRING;

  return BAND_NONE;
}

/**
 * A band plus a popularity fraction, so one number carries both.
 *
 * The fraction is `log10(games)/10`, which stays under 1 for anything up to ten
 * billion games and never lets a result reach the band above it. Sorting by this
 * is therefore sorting by (band, popularity), and `promoteSaved` on the client
 * gets a score whose 2% tie band means something: openings within roughly twice
 * each other's play count, in the same band, which is a pair the search has
 * genuinely not separated.
 */
function score(matchBand, games) {
  return matchBand + Math.log10(Math.max(games, 0) + 1) / 10;
}

/**
 * Precomputed once at startup, because the normalisation is the expensive half
 * and the corpus does not change between requests.
 */
class NameIndex {
  constructor(openings) {
    this.openings = openings;
    this.entries = openings.map((opening, position) => {
      const norm = normalise(opening.name);
      return {
        position,
        norm,
        words: norm ? norm.split(' ') : [],
        games: opening.games_analyzed || 0,
      };
    });
  }

  /**
   * Every opening whose name answers the query, best first.
   *
   * Returns `[]` rather than a weak guess when nothing matches literally — the
   * caller reads that as "this is a typo or a sentence" and hands over to the
   * fuzzy and semantic paths, which is the one thing they are better at.
   */
  search(query) {
    const queryNorm = normalise(query);
    if (!queryNorm) return [];
    const queryWords = queryNorm.split(' ');

    const matched = [];
    for (const entry of this.entries) {
      const matchBand = band(entry, queryWords, queryNorm);
      if (matchBand === BAND_NONE) continue;
      matched.push({ entry, searchScore: score(matchBand, entry.games) });
    }

    matched.sort((a, b) => b.searchScore - a.searchScore || a.entry.position - b.entry.position);

    return matched.map(({ entry, searchScore }) => ({
      ...this.openings[entry.position],
      searchScore,
    }));
  }
}

module.exports = { NameIndex, normalise, words };
