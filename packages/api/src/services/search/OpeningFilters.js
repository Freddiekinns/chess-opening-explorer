/**
 * Opening Filters - Specialized filtering logic for different search criteria
 */

const { SEMANTIC_MAPPINGS, STYLE_CATEGORIES } = require('./SearchConstants');

class OpeningFilters {
  /**
   * Filter openings by semantic style tags
   * @param {Array} openings - Array of openings to filter
   * @param {Array} styles - Array of style descriptors
   * @returns {Array} Filtered openings
   */
  static filterBySemanticStyle(openings, styles) {
    if (!styles || styles.length === 0) return openings;
    
    return openings.filter(opening => {
      const allTags = this.extractAllStyleTags(opening);
      
      return styles.some(style => {
        const semanticMappings = SEMANTIC_MAPPINGS[style] || [style];
        return semanticMappings.some(mapping => 
          allTags.some(tag => tag.includes(mapping.toLowerCase()))
        );
      });
    });
  }

  /**
   * Filter openings that respond to specific moves
   * @param {Array} openings - Array of openings to filter
   * @param {Array} targetMoves - Array of moves being responded to
   * @param {Array} modifiers - Style modifiers for the response
   * @returns {Array} Filtered openings
   */
  static filterByResponseToMoves(openings, targetMoves, modifiers = []) {
    if (!targetMoves || targetMoves.length === 0) return openings;
    
    const filtered = openings.filter(opening => {
      const moves = opening.moves?.toLowerCase() || '';
      
      // Check if this opening starts with or responds to the target moves
      return targetMoves.some(move => {
        const movePattern = move.toLowerCase();
        // For responses, we want openings that contain the target move but aren't just that move
        return moves.includes(movePattern) && !moves.startsWith(`1. ${movePattern}`);
      });
    });
    
    // Apply style modifiers if specified
    if (modifiers.length > 0) {
      return this.filterBySemanticStyle(filtered, modifiers);
    }
    
    return filtered;
  }

  /**
   * Filter openings by color (white/black)
   * @param {Array} openings - Array of openings to filter
   * @param {string} color - 'white' or 'black'
   * @returns {Array} Filtered openings
   */
  static filterByColor(openings, color) {
    if (!color) return openings;
    
    return openings.filter(opening => {
      const moves = opening.moves?.toLowerCase() || '';
      
      if (color === 'white') {
        // White openings typically start with "1." 
        return moves.match(/^1\.\s*[a-h1-8]/);
      } else if (color === 'black') {
        // Black responses typically have both white and black moves
        return moves.includes('1...') || moves.match(/1\.\s*\w+\s+\w+/);
      }
      
      return true;
    });
  }

  /**
   * Filter openings by complexity level
   * @param {Array} openings - Array of openings to filter
   * @param {string} complexity - Complexity level
   * @returns {Array} Filtered openings
   */
  static filterByComplexity(openings, complexity) {
    if (!complexity) return openings;
    
    const targetComplexity = complexity.charAt(0).toUpperCase() + complexity.slice(1);
    
    return openings.filter(opening => {
      const openingComplexity = opening.analysis_json?.complexity;
      return openingComplexity === targetComplexity;
    });
  }

  /**
   * Filter openings by name (partial match)
   * @param {Array} openings - Array of openings to filter
   * @param {string} name - Opening name to search for
   * @returns {Array} Filtered openings
   */
  static filterByOpeningName(openings, name) {
    if (!name) return openings;
    
    const namePattern = name.toLowerCase();
    
    return openings.filter(opening => {
      const openingName = opening.name?.toLowerCase() || '';
      const aliases = opening.aliases || {};
      const aliasValues = Object.values(aliases).join(' ').toLowerCase();
      
      return openingName.includes(namePattern) || aliasValues.includes(namePattern);
    });
  }

  /**
   * Filter results by category
   * @param {Array} results - Results to filter
   * @param {string} category - Category name
   * @returns {Array} Filtered results
   */
  static filterByCategory(results, category) {
    const categoryTags = STYLE_CATEGORIES[category.toLowerCase()];
    if (!categoryTags) {
      return results;
    }
    
    return results.filter(opening => {
      const styleTags = opening.analysis_json?.style_tags || [];
      return styleTags.some(tag => 
        categoryTags.some(categoryTag => 
          tag.toLowerCase().includes(categoryTag.toLowerCase())
        )
      );
    });
  }

  /**
   * Apply multi-pass filtering to enhance search results
   * @param {Array} results - Initial results
   * @param {string} query - Original query
   * @returns {Array} Enhanced results
   */
  static applyMultiPassFiltering(results, query) {
    const tokens = query.split(/\s+/).filter(token => token.length > 2);
    
    if (tokens.length < 2) {
      return results;
    }
    
    const { descriptiveTags, remainingTokens } = this.categorizeTokens(tokens);
    
    // Re-rank if we have both descriptive and other tokens
    if (descriptiveTags.length > 0 && remainingTokens.length > 0) {
      return this.boostDescriptiveMatches(results, descriptiveTags);
    }
    
    return results;
  }

  /**
   * Extract all style tags from an opening
   * @private
   */
  static extractAllStyleTags(opening) {
    const styleTags = opening.analysis_json?.style_tags || [];
    const tacticalTags = opening.analysis_json?.tactical_tags || [];
    const positionalTags = opening.analysis_json?.positional_tags || [];
    return [...styleTags, ...tacticalTags, ...positionalTags].map(tag => tag.toLowerCase());
  }

  /**
   * Categorize query tokens into descriptive tags and other tokens
   * @private
   */
  static categorizeTokens(tokens) {
    const descriptiveTags = [];
    const remainingTokens = [];
    
    tokens.forEach(token => {
      const isDescriptive = Object.values(STYLE_CATEGORIES)
        .flat()
        .some(tag => tag.toLowerCase().includes(token.toLowerCase()));
      
      if (isDescriptive) {
        descriptiveTags.push(token);
      } else {
        remainingTokens.push(token);
      }
    });

    return { descriptiveTags, remainingTokens };
  }

  /**
   * Boost results that match descriptive tags
   * @private
   */
  static boostDescriptiveMatches(results, descriptiveTags) {
    return results.map(result => {
      const styleTags = result.analysis_json?.style_tags || [];
      const hasDescriptiveMatch = descriptiveTags.some(tag =>
        styleTags.some(styleTag => 
          styleTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      
      if (hasDescriptiveMatch) {
        result.searchScore = Math.min(1, result.searchScore * 1.3);
      }
      
      return result;
    }).sort((a, b) => b.searchScore - a.searchScore);
  }
}

module.exports = OpeningFilters;
