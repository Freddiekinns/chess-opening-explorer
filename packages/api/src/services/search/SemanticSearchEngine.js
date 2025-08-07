/**
 * Semantic Search Engine - Handles intent-based search logic
 */

const QueryIntentParser = require('./QueryIntentParser');
const OpeningFilters = require('./OpeningFilters');
const SearchScorer = require('./SearchScorer');

class SemanticSearchEngine {
  /**
   * Perform semantic search based on query intent
   * @param {string} query - Search query
   * @param {Array} openings - Available openings
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  static async search(query, openings, options = {}) {
    const normalizedQuery = query.toLowerCase().trim();
    const queryIntent = QueryIntentParser.parseIntent(normalizedQuery);
    
    // If no semantic intent detected, return empty results
    if (queryIntent.type === 'unknown') {
      return { 
        results: [], 
        totalResults: 0, 
        hasMore: false, 
        searchType: 'no_semantic_match' 
      };
    }
    
    // Apply semantic filtering
    let results = this.applySemanticFiltering(openings, queryIntent);
    
    // Apply additional filters
    if (options.category) {
      results = OpeningFilters.filterByCategory(results, options.category);
    }
    
    // Score and sort results
    results = SearchScorer.scoreSemanticResults(results, queryIntent);
    
    // Apply pagination
    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      totalResults,
      hasMore: offset + limit < totalResults,
      searchType: `semantic_${queryIntent.type}`,
      queryIntent
    };
  }

  /**
   * Apply semantic filtering based on query intent
   * @param {Array} openings - All openings
   * @param {Object} queryIntent - Parsed query intent
   * @returns {Array} Filtered openings
   */
  static applySemanticFiltering(openings, queryIntent) {
    const filterStrategies = {
      'style_search': () => OpeningFilters.filterBySemanticStyle(openings, queryIntent.style),
      'semantic_match': () => OpeningFilters.filterBySemanticStyle(openings, queryIntent.style),
      'response_search': () => OpeningFilters.filterByResponseToMoves(openings, queryIntent.targetMoves, queryIntent.modifiers),
      'color_specific': () => this.handleColorSpecificSearch(openings, queryIntent),
      'complexity_search': () => this.handleComplexitySearch(openings, queryIntent),
      'modified_opening': () => this.handleModifiedOpeningSearch(openings, queryIntent)
    };

    const strategy = filterStrategies[queryIntent.type];
    return strategy ? strategy() : openings;
  }

  /**
   * Handle color-specific search with optional style filtering
   * @private
   */
  static handleColorSpecificSearch(openings, queryIntent) {
    let results = OpeningFilters.filterByColor(openings, queryIntent.color);
    
    if (queryIntent.style?.length > 0) {
      results = OpeningFilters.filterBySemanticStyle(results, queryIntent.style);
    }
    
    return results;
  }

  /**
   * Handle complexity search with optional style filtering
   * @private
   */
  static handleComplexitySearch(openings, queryIntent) {
    let results = OpeningFilters.filterByComplexity(openings, queryIntent.complexity);
    
    if (queryIntent.style?.length > 0) {
      results = OpeningFilters.filterBySemanticStyle(results, queryIntent.style);
    }
    
    return results;
  }

  /**
   * Handle modified opening search (name + style)
   * @private
   */
  static handleModifiedOpeningSearch(openings, queryIntent) {
    let results = OpeningFilters.filterByOpeningName(openings, queryIntent.openingName);
    results = OpeningFilters.filterBySemanticStyle(results, queryIntent.style);
    
    return results;
  }
}

module.exports = SemanticSearchEngine;
