/**
 * Query Utilities - Helper functions for query analysis and parsing
 */

const { 
  CHESS_MOVE_PATTERNS, 
  OPENING_NAME_PATTERNS, 
  AMBIGUOUS_TERMS,
  SEMANTIC_MAPPINGS 
} = require('./SearchConstants');

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
   * Check if query looks like an opening name rather than a natural language query
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  static looksLikeOpeningName(query) {
    return OPENING_NAME_PATTERNS.some(pattern => pattern.test(query));
  }

  /**
   * Check if a term is ambiguous between semantic and name search
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  static isAmbiguousSemanticTerm(query) {
    return AMBIGUOUS_TERMS.some(term => query.includes(term));
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
    
    return moves;
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
      if (SEMANTIC_MAPPINGS[word]) {
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
}

module.exports = QueryUtils;
