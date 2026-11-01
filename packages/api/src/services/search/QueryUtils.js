/**
 * Query Utilities - Helper functions for query analysis and parsing
 */

const {
  CHESS_MOVE_PATTERNS,
  ECO_CODE_PATTERN,
  STYLE_AXES,
  LEVEL_WORDS
} = require('./SearchConstants');

// Words around a level word that say nothing once it is gone: "openings for
// beginners", "e4 lines for intermediate players".
const LEVEL_FILLER = new Set(['opening', 'openings', 'line', 'lines', 'option', 'options']);

class QueryUtils {
  /**
   * Check if query looks like a chess move
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  static isChessMove(query) {
    return CHESS_MOVE_PATTERNS.some(pattern => pattern.test(query));
  }

  /**
   * Check if query is an ECO code
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  static isEcoCode(query) {
    return ECO_CODE_PATTERN.test(query);
  }

  /**
   * Extract chess moves from text (e.g., "d4", "1.e4", "king's pawn")
   * @param {string} text - Text containing move references
   * @returns {Array} Array of move strings
   */
  static extractMoves(text) {
    const moves = [];
    const normalizedText = text.toLowerCase();
    
    // Direct move notation (e.g., "d4", "e4", "nf3")
    const moveMatches = text.match(/\b[a-h][1-8]\b|\b[NBRQK][a-h][1-8]\b/g);
    if (moveMatches) {
      moves.push(...moveMatches.map(move => move.toLowerCase()));
    }
    
    // Named move patterns
    if (normalizedText.includes('d4') || normalizedText.includes('queen\'s pawn') || normalizedText.includes('queens pawn')) {
      moves.push('d4');
    }
    if (normalizedText.includes('e4') || normalizedText.includes('king\'s pawn') || normalizedText.includes('kings pawn')) {
      moves.push('e4');
    }
    if (normalizedText.includes('c4') || normalizedText.includes('english')) {
      moves.push('c4');
    }
    if (normalizedText.includes('nf3') || normalizedText.includes('reti')) {
      moves.push('nf3');
    }
    if (normalizedText.includes('f4') || normalizedText.includes('bird')) {
      moves.push('f4');
    }
    
    // "e4" is found twice, as notation and as a named move.
    return [...new Set(moves)];
  }

  /**
   * Extract style descriptors from text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of style tags
   */
  static extractStylesFromText(text) {
    const styles = [];
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      // STYLE_AXES only: it is what matching reads, so a word missing from it
      // matches nothing and would empty the results. "defense" is a
      // SEMANTIC_MAPPINGS key, and "advanced sicilian defense" used to filter
      // on it as a style.
      if (Object.hasOwn(STYLE_AXES, word)) {
        styles.push(word);
      }
    }
    
    return styles;
  }

  /**
   * Validate and sanitize search input
   * @param {string} query - Raw query input
   * @param {Object} options - Raw options input
   * @returns {Object} Validated and sanitized inputs
   */
  static validateAndSanitize(query, options = {}) {
    // Validate query
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }
    
    if (query.length > 200) {
      throw new Error('Query too long (max 200 characters)');
    }

    // Sanitize query
    const sanitizedQuery = query.trim();

    // Sanitize options
    const sanitizedOptions = {
      limit: Math.min(Math.max(Number(options.limit) || 50, 1), 100),
      offset: Math.max(Number(options.offset) || 0, 0),
      category: options.category ? String(options.category).toLowerCase() : undefined
    };

    return { query: sanitizedQuery, options: sanitizedOptions };
  }

  /**
   * The player level a query names, and what it asks for at that level:
   * "advanced sicilian defense" is { band: '1800', rest: 'sicilian defense' },
   * "openings for beginners" is { band: 'u1400', rest: '' }.
   * @param {string} query - Normalized query
   * @returns {{band: string, rest: string}|null}
   */
  static levelInQuery(query) {
    const words = query.split(/\s+/).filter(Boolean);
    const at = words.findIndex((word) => Object.hasOwn(LEVEL_WORDS, word));
    if (at === -1) return null;

    let from = at;
    let to = at + 1;
    if (['player', 'players'].includes(words[to])) to += 1;
    if (words[from - 1] === 'for') from -= 1;
    const rest = [...words.slice(0, from), ...words.slice(to)].filter(
      (word) => !LEVEL_FILLER.has(word)
    );
    return { band: LEVEL_WORDS[words[at]], rest: rest.join(' ') };
  }
}

module.exports = QueryUtils;
