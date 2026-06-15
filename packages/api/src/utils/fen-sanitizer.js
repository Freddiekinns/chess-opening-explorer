/**
 * FEN → filesystem/index-key sanitisation, shared by the video pipeline
 * (static file generation) and the API (lookups against the generated keys).
 *
 * The legacy scheme lowercased the whole FEN, which destroys the case
 * distinction between White and Black pieces — 4 pairs of distinct ECO
 * positions collide and silently overwrite each other's video files. The
 * current scheme escapes each uppercase letter as '0' + lowercase letter,
 * which is injective: '0' never directly precedes a letter in a sanitised
 * FEN except via this escape.
 *
 * Lookups should try sanitizeFenKey first and fall back to
 * legacySanitizeFenKey so indexes generated before the fix keep working.
 */

function assertFen(fen) {
  if (!fen || typeof fen !== 'string') {
    throw new Error('FEN must be a non-empty string');
  }
}

/**
 * Case-preserving sanitised key for a FEN string.
 * @param {string} fen
 * @returns {string} key safe for filenames ([a-z0-9_-] only)
 */
function sanitizeFenKey(fen) {
  assertFen(fen);

  return fen
    .trim()
    .replace(/\//g, '_')
    .replace(/\s+/g, '-')
    .replace(/[A-Z]/g, (letter) => `0${letter.toLowerCase()}`);
}

/**
 * The pre-fix lowercase scheme. Kept for fallback lookups against indexes
 * and static files generated before the case-collision fix.
 * @param {string} fen
 * @returns {string}
 */
function legacySanitizeFenKey(fen) {
  assertFen(fen);

  return fen.replace(/\//g, '_').replace(/\s+/g, '-').toLowerCase();
}

module.exports = { sanitizeFenKey, legacySanitizeFenKey };
