/**
 * Refactored Search Service - Clean, modular semantic search implementation
 */

const Fuse = require('fuse.js');
const { getOpenings } = require('../opening-data-service');

// Import search modules
const SemanticSearchEngine = require('./search/SemanticSearchEngine');
const OpeningFilters = require('./search/OpeningFilters');
const SearchScorer = require('./search/SearchScorer');
const { FUSE_OPTIONS, STYLE_CATEGORIES } = require('./search/SearchConstants');

class SearchService {
  constructor() {
    this.fuse = null;
    this.openings = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.openings = await getOpenings();
      
      // Prepare search index with flattened data
      const searchIndex = this.openings.map(opening => ({
        ...opening,
        style_tags: opening.analysis_json?.style_tags?.join(' ') || '',
        description: opening.analysis_json?.description || ''
      }));
      
      this.fuse = new Fuse(searchIndex, FUSE_OPTIONS);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  /**
   * Main search method supporting various query types
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async search(query, options = {}) {
    await this.initialize();
    
    if (!query || query.trim() === '') {
      return this.getAllOpenings(options);
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Try semantic search first
    const semanticResults = await SemanticSearchEngine.search(normalizedQuery, this.openings, options);
    if (semanticResults.results.length > 0) {
      return semanticResults;
    }
    
    // Fallback to fuzzy search
    return this.performFuzzySearch(normalizedQuery, options);
  }

  /**
   * Enhanced semantic search with natural language understanding
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async semanticSearch(query, options = {}) {
    await this.initialize();
    
    const normalizedQuery = query.toLowerCase().trim();
    return SemanticSearchEngine.search(normalizedQuery, this.openings, options);
  }

  /**
   * Perform fuzzy search as fallback
   * @private
   */
  performFuzzySearch(query, options) {
    const fuzzyResults = this.fuse.search(query);
    
    // Convert scores and apply multi-pass filtering
    let results = SearchScorer.convertFuzzyScores(fuzzyResults);
    results = OpeningFilters.applyMultiPassFiltering(results, query);
    
    // Apply additional filters
    if (options.category) {
      results = OpeningFilters.filterByCategory(results, options.category);
    }
    
    // Apply pagination
    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      totalResults,
      hasMore: offset + limit < totalResults,
      searchType: 'fuzzy'
    };
  }

  /**
   * Search by category for discovery
   * @param {string} category - The category to search for
   * @param {Object} options - Search options
   * @returns {Object} Categorized search results
   */
  async searchByCategory(category, options = {}) {
    await this.initialize();
    
    const categoryTags = STYLE_CATEGORIES[category.toLowerCase()];
    if (!categoryTags) {
      throw new Error(`Unknown category: ${category}`);
    }
    
    const results = this.openings.filter(opening => {
      const styleTags = opening.analysis_json?.style_tags || [];
      return styleTags.some(tag => 
        categoryTags.some(categoryTag => 
          tag.toLowerCase().includes(categoryTag.toLowerCase())
        )
      );
    });
    
    // Sort by popularity
    const sortedResults = this.sortByPopularity(results);
    
    // Apply pagination
    const { limit = 50, offset = 0 } = options;
    const totalResults = sortedResults.length;
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      totalResults,
      hasMore: offset + limit < totalResults,
      category
    };
  }

  /**
   * Get all available categories
   * @returns {Array} Array of category objects with counts
   */
  async getCategories() {
    await this.initialize();
    
    const categories = Object.keys(STYLE_CATEGORIES).map(category => {
      const count = this.countCategoryOpenings(category);
      
      return {
        name: category,
        displayName: this.formatCategoryName(category),
        count
      };
    });
    
    return categories.filter(category => category.count > 0);
  }

  /**
   * Get autocomplete suggestions
   * @param {string} query - Partial query
   * @param {number} limit - Maximum suggestions
   * @returns {Array} Array of suggestions
   */
  async getSuggestions(query, limit = 10) {
    await this.initialize();
    
    if (!query || query.length < 2) {
      return [];
    }
    
    const suggestions = this.generateSuggestions(query);
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get all openings with basic sorting
   * @private
   */
  getAllOpenings(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const sorted = this.sortByPopularity(this.openings);
    const totalResults = sorted.length;
    const results = sorted.slice(offset, offset + limit);
    
    return {
      results,
      totalResults,
      hasMore: offset + limit < totalResults
    };
  }

  /**
   * Sort openings by popularity
   * @private
   */
  sortByPopularity(openings) {
    return openings.sort((a, b) => {
      const popularityA = a.analysis_json?.popularity_score || 0;
      const popularityB = b.analysis_json?.popularity_score || 0;
      
      if (popularityA !== popularityB) {
        return popularityB - popularityA;
      }
      
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Count openings in a category
   * @private
   */
  countCategoryOpenings(category) {
    const categoryTags = STYLE_CATEGORIES[category];
    return this.openings.filter(opening => {
      const styleTags = opening.analysis_json?.style_tags || [];
      return styleTags.some(tag => 
        categoryTags.some(categoryTag => 
          tag.toLowerCase().includes(categoryTag.toLowerCase())
        )
      );
    }).length;
  }

  /**
   * Format category name for display
   * @private
   */
  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
  }

  /**
   * Generate autocomplete suggestions
   * @private
   */
  generateSuggestions(query) {
    const normalizedQuery = query.toLowerCase();
    const suggestions = new Set();
    
    // Add opening name suggestions
    this.openings.forEach(opening => {
      const name = opening.name.toLowerCase();
      if (name.includes(normalizedQuery)) {
        suggestions.add(opening.name);
      }
    });
    
    // Add move sequence suggestions
    this.openings.forEach(opening => {
      const moves = opening.moves.toLowerCase();
      if (moves.includes(normalizedQuery)) {
        const moveSequence = opening.moves.split(' ').slice(0, 4).join(' ');
        suggestions.add(moveSequence);
      }
    });
    
    return suggestions;
  }
}

// Export singleton instance
module.exports = new SearchService();
