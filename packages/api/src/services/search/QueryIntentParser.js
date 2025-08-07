/**
 * Query Intent Parser - Natural language query understanding
 */

const { QUERY_PATTERNS, SEMANTIC_MAPPINGS } = require('./SearchConstants');
const QueryUtils = require('./QueryUtils');

class QueryIntentParser {
  /**
   * Parse query intent from natural language
   * @param {string} query - Normalized query string
   * @returns {Object} Query intent object
   */
  static parseQueryIntent(query) {
    const intent = {
      type: 'unknown',
      modifiers: [],
      targetMoves: [],
      complexity: null,
      style: [],
      color: null,
      originalQuery: query
    };

    // Check for style-based openings (e.g., "aggressive openings")
    const styleMatch = query.match(QUERY_PATTERNS.STYLE_OPENINGS);
    if (styleMatch) {
      intent.type = 'style_search';
      intent.style = [styleMatch[1]];
      return intent;
    }

    // Check for response patterns (e.g., "solid response to d4")
    const responseMatch = query.match(QUERY_PATTERNS.RESPONSE_TO);
    if (responseMatch) {
      intent.type = 'response_search';
      intent.targetMoves = QueryUtils.extractMoves(responseMatch[3]);
      
      // Check if there's a style modifier before "response"
      const words = query.split(' ');
      const responseIndex = words.findIndex(word => 
        ['response', 'defense', 'defence', 'counter'].includes(word)
      );
      
      if (responseIndex > 0) {
        const potentialModifier = words[responseIndex - 1];
        if (SEMANTIC_MAPPINGS[potentialModifier]) {
          intent.modifiers = [potentialModifier];
        }
      }
      
      return intent;
    }

    // Check for color-specific searches (e.g., "attacking options for black")
    const colorMatch = query.match(QUERY_PATTERNS.COLOR_SPECIFIC);
    if (colorMatch) {
      intent.type = 'color_specific';
      intent.color = colorMatch[3];
      
      // Parse the opening description part
      const openingPart = colorMatch[1];
      intent.style = QueryUtils.extractStylesFromText(openingPart);
      
      return intent;
    }

    // Check for complexity-specific searches (e.g., "beginner french defense")
    const complexityMatch = query.match(QUERY_PATTERNS.COMPLEXITY_SPECIFIC);
    if (complexityMatch) {
      intent.type = 'complexity_search';
      intent.complexity = complexityMatch[1];
      
      // Parse the opening part
      const openingPart = complexityMatch[2];
      intent.style = QueryUtils.extractStylesFromText(openingPart);
      
      return intent;
    }

    // Check for opening with style modifiers (e.g., "aggressive sicilian")
    const modifierMatch = query.match(QUERY_PATTERNS.OPENING_WITH_MODIFIER);
    if (modifierMatch) {
      intent.type = 'modified_opening';
      intent.style = [modifierMatch[1]];
      intent.openingName = modifierMatch[2];
      
      return intent;
    }

    // Check for direct semantic mapping matches
    for (const [key, mappings] of Object.entries(SEMANTIC_MAPPINGS)) {
      if (query.includes(key) || mappings.some(mapping => query.includes(mapping))) {
        intent.type = 'semantic_match';
        intent.style = [key];
        return intent;
      }
    }

    return intent;
  }
}

module.exports = QueryIntentParser;
