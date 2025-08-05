const Fuse = require('fuse.js');
const { getOpenings } = require('./opening-data-service');

// Category mappings for enhanced discoverability
const STYLE_CATEGORIES = {
  'attacking': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice'],
  'positional': ['positional', 'strategic', 'quiet', 'closed', 'slow', 'maneuvering'],
  'solid': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound'],
  'dynamic': ['dynamic', 'unbalanced', 'complex', 'imbalanced', 'volatile'],
  'classical': ['classical', 'traditional', 'main line', 'principled'],
  'hypermodern': ['hypermodern', 'fianchetto', 'control center', 'flexible'],
  'beginner-friendly': ['beginner', 'simple', 'easy', 'fundamental', 'basic'],
  'advanced': ['advanced', 'theoretical', 'complex', 'difficult', 'expert']
};

// Fuse.js configuration for fuzzy search
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.4, // Lower = more strict matching
  ignoreLocation: true,
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'moves', weight: 0.3 },
    { name: 'style_tags', weight: 0.2 },
    { name: 'description', weight: 0.1 }
  ]
};

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
   * @returns {Array} Array of search results
   */
  async search(query, options = {}) {
    await this.initialize();
    
    if (!query || query.trim() === '') {
      return this.getAllOpenings(options);
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Perform fuzzy search
    const fuzzyResults = this.fuse.search(normalizedQuery);
    
    // Extract openings from fuzzy results
    let results = fuzzyResults.map(result => ({
      ...result.item,
      searchScore: 1 - result.score // Convert to positive score
    }));

    // Apply multi-pass filtering for enhanced results
    results = this.applyMultiPassFiltering(results, normalizedQuery);
    
    // Apply additional filters
    if (options.category) {
      results = this.filterByCategory(results, options.category);
    }
    
    // Apply pagination
    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;
    results = results.slice(offset, offset + limit);
    
    return {
      results,
      totalResults,
      hasMore: offset + limit < totalResults
    };
  }

  /**
   * Search by category for discovery
   * @param {string} category - The category to search for
   * @param {Object} options - Search options
   * @returns {Array} Array of categorized results
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
    
    // Sort by popularity if available
    const sortedResults = results.sort((a, b) => {
      const popularityA = a.analysis_json?.popularity_score || 0;
      const popularityB = b.analysis_json?.popularity_score || 0;
      return popularityB - popularityA;
    });
    
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
      const count = this.openings.filter(opening => {
        const styleTags = opening.analysis_json?.style_tags || [];
        const categoryTags = STYLE_CATEGORIES[category];
        return styleTags.some(tag => 
          categoryTags.some(categoryTag => 
            tag.toLowerCase().includes(categoryTag.toLowerCase())
          )
        );
      }).length;
      
      return {
        name: category,
        displayName: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
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
    
    const normalizedQuery = query.toLowerCase();
    const suggestions = new Set();
    
    // Add opening name suggestions
    this.openings.forEach(opening => {
      const name = opening.name.toLowerCase();
      if (name.includes(normalizedQuery)) {
        suggestions.add(opening.name);
      }
    });
    
    // Add move suggestions (first few moves)
    this.openings.forEach(opening => {
      const moves = opening.moves.toLowerCase();
      if (moves.includes(normalizedQuery)) {
        // Extract first few moves as suggestion
        const moveSequence = opening.moves.split(' ').slice(0, 4).join(' ');
        suggestions.add(moveSequence);
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Apply multi-pass filtering to enhance search results
   * @private
   */
  applyMultiPassFiltering(results, query) {
    // Split query into tokens for analysis
    const tokens = query.split(/\s+/).filter(token => token.length > 2);
    
    if (tokens.length < 2) {
      return results;
    }
    
    // Identify potential descriptive tags in query
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
    
    // If we have both descriptive tags and other tokens, re-rank results
    if (descriptiveTags.length > 0 && remainingTokens.length > 0) {
      return results.map(result => {
        const styleTags = result.analysis_json?.style_tags || [];
        const hasDescriptiveMatch = descriptiveTags.some(tag =>
          styleTags.some(styleTag => 
            styleTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        
        // Boost score for results that match descriptive tags
        if (hasDescriptiveMatch) {
          result.searchScore = Math.min(1, result.searchScore * 1.3);
        }
        
        return result;
      }).sort((a, b) => b.searchScore - a.searchScore);
    }
    
    return results;
  }

  /**
   * Filter results by category
   * @private
   */
  filterByCategory(results, category) {
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
   * Get all openings with basic sorting
   * @private
   */
  getAllOpenings(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    // Sort by popularity if available, otherwise by name
    const sorted = this.openings.sort((a, b) => {
      const popularityA = a.analysis_json?.popularity_score || 0;
      const popularityB = b.analysis_json?.popularity_score || 0;
      
      if (popularityA !== popularityB) {
        return popularityB - popularityA;
      }
      
      return a.name.localeCompare(b.name);
    });
    
    const totalResults = sorted.length;
    const results = sorted.slice(offset, offset + limit);
    
    return {
      results,
      totalResults,
      hasMore: offset + limit < totalResults
    };
  }
}

// Export singleton instance
module.exports = new SearchService();
