/**
 * Search Scorer - Calculate relevance scores for search results
 */

const { SCORING_WEIGHTS } = require('./SearchConstants');

class SearchScorer {
  /**
   * Score and sort semantic search results
   * @param {Array} results - Filtered results
   * @param {Object} queryIntent - Original query intent
   * @returns {Array} Scored and sorted results
   */
  static scoreSemanticResults(results, queryIntent) {
    return results.map(opening => {
      const score = this.calculateSemanticScore(opening, queryIntent);
      
      return {
        ...opening,
        searchScore: Math.min(1, score)
      };
    }).sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * Calculate semantic relevance score for an opening
   * @param {Object} opening - Opening data
   * @param {Object} queryIntent - Query intent
   * @returns {number} Relevance score
   */
  static calculateSemanticScore(opening, queryIntent) {
    let score = SCORING_WEIGHTS.BASE_SEMANTIC_SCORE;
    
    // Style matching bonus
    if (queryIntent.style?.length > 0) {
      score += this.calculateStyleMatchScore(opening, queryIntent.style);
    }
    
    // Complexity matching bonus
    if (queryIntent.complexity) {
      score += this.calculateComplexityMatchScore(opening, queryIntent.complexity);
    }
    
    // Move pattern matching bonus
    if (queryIntent.targetMoves?.length > 0) {
      score += this.calculateMoveMatchScore(opening, queryIntent.targetMoves);
    }
    
    // Opening name matching bonus
    if (queryIntent.openingName) {
      score += this.calculateNameMatchScore(opening, queryIntent.openingName);
    }
    
    // Popularity bonus
    score += this.calculatePopularityBonus(opening);
    
    return score;
  }

  /**
   * Calculate style matching score
   * @private
   */
  static calculateStyleMatchScore(opening, styles) {
    const styleTags = opening.analysis_json?.style_tags || [];
    const exactMatches = styles.filter(style =>
      styleTags.some(tag => tag.toLowerCase().includes(style.toLowerCase()))
    );
    
    return exactMatches.length * SCORING_WEIGHTS.EXACT_STYLE_MATCH;
  }

  /**
   * Calculate complexity matching score
   * @private
   */
  static calculateComplexityMatchScore(opening, complexity) {
    const targetComplexity = complexity.charAt(0).toUpperCase() + complexity.slice(1);
    if (opening.analysis_json?.complexity === targetComplexity) {
      return SCORING_WEIGHTS.COMPLEXITY_MATCH;
    }
    return 0;
  }

  /**
   * Calculate move pattern matching score
   * @private
   */
  static calculateMoveMatchScore(opening, targetMoves) {
    const moves = opening.moves?.toLowerCase() || '';
    const moveMatches = targetMoves.filter(move =>
      moves.includes(move.toLowerCase())
    );
    
    return moveMatches.length * SCORING_WEIGHTS.MOVE_PATTERN_MATCH;
  }

  /**
   * Calculate opening name matching score
   * @private
   */
  static calculateNameMatchScore(opening, openingName) {
    const name = opening.name?.toLowerCase() || '';
    if (name.includes(openingName.toLowerCase())) {
      return SCORING_WEIGHTS.NAME_MATCH;
    }
    return 0;
  }

  /**
   * Calculate popularity bonus
   * @private
   */
  static calculatePopularityBonus(opening) {
    const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;
    return Math.min(SCORING_WEIGHTS.POPULARITY_BOOST_MAX, popularity / 10000);
  }

  /**
   * Convert fuzzy search scores to positive scores
   * @param {Array} fuzzyResults - Results from Fuse.js
   * @returns {Array} Results with positive search scores
   */
  static convertFuzzyScores(fuzzyResults) {
    return fuzzyResults.map(result => ({
      ...result.item,
      searchScore: 1 - result.score // Convert to positive score
    }));
  }
}

module.exports = SearchScorer;
