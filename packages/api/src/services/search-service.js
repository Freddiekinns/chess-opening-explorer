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
const { NameIndex } = require('./search/NameIndex');

class SearchService {
  constructor() {
    this.fuse = null;
    this.nameIndex = null;
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

      // Names normalised once, since the corpus does not change between
      // requests and normalising is the expensive half of matching one.
      this.nameIndex = new NameIndex(this.openings);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  /**
   * Main search method supporting various query types.
   *
   * Five passes, each cheaper and more certain than the one after it, and the
   * first with anything to say wins: move, ECO code, name, meaning, spelling.
   *
   * It used to route on guesses about the query instead — `looksLikeOpeningName`
   * held a hand-written list of two dozen openings, `isAmbiguousSemanticTerm`
   * held a list of words that might be either. Both fed Fuse, which was the slow
   * path, so guessing wrong cost seconds. "aggressive openings" contains
   * "aggressive", so it was ruled ambiguous, sent to a fuzzy name search, and
   * came back in 2.4s with the Andersspike. Matching names literally first
   * removes the need to guess: if the query names an opening we know it, and if
   * it does not, meaning is the right next question.
   *
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

      // ECO codes need their own branch: `eco` is not one of FUSE_OPTIONS.keys
      // and a code is not a word in any opening's name, so before this existed
      // `B90` returned nothing at all against the 31 openings carrying it. Every
      // surface told the user to "try an ECO code" and pointed at a dead end.
      if (QueryUtils.isEcoCode(normalizedQuery)) {
        return this.searchByEcoCode(normalizedQuery, sanitizedOptions);
      }

      // Names, matched literally. Almost every search is one, and this answers
      // in single-digit milliseconds where the fuzzy path below took one to
      // three seconds — the whole of the gap between the landing hero (which
      // hid the wait behind a local index) and the top bar (which could not).
      const byName = this.searchByName(normalizedQuery, sanitizedOptions);
      if (byName.results.length > 0) {
        return byName;
      }

      // Nothing is named this, so the query is describing rather than naming:
      // "aggressive openings", "solid defence for black", "attacking d4".
      const semanticResults = await this.semanticSearch(normalizedQuery, sanitizedOptions);
      if (semanticResults.results.length > 0) {
        return semanticResults;
      }

      // Not a name and not a description. The remaining honest guess is that it
      // is a name spelled wrong, which is the one thing fuzzy matching is for.
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
   * Specialized search for ECO codes
   *
   * A code is an exact label, not a fuzzy one, so there is no scoring to do —
   * every opening carrying the code is equally a match and popularity decides
   * the order, which is the same rule the client used when it filtered its own
   * index. searchScore is flat by design: it says these results are ties, which
   * is what lets the caller promote a saved opening among them.
   *
   * @param {string} code - ECO code, already lowercased (e.g., "b90")
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async searchByEcoCode(code, options = {}) {
    await this.initialize();

    const target = code.toUpperCase();
    const results = this.openings
      .filter(opening => (opening.eco || '').trim().toUpperCase() === target)
      .map(opening => ({ ...opening, searchScore: 1 }))
      .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0));

    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;

    return {
      results: results.slice(offset, offset + limit),
      totalResults,
      hasMore: offset + limit < totalResults,
      searchType: 'eco_search'
    };
  }

  /**
   * Literal name search — the one nearly every query turns out to be.
   *
   * Ranking lives in `search/NameIndex.js`, which bands matches by how
   * completely the name answers the query and orders each band by how often the
   * opening is played. Synchronous on purpose: it runs on `initialize()`d state
   * and callers are already past the await.
   *
   * @param {string} query - Normalized query
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  searchByName(query, options = {}) {
    const results = this.nameIndex ? this.nameIndex.search(query) : [];
    const { limit = 50, offset = 0 } = options;
    const totalResults = results.length;

    return {
      results: results.slice(offset, offset + limit),
      totalResults,
      hasMore: offset + limit < totalResults,
      searchType: 'name_search',
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
    
    // Bands by where the move falls in the line, popularity ordering each band —
    // the same shape as the name search, so one score means one thing across
    // both. The bands used to be 10000/9000/…/3000 with a popularity term of
    // `Math.min(5000, games / 100000)`, which saturates at 500M games: every
    // opening starting 1.e4 scored an identical 15000 and "e4" was answered in
    // corpus order, with the 693M-game Sicilian above the 1.5B-game King's Pawn.
    const results = this.openings.map(opening => {
      const moves = opening.moves?.toLowerCase() || '';
      const moveLower = move.toLowerCase();
      let band = 0;

      // White's first move
      if (moves === `1. ${moveLower}` || moves.startsWith(`1. ${moveLower} `) ||
          moves === `1.${moveLower}` || moves.startsWith(`1.${moveLower} `)) {
        band = 6;
      }
      // Black's reply to it
      else if (moves.includes(`1... ${moveLower}`) || moves.includes(`1...${moveLower}`)) {
        band = 5;
      }
      // White's second
      else if (moves.includes(`2. ${moveLower}`) || moves.includes(`2.${moveLower}`)) {
        band = 4;
      }
      // Black's second
      else if (moves.includes(`2... ${moveLower}`) || moves.includes(`2...${moveLower}`)) {
        band = 3;
      }
      // Played later in the line
      else if (moves.includes(` ${moveLower} `) || moves.includes(` ${moveLower}.`) || moves.includes(`${moveLower} `)) {
        band = 2;
      }
      // Appears somewhere in the notation
      else if (moves.includes(moveLower)) {
        band = 1;
      }

      const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;

      return {
        ...opening,
        searchScore: band === 0 ? 0 : band + Math.log10(Math.max(popularity, 0) + 1) / 10
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
      
      // Popularity, on a log scale, as the tiebreak.
      //
      // It was `Math.min(0.1, popularity / 10000)`, which saturates at a
      // thousand games — so every opening above that threshold scored
      // identically and a style search fell back to corpus order. "aggressive
      // openings" led with the Amar Gambit and the Andersspike; the openings
      // people actually play aggressively were thousands of rows down. The
      // divisor keeps the whole spread under 0.2, which is what one style match
      // is worth, so popularity orders equals without outranking a better match.
      const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;
      score += Math.log10(Math.max(popularity, 0) + 1) / 50;
      
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

      // Exact normalized match
      if (normalizedName === normalizedQuery) {
        nameMatchBoost = 2.0;
      }
      // Name starts with query (only for multi-word queries that match full beginning)
      // Don't use for single-word queries to avoid "najdorf" matching "Najdorf Sicilian" over "Sicilian: Najdorf"
      else if (queryWordsNormalized.length > 1 && normalizedName.startsWith(normalizedQuery + ' ')) {
        nameMatchBoost = 1.5;
      }
      // Single word query
      else if (queryWordsNormalized.length === 1) {
        const queryWord = queryWordsNormalized[0];
        const exactMatchIdx = nameWordsNormalized.findIndex(nw => nw === queryWord);

        if (exactMatchIdx >= 0) {
          // Exact word match anywhere - same base boost, let popularity differentiate
          // "Najdorf" in "Najdorf Sicilian" (1M) should NOT beat "Sicilian: Najdorf" (24M)
          nameMatchBoost = 0.6;
        } else if (nameWordsNormalized.some(nw => nw.startsWith(queryWord))) {
          nameMatchBoost = 0.3;
        } else if (normalizedName.includes(queryWord)) {
          nameMatchBoost = 0.15;
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
        } else if (exactRatio >= 0.5) {
          nameMatchBoost = exactRatio * 0.8;
        } else if (exactRatio > 0) {
          nameMatchBoost = exactRatio * 0.4;
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
}

// Export singleton instance
module.exports = new SearchService();
