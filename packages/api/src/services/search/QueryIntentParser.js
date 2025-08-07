/**
 * Query Intent Parser - Extract semantic meaning from search queries
 */

const { SEMANTIC_MAPPINGS, QUERY_PATTERNS } = require('./SearchConstants');

class QueryIntentParser {
  /**
   * Parse query intent from natural language
   * @param {string} query - Normalized query string
   * @returns {Object} Query intent object
   */
  static parseIntent(query) {
    const intent = {
      type: 'unknown',
      modifiers: [],
      targetMoves: [],
      complexity: null,
      style: [],
      color: null,
      openingName: null,
      originalQuery: query
    };

    // Try each pattern matcher in order of specificity
    const matchers = [
      this.matchStyleOpenings,
      this.matchResponsePatterns,
      this.matchColorSpecific,
      this.matchComplexitySpecific,
      this.matchModifiedOpening,
      this.matchSemanticMappings
    ];

    for (const matcher of matchers) {
      const result = matcher.call(this, query);
      if (result.type !== 'unknown') {
        return { ...intent, ...result };
      }
    }

    return intent;
  }

  /**
   * Match style-based openings (e.g., "aggressive openings")
   */
  static matchStyleOpenings(query) {
    const match = query.match(QUERY_PATTERNS.STYLE_OPENINGS);
    if (match) {
      return {
        type: 'style_search',
        style: [match[1]]
      };
    }
    return { type: 'unknown' };
  }

  /**
   * Match response patterns (e.g., "solid response to d4")
   */
  static matchResponsePatterns(query) {
    const match = query.match(QUERY_PATTERNS.RESPONSE_TO);
    if (match) {
      const result = {
        type: 'response_search',
        targetMoves: this.extractMoves(match[3])
      };

      // Check for style modifiers
      const modifiers = this.extractStyleModifiers(query, match[0]);
      if (modifiers.length > 0) {
        result.modifiers = modifiers;
      }

      return result;
    }
    return { type: 'unknown' };
  }

  /**
   * Match color-specific searches (e.g., "attacking options for black")
   */
  static matchColorSpecific(query) {
    const match = query.match(QUERY_PATTERNS.COLOR_SPECIFIC);
    if (match) {
      return {
        type: 'color_specific',
        color: match[3],
        style: this.extractStylesFromText(match[1])
      };
    }
    return { type: 'unknown' };
  }

  /**
   * Match complexity-specific searches (e.g., "beginner french defense")
   */
  static matchComplexitySpecific(query) {
    const match = query.match(QUERY_PATTERNS.COMPLEXITY_SPECIFIC);
    if (match) {
      return {
        type: 'complexity_search',
        complexity: match[1],
        style: this.extractStylesFromText(match[2])
      };
    }
    return { type: 'unknown' };
  }

  /**
   * Match opening with style modifiers (e.g., "aggressive sicilian")
   */
  static matchModifiedOpening(query) {
    const match = query.match(QUERY_PATTERNS.OPENING_WITH_MODIFIER);
    if (match) {
      return {
        type: 'modified_opening',
        style: [match[1]],
        openingName: match[2]
      };
    }
    return { type: 'unknown' };
  }

  /**
   * Match direct semantic mappings
   */
  static matchSemanticMappings(query) {
    for (const [key, mappings] of Object.entries(SEMANTIC_MAPPINGS)) {
      if (query.includes(key) || mappings.some(mapping => query.includes(mapping))) {
        return {
          type: 'semantic_match',
          style: [key]
        };
      }
    }
    return { type: 'unknown' };
  }

  /**
   * Extract chess moves from text
   * @param {string} text - Text containing move references
   * @returns {Array} Array of move strings
   */
  static extractMoves(text) {
    const moves = [];
    const normalizedText = text.toLowerCase();
    
    // Direct move notation
    const moveMatches = text.match(/\b[a-h][1-8]\b|\b[NBRQK][a-h][1-8]\b/g);
    if (moveMatches) {
      moves.push(...moveMatches.map(move => move.toLowerCase()));
    }
    
    // Named move patterns
    const movePatterns = {
      'd4': ['d4', 'queen\'s pawn', 'queens pawn'],
      'e4': ['e4', 'king\'s pawn', 'kings pawn'],
      'c4': ['c4', 'english'],
      'nf3': ['nf3', 'reti'],
      'f4': ['f4', 'bird']
    };

    for (const [move, patterns] of Object.entries(movePatterns)) {
      if (patterns.some(pattern => normalizedText.includes(pattern))) {
        moves.push(move);
      }
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
   * Extract style modifiers from query based on matched pattern
   * @param {string} query - Full query
   * @param {string} matchedPattern - The matched pattern to look before
   * @returns {Array} Array of style modifiers
   */
  static extractStyleModifiers(query, matchedPattern) {
    const words = query.split(' ');
    const patternStart = query.indexOf(matchedPattern);
    const beforePattern = query.substring(0, patternStart).trim();
    
    if (beforePattern) {
      const potentialModifiers = beforePattern.split(' ');
      return potentialModifiers.filter(word => SEMANTIC_MAPPINGS[word.toLowerCase()]);
    }
    
    return [];
  }
}

module.exports = QueryIntentParser;
