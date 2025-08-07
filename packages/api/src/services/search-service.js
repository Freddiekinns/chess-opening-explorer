const Fuse = require('fuse.js');
const { getOpenings } = require('./opening-data-service');

// Enhanced semantic mappings for natural language search
const SEMANTIC_MAPPINGS = {
  // Style-based intent mappings
  'aggressive': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice', 'risky', 'dynamic'],
  'attacking': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice', 'kingside attack'],
  'solid': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound', 'positional'],
  'defensive': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound', 'counterattack'],
  'positional': ['positional', 'strategic', 'quiet', 'closed', 'slow', 'maneuvering', 'solid'],
  'tactical': ['tactical', 'sharp', 'aggressive', 'sacrifice', 'attacking', 'combination'],
  'dynamic': ['dynamic', 'unbalanced', 'complex', 'imbalanced', 'volatile', 'sharp'],
  'classical': ['classical', 'traditional', 'main line', 'principled', 'standard'],
  'hypermodern': ['hypermodern', 'fianchetto', 'control center', 'flexible', 'modern'],
  
  // Complexity-based mappings
  'beginner': ['beginner', 'simple', 'easy', 'fundamental', 'basic', 'elementary'],
  'intermediate': ['intermediate', 'moderate', 'standard'],
  'advanced': ['advanced', 'theoretical', 'complex', 'difficult', 'expert', 'master'],
  
  // Opening move patterns
  'queens pawn': ['d4', 'queen\'s pawn', 'queens pawn'],
  'kings pawn': ['e4', 'king\'s pawn', 'kings pawn'],
  'english': ['c4', 'english'],
  'reti': ['nf3', 'reti'],
  'bird': ['f4', 'bird'],
  
  // Response patterns
  'response to d4': ['d4', 'queen\'s pawn'],
  'response to e4': ['e4', 'king\'s pawn'],
  'defense': ['defense', 'defence', 'defensive'],
  'counter': ['counter', 'counterattack', 'counter-attack'],
  
  // Color-specific searches
  'for white': ['white'],
  'for black': ['black'],
  'black options': ['black'],
  'white openings': ['white']
};

// Legacy category mappings (kept for backward compatibility)
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

// Common query patterns and their intents
const QUERY_PATTERNS = {
  // Pattern: "X openings" or "X for Y"
  STYLE_OPENINGS: /^(aggressive|attacking|solid|defensive|positional|tactical|dynamic|classical|hypermodern|beginner|advanced|simple|complex)\s+(openings?|for\s+\w+|options?)$/i,
  
  // Pattern: "response to X" or "defense against X"
  RESPONSE_TO: /^(response|defense|defence|counter)\s+(to|against)\s+(.+)$/i,
  
  // Pattern: "X for color"
  COLOR_SPECIFIC: /^(.+)\s+(for|as)\s+(white|black)$/i,
  
  // Pattern: "beginner/advanced X"
  COMPLEXITY_SPECIFIC: /^(beginner|intermediate|advanced|simple|complex)\s+(.+)$/i,
  
  // Pattern: specific opening names with modifiers
  OPENING_WITH_MODIFIER: /^(aggressive|solid|tactical|positional|sharp|quiet)\s+(.+)$/i
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
    
    // Check if this is a chess move query and handle specially
    if (this.isChessMove(normalizedQuery)) {
      return this.searchByMove(normalizedQuery, options);
    }
    
    // Enhanced search routing: for ambiguous terms like "attacking" or "gambit"
    // try popularity-based name search first, then semantic search if poor results
    const looksLikeOpeningName = this.looksLikeOpeningName(normalizedQuery);
    const isAmbiguousTerm = this.isAmbiguousSemanticTerm(normalizedQuery);
    
    // For ambiguous terms, ALWAYS try name search first with word-precision matching
    // This ensures queries like "kings indian" get proper name matching instead of fuzzy
    if (isAmbiguousTerm) {
      const nameSearchResults = await this.tryNameSearchFirst(normalizedQuery, options);
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
      const semanticResults = await this.semanticSearch(normalizedQuery, options);
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
      searchType: 'fuzzy'
    };
  }

  /**
   * Check if query looks like a chess move
   * @param {string} query - Normalized query
   * @returns {boolean}
   */
  isChessMove(query) {
    const movePatterns = [
      /^[a-h][1-8]$/, // Pawn moves: e4, d4, etc.
      /^[nbrqk][a-h][1-8]$/, // Piece moves: nf3, bb5, etc.
      /^o-o-o$/, // Long castling
      /^o-o$/, // Short castling
      /^[a-h]x[a-h][1-8]$/, // Captures: exd5, etc.
      /^[nbrqk]x[a-h][1-8]$/, // Piece captures: nxe5, etc.
    ];
    
    return movePatterns.some(pattern => pattern.test(query));
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
    const queryIntent = this.parseQueryIntent(normalizedQuery);
    
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
   * Parse query intent from natural language
   * @param {string} query - Normalized query string
   * @returns {Object} Query intent object
   */
  parseQueryIntent(query) {
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
      intent.targetMoves = this.extractMoves(responseMatch[3]);
      
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
      intent.style = this.extractStylesFromText(openingPart);
      
      return intent;
    }

    // Check for complexity-specific searches (e.g., "beginner french defense")
    const complexityMatch = query.match(QUERY_PATTERNS.COMPLEXITY_SPECIFIC);
    if (complexityMatch) {
      intent.type = 'complexity_search';
      intent.complexity = complexityMatch[1];
      
      // Parse the opening part
      const openingPart = complexityMatch[2];
      intent.style = this.extractStylesFromText(openingPart);
      
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

  /**
   * Extract chess moves from text (e.g., "d4", "1.e4", "king's pawn")
   * @param {string} text - Text containing move references
   * @returns {Array} Array of move strings
   */
  extractMoves(text) {
    const moves = [];
    const normalizedText = text.toLowerCase();
    
    // Direct move notation (e.g., "d4", "e4", "nf3")
    const moveMatches = text.match(/\b[a-h][1-8]\b|\b[NBRQK][a-h][1-8]\b/g);
    if (moveMatches) {
      moves.push(...moveMatches.map(move => move.toLowerCase()));
    }
    
    // Named move patterns
    if (normalizedText.includes('d4') || normalizedText.includes('queen\'s pawn') || normalizedText.includes('queens pawn')) {
      moves.push('d4');
    }
    if (normalizedText.includes('e4') || normalizedText.includes('king\'s pawn') || normalizedText.includes('kings pawn')) {
      moves.push('e4');
    }
    if (normalizedText.includes('c4') || normalizedText.includes('english')) {
      moves.push('c4');
    }
    if (normalizedText.includes('nf3') || normalizedText.includes('reti')) {
      moves.push('nf3');
    }
    if (normalizedText.includes('f4') || normalizedText.includes('bird')) {
      moves.push('f4');
    }
    
    return moves;
  }

  /**
   * Extract style descriptors from text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of style tags
   */
  extractStylesFromText(text) {
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
