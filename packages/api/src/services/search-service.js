const Fuse = require('fuse.js');
const { getOpenings } = require('./opening-data-service');

// Import search modules
const { 
  SEMANTIC_MAPPINGS, 
  STYLE_CATEGORIES, 
  FUSE_OPTIONS 
} = require('./search/SearchConstants');
const QueryUtils = require('./search/QueryUtils');
const QueryIntentParser = require('./search/QueryIntentParser');

class SearchService {
  constructor() {
    this.fuse = null;
    this.openings = null;
    this.popularitySorted = null;
    this.initialized = false;
    this.popularCache = new Map(); // Cache for popular search results
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.openings = await getOpenings();
      
      // Pre-sort by popularity for better performance
      this.popularitySorted = [...this.openings].sort((a, b) => {
        const popularityA = a.analysis_json?.popularity_score || 0;
        const popularityB = b.analysis_json?.popularity_score || 0;
        
        if (popularityA !== popularityB) {
          return popularityB - popularityA;
        }
        
        return a.name.localeCompare(b.name);
      });
      
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
    try {
      await this.initialize();
      
      // Validate and sanitize inputs
      const { query: sanitizedQuery, options: sanitizedOptions } = 
        QueryUtils.validateAndSanitize(query, options);
      
      if (!sanitizedQuery || sanitizedQuery === '') {
        return this.getAllOpenings(sanitizedOptions);
      }

      const normalizedQuery = sanitizedQuery.toLowerCase().trim();
      
      // Check if this is a chess move query and handle specially
      if (QueryUtils.isChessMove(normalizedQuery)) {
        return this.searchByMove(normalizedQuery, sanitizedOptions);
      }
      
      // Enhanced search routing: for ambiguous terms like "attacking" or "gambit"
      // try popularity-based name search first, then semantic search if poor results
      const looksLikeOpeningName = QueryUtils.looksLikeOpeningName(normalizedQuery);
      const isAmbiguousTerm = QueryUtils.isAmbiguousSemanticTerm(normalizedQuery);
      
      // For ambiguous terms, ALWAYS try name search first with word-precision matching
      // This ensures queries like "kings indian" get proper name matching instead of fuzzy
      if (isAmbiguousTerm) {
        const nameSearchResults = await this.tryNameSearchFirst(normalizedQuery, sanitizedOptions);
        if (nameSearchResults && nameSearchResults.results.length > 0) {
          // Always return name search results for ambiguous terms to get word-precision matching
          // This fixes "kings indian" and other similar routing issues
          return {
            ...nameSearchResults,
            searchType: 'popularity_first'
          };
        }
      }
      
      // Use semantic search for clear natural language queries
      if (!looksLikeOpeningName && !isAmbiguousTerm) {
        const semanticResults = await this.semanticSearch(normalizedQuery, sanitizedOptions);
        if (semanticResults.results.length > 0) {
          return semanticResults;
        }
      }
      
      // Use fuzzy search with enhanced name matching for opening names
      const fuzzyResults = this.fuse.search(normalizedQuery);
      
      // Extract openings from fuzzy results and enhance with name-based scoring
      let results = fuzzyResults.map(result => ({
        ...result.item,
        searchScore: 1 - result.score // Convert to positive score
      }));

      // Apply enhanced name matching boost
      results = this.applyNameMatchingBoost(results, normalizedQuery);

      // Apply multi-pass filtering for enhanced results
      results = this.applyMultiPassFiltering(results, normalizedQuery);
      
      // Apply additional filters
      if (sanitizedOptions.category) {
        results = this.filterByCategory(results, sanitizedOptions.category);
      }
      
      // Apply pagination
      const { limit, offset } = sanitizedOptions;
      const totalResults = results.length;
      results = results.slice(offset, offset + limit);
      
      return {
        results,
        totalResults,
        hasMore: offset + limit < totalResults,
        searchType: 'fuzzy'
      };
      
    } catch (error) {
      console.error('Search error:', { query, error: error.message });
      
      // Return graceful fallback
      return {
        results: [],
        totalResults: 0,
        hasMore: false,
        error: 'Search temporarily unavailable',
        searchType: 'error'
      };
    }
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
    const queryIntent = QueryIntentParser.parseQueryIntent(normalizedQuery);
    
    let results = [];
    let searchType = 'semantic';
    
    // Apply semantic filtering based on detected intent
    if (queryIntent.type !== 'unknown') {
      results = this.applySemanticFiltering(queryIntent);
      searchType = `semantic_${queryIntent.type}`;
    } else {
      // If no specific intent detected, fall back to enhanced fuzzy search
      return { results: [], totalResults: 0, hasMore: false, searchType: 'no_semantic_match' };
    }
    
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
      hasMore: offset + limit < totalResults,
      searchType,
      queryIntent
    };
  }

  /**
   * Specialized search for chess moves
   * @param {string} move - Chess move (e.g., "d4", "nf3")
   * @param {Object} options - Search options
   * @returns {Array} Array of search results
   */
  async searchByMove(move, options = {}) {
    await this.initialize();
    
    const results = this.openings.map(opening => {
      let score = 0;
      const moves = opening.moves?.toLowerCase() || '';
      const moveLower = move.toLowerCase();
      
      // Exact opening move (highest priority) - check for exact match at start
      if (moves === `1. ${moveLower}` || moves.startsWith(`1. ${moveLower} `) || 
          moves === `1.${moveLower}` || moves.startsWith(`1.${moveLower} `)) {
        score = 10000; // Much higher base score for exact opening moves
      }
      // Second move for white
      else if (moves.includes(`2. ${moveLower}`) || moves.includes(`2.${moveLower}`)) {
        score = 8000;
      }
      // Black's first response
      else if (moves.includes(`1... ${moveLower}`) || moves.includes(`1...${moveLower}`)) {
        score = 9000;
      }
      // Black's second move
      else if (moves.includes(`2... ${moveLower}`) || moves.includes(`2...${moveLower}`)) {
        score = 7000;
      }
      // Move appears anywhere in sequence
      else if (moves.includes(` ${moveLower} `) || moves.includes(` ${moveLower}.`) || moves.includes(`${moveLower} `)) {
        score = 5000;
      }
      // Partial match
      else if (moves.includes(moveLower)) {
        score = 3000;
      }
      
      // Significant popularity boost for move searches - popularity is crucial for moves
      if (score > 0) {
        const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;
        // Much larger popularity boost - popularity should be primary ranking factor
        score += Math.min(5000, popularity / 100000); // Scale popularity properly
      }
      
      return {
        ...opening,
        searchScore: score / 10000 // Normalize to 0-1+ range
      };
    })
    .filter(opening => opening.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
    
    // Apply additional filters
    if (options.category) {
      const filtered = this.filterByCategory(results, options.category);
      const totalResults = filtered.length;
      const { limit = 50, offset = 0 } = options;
      
      return {
        results: filtered.slice(offset, offset + limit),
        totalResults,
        hasMore: offset + limit < totalResults,
        searchType: 'move_search'
      };
    }
    
    // Apply pagination
    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults,
      totalResults,
      hasMore: offset + limit < totalResults,
      searchType: 'move_search'
    };
  }

  /**
   * Enhanced semantic search with natural language understanding
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Array} Array of search results
   */
  async semanticSearch(query, options = {}) {
    await this.initialize();
    
    const normalizedQuery = query.toLowerCase().trim();
    const queryIntent = QueryIntentParser.parseQueryIntent(normalizedQuery);
    
    let results = [];
    let searchType = 'semantic';
    
    // Apply semantic filtering based on detected intent
    if (queryIntent.type !== 'unknown') {
      results = this.applySemanticFiltering(queryIntent);
      searchType = `semantic_${queryIntent.type}`;
    } else {
      // If no specific intent detected, fall back to enhanced fuzzy search
      return { results: [], totalResults: 0, hasMore: false, searchType: 'no_semantic_match' };
    }
    
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
      hasMore: offset + limit < totalResults,
      searchType,
      queryIntent
    };
  }

  /**
   * Get all openings with basic sorting (uses pre-sorted cache)
   * @private
   */
  getAllOpenings(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    // Use pre-sorted popularity cache for better performance
    const totalResults = this.popularitySorted.length;
    const results = this.popularitySorted.slice(offset, offset + limit);
    
    return {
      results,
      totalResults,
      hasMore: offset + limit < totalResults
    };
  }

  /**
   * Apply semantic filtering based on query intent
   * @param {Object} queryIntent - Parsed query intent
   * @returns {Array} Filtered and scored results
   */
  applySemanticFiltering(queryIntent) {
    let results = [...this.openings];
    
    // Apply filters based on intent type
    switch (queryIntent.type) {
      case 'style_search':
      case 'semantic_match':
        results = this.filterBySemanticStyle(results, queryIntent.style);
        break;
        
      case 'response_search':
        results = this.filterByResponseToMoves(results, queryIntent.targetMoves, queryIntent.modifiers);
        break;
        
      case 'color_specific':
        results = this.filterByColor(results, queryIntent.color);
        if (queryIntent.style.length > 0) {
          results = this.filterBySemanticStyle(results, queryIntent.style);
        }
        break;
        
      case 'complexity_search':
        results = this.filterByComplexity(results, queryIntent.complexity);
        if (queryIntent.style.length > 0) {
          results = this.filterBySemanticStyle(results, queryIntent.style);
        }
        break;
        
      case 'modified_opening':
        results = this.filterByOpeningName(results, queryIntent.openingName);
        results = this.filterBySemanticStyle(results, queryIntent.style);
        break;
    }
    
    // Score and sort results
    return this.scoreSemanticResults(results, queryIntent);
  }

  /**
   * Filter openings by semantic style tags
   * @param {Array} openings - Array of openings to filter
   * @param {Array} styles - Array of style descriptors
   * @returns {Array} Filtered openings
   */
  filterBySemanticStyle(openings, styles) {
    if (!styles || styles.length === 0) return openings;
    
    return openings.filter(opening => {
      const styleTags = opening.analysis_json?.style_tags || [];
      const tacticalTags = opening.analysis_json?.tactical_tags || [];
      const positionalTags = opening.analysis_json?.positional_tags || [];
      const allTags = [...styleTags, ...tacticalTags, ...positionalTags].map(tag => tag.toLowerCase());
      
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
  filterByResponseToMoves(openings, targetMoves, modifiers = []) {
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
    
    // If modifiers are specified, filter further
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
  filterByColor(openings, color) {
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
  filterByComplexity(openings, complexity) {
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
  filterByOpeningName(openings, name) {
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
   * Score and sort semantic search results
   * @param {Array} results - Filtered results
   * @param {Object} queryIntent - Original query intent
   * @returns {Array} Scored and sorted results
   */
  scoreSemanticResults(results, queryIntent) {
    return results.map(opening => {
      let score = 0.5; // Base semantic score
      
      // Boost for exact style matches
      if (queryIntent.style && queryIntent.style.length > 0) {
        const styleTags = opening.analysis_json?.style_tags || [];
        const exactMatches = queryIntent.style.filter(style =>
          styleTags.some(tag => tag.toLowerCase().includes(style.toLowerCase()))
        );
        score += exactMatches.length * 0.2;
      }
      
      // Boost for complexity matches
      if (queryIntent.complexity) {
        const targetComplexity = queryIntent.complexity.charAt(0).toUpperCase() + queryIntent.complexity.slice(1);
        if (opening.analysis_json?.complexity === targetComplexity) {
          score += 0.3;
        }
      }
      
      // Boost for move pattern matches
      if (queryIntent.targetMoves && queryIntent.targetMoves.length > 0) {
        const moves = opening.moves?.toLowerCase() || '';
        const moveMatches = queryIntent.targetMoves.filter(move =>
          moves.includes(move.toLowerCase())
        );
        score += moveMatches.length * 0.25;
      }
      
      // Boost for name matches in modified opening searches
      if (queryIntent.openingName) {
        const name = opening.name?.toLowerCase() || '';
        if (name.includes(queryIntent.openingName.toLowerCase())) {
          score += 0.4;
        }
      }
      
      // Popularity boost
      const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;
      score += Math.min(0.1, popularity / 10000); // Small popularity boost
      
      return {
        ...opening,
        searchScore: Math.min(1, score)
      };
    }).sort((a, b) => b.searchScore - a.searchScore);
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
   * Check if query looks like an opening name rather than a natural language query
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  looksLikeOpeningName(query) {
    // Common opening name patterns that shouldn't trigger semantic search
    const openingNamePatterns = [
      /\b(queen'?s?\s+gambit|queens?\s+gambit)\b/i,
      /\b(king'?s?\s+indian|kings?\s+indian)\b/i,
      /\b(french\s+defense|french\s+defence)\b/i,
      /\b(sicilian\s+defense|sicilian\s+defence)\b/i,
      /\b(caro\s*-?\s*kann)\b/i,
      /\b(english\s+opening)\b/i,
      /\b(ruy\s+lopez)\b/i,
      /\b(italian\s+game)\b/i,
      /\b(vienna\s+game)\b/i,
      /\b(scotch\s+game)\b/i,
      /\b(alekhine'?s?\s+defense|alekhines?\s+defense)\b/i,
      /\b(scandinavian\s+defense)\b/i,
      /\b(pirc\s+defense)\b/i,
      /\b(modern\s+defense)\b/i,
      /\b(bird'?s?\s+opening|birds?\s+opening)\b/i,
      /\b(nimzo\s*-?\s*indian)\b/i,
      /\b(gr[üu]nfeld\s+defense)\b/i,
      /\b(benoni\s+defense)\b/i,
      /\b(catalan\s+opening)\b/i,
      /\b(dutch\s+defense)\b/i,
      /\b(london\s+system)\b/i,
      /\b(torre\s+attack)\b/i,
      /\b(colle\s+system)\b/i
    ];
    
    return openingNamePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Apply enhanced name matching boost for better opening name search
   * @param {Array} results - Search results to enhance
   * @param {string} query - Original search query
   * @returns {Array} Enhanced results with name matching boost
   */
  applyNameMatchingBoost(results, query) {
    return results.map(result => {
      const name = result.name?.toLowerCase() || '';
      const queryWords = query.split(/\s+/).filter(word => word.length > 2);
      let nameMatchBoost = 0;
      let matchType = 'none';
      
      // Exact name match gets huge boost
      if (name === query) {
        nameMatchBoost = 2.0;
        matchType = 'exact';
      }
      // Name starts with query gets large boost
      else if (name.startsWith(query)) {
        nameMatchBoost = 1.5;
        matchType = 'starts_with';
      }
      // Query matches complete words in name (e.g., "french defense" vs "owens defense french")
      else if (queryWords.length === 1) {
        // For single word queries, prioritize when the word appears as a complete word at start
        const queryWord = queryWords[0];
        const nameWords = name.split(/\s+/);
        
        if (nameWords[0] === queryWord) {
          // Word appears as first word (e.g., "French Defense")
          nameMatchBoost = 1.2;
          matchType = 'first_word';
        } else if (nameWords.includes(queryWord)) {
          // Word appears somewhere else (e.g., "Owens Defense French")
          nameMatchBoost = 0.4;
          matchType = 'contains_word';
        } else if (name.includes(queryWord)) {
          // Partial word match
          nameMatchBoost = 0.2;
          matchType = 'partial';
        }
      }
      // All query words present in name gets medium boost
      else if (queryWords.every(word => name.includes(word))) {
        nameMatchBoost = 0.8;
        matchType = 'all_words';
      }
      // Most query words present gets small boost
      else {
        const matchedWords = queryWords.filter(word => name.includes(word));
        if (matchedWords.length > 0) {
          nameMatchBoost = (matchedWords.length / queryWords.length) * 0.5;
          matchType = 'partial_words';
        }
      }
      
      // Apply significant popularity boost for name matches - popularity should dominate
      if (nameMatchBoost > 0) {
        const popularity = result.games_analyzed || result.analysis_json?.popularity_score || 0;
        
        // Much larger popularity scaling for name searches
        let popularityBoost;
        if (matchType === 'exact' || matchType === 'starts_with' || matchType === 'first_word') {
          // For high-quality name matches, popularity is very important
          popularityBoost = Math.min(2.0, popularity / 50000000); // Scale for major openings
        } else {
          // For partial matches, still significant but smaller boost
          popularityBoost = Math.min(1.0, popularity / 100000000);
        }
        
        nameMatchBoost += popularityBoost;
      }
      
      // Apply the boost to search score
      result.searchScore = Math.min(3, result.searchScore + nameMatchBoost);
      
      return result;
    }).sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * Check if a term is ambiguous between semantic and name search
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  isAmbiguousSemanticTerm(query) {
    // Terms that could be both semantic descriptors and parts of opening names
    const ambiguousTerms = [
      'attacking', 'aggressive', 'tactical', 'sharp', 'solid', 'defensive',
      'gambit', 'defense', 'defence', 'opening', 'variation', 'system',
      'classical', 'modern', 'hypermodern', 'dynamic', 'positional',
      // Add specific opening name patterns that need popularity-first search
      'indian', 'kings', 'queens'  // These cause cross-contamination issues
    ];
    
    return ambiguousTerms.some(term => query.includes(term));
  }

  /**
   * Try name search first for ambiguous terms, prioritizing popularity
   * @param {string} query - Search query  
   * @param {Object} options - Search options
   * @returns {Object} Search results or null if poor results
   */
  async tryNameSearchFirst(query, options = {}) {
    // Use fuzzy search with enhanced name matching
    const fuzzyResults = this.fuse.search(query);
    
    if (fuzzyResults.length === 0) {
      return null;
    }
    
    // Extract openings from fuzzy results and enhance with name-based scoring
    let results = fuzzyResults.map(result => ({
      ...result.item,
      searchScore: 1 - result.score // Convert to positive score
    }));

    // Apply enhanced name matching boost with extra popularity emphasis
    results = this.applyNameMatchingBoostWithPopularityEmphasis(results, query);

    // Apply multi-pass filtering for enhanced results
    results = this.applyMultiPassFiltering(results, query);
    
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
      hasMore: offset + limit < totalResults,
      searchType: 'name_search_first'
    };
  }

  /**
   * Enhanced name matching with extra popularity emphasis for ambiguous terms
   * @param {Array} results - Search results to enhance
   * @param {string} query - Original search query
   * @returns {Array} Enhanced results with popularity-first ranking
   */
  applyNameMatchingBoostWithPopularityEmphasis(results, query) {
    return results.map(result => {
      const name = result.name?.toLowerCase() || '';
      const queryWords = query.split(/\s+/).filter(word => word.length > 2);
      let nameMatchBoost = 0;
      let matchType = 'none';
      let wordPrecisionScore = 0; // New: measure how precisely words match
      
      // Exact name match gets huge boost
      if (name === query) {
        nameMatchBoost = 2.0;
        matchType = 'exact';
        wordPrecisionScore = 1.0;
      }
      // Name starts with query gets large boost
      else if (name.startsWith(query)) {
        nameMatchBoost = 1.5;
        matchType = 'starts_with';
        wordPrecisionScore = 0.9;
      }
      // Enhanced word-level matching with precision scoring
      else if (queryWords.length === 1) {
        const queryWord = queryWords[0];
        const nameWords = name.split(/\s+/);
        
        // Check for exact word matches first (highest precision)
        if (nameWords[0] === queryWord) {
          nameMatchBoost = 1.2;
          matchType = 'first_word_exact';
          wordPrecisionScore = 0.8;
        } else if (nameWords.includes(queryWord)) {
          nameMatchBoost = 0.6;
          matchType = 'contains_word_exact';
          wordPrecisionScore = 0.7;
        }
        // Check for word-start matches (medium precision)
        else if (nameWords.some(word => word.startsWith(queryWord))) {
          nameMatchBoost = 0.4;
          matchType = 'word_starts_with';
          wordPrecisionScore = 0.5;
        }
        // Check for partial word matches (lowest precision, penalized)
        else if (name.includes(queryWord)) {
          // CRITICAL FIX: Much lower boost for partial matches to prevent "kings" matching "queens"
          nameMatchBoost = 0.1;
          matchType = 'partial_substring';
          wordPrecisionScore = 0.2;
        }
      }
      // Multi-word queries: require better word-level precision
      else if (queryWords.length > 1) {
        const nameWords = name.split(/\s+/);
        let exactWordMatches = 0;
        let partialWordMatches = 0;
        let substringMatches = 0;
        
        queryWords.forEach(queryWord => {
          if (nameWords.includes(queryWord)) {
            exactWordMatches++;
          } else if (nameWords.some(word => word.startsWith(queryWord))) {
            partialWordMatches++;
          } else if (name.includes(queryWord)) {
            substringMatches++;
          }
        });
        
        // Calculate precision-based scoring
        const totalQueryWords = queryWords.length;
        const exactWordRatio = exactWordMatches / totalQueryWords;
        const partialWordRatio = partialWordMatches / totalQueryWords;
        const substringRatio = substringMatches / totalQueryWords;
        
        // CRITICAL FIX: Require much higher precision for multi-word queries
        // For "kings gambit", we need BOTH words to match well, not just 50%
        if (exactWordRatio >= 0.8) { // At least 80% of words match exactly
          nameMatchBoost = 1.2 * exactWordRatio + 0.3 * partialWordRatio + 0.1 * substringRatio;
          matchType = 'multi_word_precise';
          wordPrecisionScore = exactWordRatio * 0.9 + partialWordRatio * 0.3;
        } else if (exactWordRatio >= 0.6) { // At least 60% exact matches
          nameMatchBoost = 0.8 * exactWordRatio + 0.4 * partialWordRatio + 0.1 * substringRatio;
          matchType = 'multi_word_good';
          wordPrecisionScore = exactWordRatio * 0.7 + partialWordRatio * 0.4;
        } else if (partialWordRatio + exactWordRatio >= 0.6) { // 60% partial+exact combined
          nameMatchBoost = 0.4 * (exactWordRatio + partialWordRatio) + 0.1 * substringRatio;
          matchType = 'multi_word_partial';
          wordPrecisionScore = (exactWordRatio * 0.6 + partialWordRatio * 0.3);
        } else if (substringRatio > 0) {
          // Very low boost for poor matches like "kings gambit" -> "queen's gambit"
          nameMatchBoost = 0.1 * substringRatio;
          matchType = 'multi_word_poor';
          wordPrecisionScore = substringRatio * 0.1;
        }
      }
      
      // Apply precision-adjusted popularity boost
      if (nameMatchBoost > 0) {
        const popularity = result.games_analyzed || result.analysis_json?.popularity_score || 0;
        
        // Precision-weighted popularity scaling
        // Higher word precision gets more popularity boost
        let basePopularityMultiplier = wordPrecisionScore;
        
        // Tiered popularity boosts, but now scaled by word precision
        let popularityBoost = 0;
        if (popularity >= 100000000) { // 100M+ games
          popularityBoost = 3.0 * basePopularityMultiplier;
        } else if (popularity >= 50000000) { // 50M+ games  
          popularityBoost = 2.5 * basePopularityMultiplier;
        } else if (popularity >= 10000000) { // 10M+ games
          popularityBoost = 2.0 * basePopularityMultiplier;
        } else if (popularity >= 1000000) { // 1M+ games
          popularityBoost = 1.5 * basePopularityMultiplier;
        } else if (popularity >= 100000) { // 100K+ games
          popularityBoost = 1.0 * basePopularityMultiplier;
        } else if (popularity >= 10000) { // 10K+ games
          popularityBoost = 0.5 * basePopularityMultiplier;
        }
        
        nameMatchBoost += popularityBoost;
      }
      
      // Apply the boost to search score
      result.searchScore = Math.min(5, result.searchScore + nameMatchBoost);
      result._debugMatchType = matchType; // For debugging
      result._debugWordPrecision = wordPrecisionScore;
      
      return result;
    }).sort((a, b) => b.searchScore - a.searchScore);
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
