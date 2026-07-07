/**
 * Variation-word extraction — shared between the video-match audit
 * (scripts/audit-video-matches.js) and the API's match-reason annotation
 * (review V2: "covers this variation" vs "family overview" badges).
 *
 * A page is a sub-variation page when its name has a "Family: Variation"
 * colon form; the distinguishing words are the variation-side tokens minus
 * generic chess classifiers and move numbers.
 */

const VARIATION_STOP_WORDS = new Set([
  'variation',
  'defense',
  'defence',
  'attack',
  'gambit',
  'system',
  'line',
  'opening',
  'game',
  'accepted',
  'declined',
]);

/**
 * Distinguishing words of the variation part of an opening name.
 * Returns [] for family-root names (no colon) — callers treat that as
 * "no variation to cover", so no badge is derived.
 * @param {string} openingName
 * @returns {string[]}
 */
function getVariationWords(openingName) {
  const colonIndex = (openingName || '').indexOf(':');
  if (colonIndex === -1) return [];

  return openingName
    .slice(colonIndex + 1)
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((word) => word.length > 4 && !/\d/.test(word) && !VARIATION_STOP_WORDS.has(word));
}

/**
 * Does a video title mention any of the variation's distinguishing words?
 * @param {string} title
 * @param {string[]} variationWords
 * @returns {boolean}
 */
function titleMentionsVariation(title, variationWords) {
  const lower = (title || '').toLowerCase();
  return variationWords.some((word) => lower.includes(word));
}

module.exports = { VARIATION_STOP_WORDS, getVariationWords, titleMentionsVariation };
