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

  /**
   * Normalize a word for comparison - strips apostrophes, hyphens, and handles common variations
   * @param {string} word - Word to normalize
   * @returns {string} Normalized word
   */
  normalizeWord(word) {
    return word
      .toLowerCase()
      .replace(/[''`]/g, '')      // Remove apostrophes (king's -> kings)
      .replace(/-/g, '')           // Remove hyphens (neo-kings -> neokings)
      .replace(/defence/g, 'defense'); // Normalize British/American spelling
  }

  /**
   * Normalize all words in a string for comparison
   * @param {string} text - Text to normalize
   * @returns {string[]} Array of normalized words
   */
  normalizeWords(text) {
    return text.toLowerCase()
      .split(/[\s-]+/)  // Split on spaces and hyphens
      .map(w => this.normalizeWord(w))
      .filter(w => w.length > 0);
  }

  /**
   * Check if query word matches a name word (with normalization)
   * @param {string} queryWord - Normalized query word
   * @param {string} nameWord - Name word to check
   * @returns {string} Match type: 'exact', 'starts_with', 'contains', or 'none'
   */
  matchWord(queryWord, nameWord) {
    const normalizedName = this.normalizeWord(nameWord);
    if (normalizedName === queryWord) return 'exact';
    if (normalizedName.startsWith(queryWord)) return 'starts_with';
    if (normalizedName.includes(queryWord)) return 'contains';
    return 'none';
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

      // Check for style + move patterns FIRST (e.g., "attacking d4", "solid e4")
      // These should use semantic search even if they contain ambiguous terms
      const hasStyleAndMove = this.hasStyleWithMovePattern(normalizedQuery);
      if (hasStyleAndMove) {
        const semanticResults = await this.semanticSearch(normalizedQuery, sanitizedOptions);
        if (semanticResults.results.length > 0) {
          return semanticResults;
        }
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

      case 'style_with_move':
        // Filter by move (e.g., d4 openings) AND style (e.g., attacking)
        results = this.filterByOpeningMove(results, queryIntent.targetMoves);
        results = this.filterBySemanticStyle(results, queryIntent.style);
        break;
    }

    // Score and sort results
    return this.scoreSemanticResults(results, queryIntent);
  }

  /**
   * Filter openings by opening move
   * @param {Array} openings - Array of openings to filter
   * @param {Array} moves - Array of moves to filter by (e.g., ['d4'])
   * @returns {Array} Filtered openings
   */
  filterByOpeningMove(openings, moves) {
    if (!moves || moves.length === 0) return openings;

    return openings.filter(opening => {
      const openingMoves = opening.moves?.toLowerCase() || '';

      // Only match openings that START with this move as White's first move
      return moves.some(move => {
        const moveLower = move.toLowerCase();
        // Match as first white move (e.g., "1. d4" or "1.d4")
        return openingMoves.startsWith(`1. ${moveLower}`) ||
               openingMoves.startsWith(`1.${moveLower}`);
      });
    });
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
   * Uses normalized word comparison to handle apostrophes and spelling variants
   * @param {Array} results - Search results to enhance
   * @param {string} query - Original search query
   * @returns {Array} Enhanced results with name matching boost
   */
  applyNameMatchingBoost(results, query) {
    // Normalize query words
    const queryWordsNormalized = this.normalizeWords(query).filter(w => w.length > 2);
    const normalizedQuery = queryWordsNormalized.join(' ');

    return results.map(result => {
      const name = result.name || '';
      const nameWordsNormalized = this.normalizeWords(name);
      const normalizedName = nameWordsNormalized.join(' ');

      let nameMatchBoost = 0;
      let matchType = 'none';

      // Exact normalized match
      if (normalizedName === normalizedQuery) {
        nameMatchBoost = 2.0;
        matchType = 'exact';
      }
      // Name starts with query (only for multi-word queries that match full beginning)
      // Don't use for single-word queries to avoid "najdorf" matching "Najdorf Sicilian" over "Sicilian: Najdorf"
      else if (queryWordsNormalized.length > 1 && normalizedName.startsWith(normalizedQuery + ' ')) {
        nameMatchBoost = 1.5;
        matchType = 'starts_with';
      }
      // Single word query
      else if (queryWordsNormalized.length === 1) {
        const queryWord = queryWordsNormalized[0];
        const exactMatchIdx = nameWordsNormalized.findIndex(nw => nw === queryWord);

        if (exactMatchIdx >= 0) {
          // Exact word match anywhere - same base boost, let popularity differentiate
          // "Najdorf" in "Najdorf Sicilian" (1M) should NOT beat "Sicilian: Najdorf" (24M)
          nameMatchBoost = 0.6;
          matchType = exactMatchIdx === 0 ? 'first_word' : 'contains_word';
        } else if (nameWordsNormalized.some(nw => nw.startsWith(queryWord))) {
          nameMatchBoost = 0.3;
          matchType = 'word_starts_with';
        } else if (normalizedName.includes(queryWord)) {
          nameMatchBoost = 0.15;
          matchType = 'partial';
        }
      }
      // Multi-word query - check normalized word matches
      else {
        let exactMatches = 0;
        queryWordsNormalized.forEach(qw => {
          if (nameWordsNormalized.includes(qw)) {
            exactMatches++;
          }
        });

        const exactRatio = exactMatches / queryWordsNormalized.length;
        if (exactRatio >= 0.9) {
          nameMatchBoost = 1.0;
          matchType = 'all_words';
        } else if (exactRatio >= 0.5) {
          nameMatchBoost = exactRatio * 0.8;
          matchType = 'most_words';
        } else if (exactRatio > 0) {
          nameMatchBoost = exactRatio * 0.4;
          matchType = 'partial_words';
        }
      }

      // Apply popularity boost for name matches
      if (nameMatchBoost > 0) {
        const popularity = result.games_analyzed || 0;
        // Use log scale for popularity boost
        const popularityBoost = Math.log10(Math.max(popularity, 1)) * 0.2;
        nameMatchBoost += Math.min(2.0, popularityBoost);
      }

      result.searchScore = Math.min(5, result.searchScore + nameMatchBoost);
      return result;
    }).sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * Check if query contains a style + move pattern (e.g., "attacking d4", "solid e4")
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  hasStyleWithMovePattern(query) {
    const styleWords = ['attacking', 'aggressive', 'solid', 'defensive', 'tactical', 'positional', 'sharp', 'quiet'];
    const queryParts = query.split(/\s+/);
    const hasStyle = styleWords.some(s => queryParts.includes(s));
    const hasMovePattern = QueryUtils.extractMoves(query).length > 0;
    return hasStyle && hasMovePattern;
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
   * Uses normalized word comparison to handle apostrophes, hyphens, and spelling variants
   * @param {Array} results - Search results to enhance
   * @param {string} query - Original search query
   * @returns {Array} Enhanced results with popularity-first ranking
   */
  applyNameMatchingBoostWithPopularityEmphasis(results, query) {
    // Normalize query words once
    const queryWordsNormalized = this.normalizeWords(query).filter(w => w.length > 2);
    const normalizedQuery = queryWordsNormalized.join(' ');

    return results.map(result => {
      const name = result.name || '';
      const nameLower = name.toLowerCase();
      // Get both raw and normalized name words for matching
      const nameWordsNormalized = this.normalizeWords(name);

      let nameMatchBoost = 0;
      let matchType = 'none';
      let wordPrecisionScore = 0;

      // Check for exact normalized match (handles "King's Indian" == "kings indian")
      const normalizedName = nameWordsNormalized.join(' ');
      if (normalizedName === normalizedQuery) {
        nameMatchBoost = 2.0;
        matchType = 'exact';
        wordPrecisionScore = 1.0;
      }
      // Name starts with query (only for multi-word queries that match full beginning)
      // Don't use for single-word queries to avoid "najdorf" matching "Najdorf Sicilian" over "Sicilian: Najdorf"
      else if (queryWordsNormalized.length > 1 && normalizedName.startsWith(normalizedQuery + ' ')) {
        nameMatchBoost = 1.5;
        matchType = 'starts_with';
        wordPrecisionScore = 0.9;
      }
      // Single word query
      else if (queryWordsNormalized.length === 1) {
        const queryWord = queryWordsNormalized[0];

        // Check for exact word match at different positions
        const exactMatchIdx = nameWordsNormalized.findIndex(nw => nw === queryWord);

        if (exactMatchIdx >= 0) {
          // Exact word match anywhere - give same base boost, let popularity differentiate
          // "Najdorf" in "Najdorf Sicilian" (1M) should NOT beat "Sicilian Defense: Najdorf" (24M)
          nameMatchBoost = 0.8;
          matchType = exactMatchIdx === 0 ? 'first_word_exact' : 'contains_word_exact';
          // Both get high precision - we found the exact word
          wordPrecisionScore = 0.85;
        }
        // Check for word-start matches
        else if (nameWordsNormalized.some(nw => nw.startsWith(queryWord))) {
          nameMatchBoost = 0.4;
          matchType = 'word_starts_with';
          wordPrecisionScore = 0.5;
        }
        // Substring match (lowest priority)
        else if (normalizedName.includes(queryWord)) {
          nameMatchBoost = 0.1;
          matchType = 'partial_substring';
          wordPrecisionScore = 0.2;
        }
      }
      // Multi-word queries with normalized matching
      else if (queryWordsNormalized.length > 1) {
        let exactWordMatches = 0;
        let partialWordMatches = 0;
        let substringMatches = 0;

        queryWordsNormalized.forEach(qw => {
          // Check for exact word match (normalized)
          if (nameWordsNormalized.includes(qw)) {
            exactWordMatches++;
          }
          // Check for word-start match
          else if (nameWordsNormalized.some(nw => nw.startsWith(qw))) {
            partialWordMatches++;
          }
          // Check for substring match
          else if (normalizedName.includes(qw)) {
            substringMatches++;
          }
        });

        const totalQueryWords = queryWordsNormalized.length;
        const exactWordRatio = exactWordMatches / totalQueryWords;
        const partialWordRatio = partialWordMatches / totalQueryWords;
        const substringRatio = substringMatches / totalQueryWords;

        // Require good word precision for multi-word queries
        if (exactWordRatio >= 0.9) { // 90%+ exact (handles "kings indian" with 2 words)
          nameMatchBoost = 1.5;
          matchType = 'multi_word_excellent';
          wordPrecisionScore = 0.95;
        } else if (exactWordRatio >= 0.7) {
          nameMatchBoost = 1.2;
          matchType = 'multi_word_precise';
          wordPrecisionScore = exactWordRatio * 0.9;
        } else if (exactWordRatio >= 0.5) {
          nameMatchBoost = 0.8 * exactWordRatio + 0.3 * partialWordRatio;
          matchType = 'multi_word_good';
          wordPrecisionScore = exactWordRatio * 0.7 + partialWordRatio * 0.3;
        } else if (exactWordRatio + partialWordRatio >= 0.5) {
          nameMatchBoost = 0.4 * (exactWordRatio + partialWordRatio);
          matchType = 'multi_word_partial';
          wordPrecisionScore = (exactWordRatio + partialWordRatio) * 0.4;
        } else if (substringRatio > 0) {
          // Very low boost for poor matches
          nameMatchBoost = 0.05 * substringRatio;
          matchType = 'multi_word_poor';
          wordPrecisionScore = substringRatio * 0.05;
        }
      }

      // Apply popularity boost - stronger weighting for high-precision matches
      if (nameMatchBoost > 0) {
        const popularity = result.games_analyzed || 0;

        // Calculate popularity boost with continuous scaling
        // High precision matches get stronger popularity boost
        let popularityBoost = 0;

        if (wordPrecisionScore >= 0.7) {
          // High precision: popularity is major factor
          // Use log scale to prevent extreme dominance but still differentiate
          // 34.7M vs 6.2M games should result in clear ranking difference
          popularityBoost = Math.log10(Math.max(popularity, 1)) * 0.3 * wordPrecisionScore;
        } else if (wordPrecisionScore >= 0.4) {
          // Medium precision: moderate popularity boost
          popularityBoost = Math.log10(Math.max(popularity, 1)) * 0.15 * wordPrecisionScore;
        } else {
          // Low precision: minimal popularity boost
          popularityBoost = Math.log10(Math.max(popularity, 1)) * 0.05 * wordPrecisionScore;
        }

        nameMatchBoost += popularityBoost;
      }

      // Apply the boost to search score
      result.searchScore = Math.min(10, result.searchScore + nameMatchBoost);

      return result;
    }).sort((a, b) => b.searchScore - a.searchScore);
  }
}

// Export singleton instance
module.exports = new SearchService();
