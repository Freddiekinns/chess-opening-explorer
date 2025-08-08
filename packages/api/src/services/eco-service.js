const fs = require('fs');
const path = require('path');
const https = require('https');
const pathResolver = require('../utils/path-resolver');

class ECOService {
  constructor() {
    // Use path resolver for environment-aware paths
    this.dataDir = pathResolver.getECODataPath();
    this.ecoFile = 'eco.json';
    this.baseUrl = 'https://raw.githubusercontent.com/hayatbiralem/eco.json/master/';
    this.ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
    this.ecoData = null;
  }

  /**
   * Download a single ECO file from GitHub
   */
  async downloadECOFile(filename) {
    const url = this.baseUrl + filename;
    const filePath = path.join(this.dataDir, filename);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${filename}`);
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filePath, () => {}); // Delete the file on error
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Download all ECO files from GitHub
   */
  async downloadAllECOFiles() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    console.log('Downloading ECO files...');
    
    const downloadPromises = this.ecoFiles.map(filename => this.downloadECOFile(filename));
    
    try {
      await Promise.all(downloadPromises);
      console.log('All ECO files downloaded successfully');
    } catch (error) {
      console.error('Error downloading ECO files:', error);
      throw error;
    }
  }

  /**
   * Load and merge all ECO data into a single object
   */
  loadECOData() {
    if (this.mergedData) {
      return this.mergedData;
    }

    const mergedData = {};
    
    for (const filename of this.ecoFiles) {
      const filePath = path.join(this.dataDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`ECO file not found: ${filename}. Run 'npm run eco:import' to download.`);
        continue;
      }
      
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        Object.assign(mergedData, fileData);
      } catch (error) {
        console.error(`Error loading ${filename}:`, error);
      }
    }
    
    this.mergedData = mergedData;
    return mergedData;
  }

  /**
   * Load popularity data from popularity_stats.json
   */
  loadPopularityData() {
    if (this.popularityData) {
      return this.popularityData;
    }

    const popularityPath = pathResolver.getPopularityStatsPath();

    try {
      if (fs.existsSync(popularityPath)) {
        const rawData = JSON.parse(fs.readFileSync(popularityPath, 'utf8'));
        this.popularityData = rawData.positions || {};
        console.log(`Loaded popularity data for ${Object.keys(this.popularityData).length} positions`);
      } else {
        console.warn('Popularity stats file not found, using empty data');
        this.popularityData = {};
      }
    } catch (error) {
      console.error('Error loading popularity data:', error);
      this.popularityData = {};
    }

    return this.popularityData;
  }

  /**
   * Get ECO analysis data for a specific code
   * Extracts analysis_json fields like description, plans, complexity
   */
  getECOAnalysis(ecoCode) {
    const ecoData = this.loadECOData();
    
    // Find any opening with this ECO code to get analysis data
    for (const [fen, opening] of Object.entries(ecoData)) {
      if (opening.eco === ecoCode && opening.analysis_json) {
        const analysis = opening.analysis_json;
        
        // Parse common_plans to separate white and black plans
        const commonPlans = analysis.common_plans || [];
        const whitePlans = [];
        const blackPlans = [];
        
        // Split plans based on content - plans mentioning "White" go to white_plans, "Black" to black_plans
        commonPlans.forEach(plan => {
          const planLower = plan.toLowerCase();
          if (planLower.includes("white's plan") || planLower.startsWith("white ")) {
            whitePlans.push(plan);
          } else if (planLower.includes("black's plan") || planLower.startsWith("black ")) {
            blackPlans.push(plan);
          } else {
            // If unclear, add to both (generic plan)
            whitePlans.push(plan);
            blackPlans.push(plan);
          }
        });
        
        return {
          eco: ecoCode,
          description: analysis.description,
          style_tags: analysis.style_tags || [],
          tactical_tags: analysis.tactical_tags || [],
          positional_tags: analysis.positional_tags || [],
          strategic_themes: analysis.strategic_themes || [],
          complexity: analysis.complexity || 'Unknown',
          white_plans: analysis.white_plans || whitePlans,
          black_plans: analysis.black_plans || blackPlans,
          common_plans: commonPlans,
          mainline_moves: analysis.mainline_moves,
          last_enriched_at: analysis.last_enriched_at
        };
      }
    }
    
    return null;
  }

  /**
   * Get ECO analysis data for a specific FEN position
   * This ensures we get the exact position's analysis, not just any position with the same ECO code
   */
  getECOAnalysisByFEN(fen) {
    const ecoData = this.loadECOData();
    
    const opening = ecoData[fen];
    
    if (!opening) {
      // If FEN is not a direct key, search through all openings
      for (const [key, openingData] of Object.entries(ecoData)) {
        if (openingData.fen === fen) {
          return this.parseAnalysisData(openingData, fen);
        }
      }
      return null;
    }
    
    if (!opening.analysis_json) {
      return null;
    }

    return this.parseAnalysisData(opening, fen);
  }

  /**
   * Helper method to parse analysis data consistently
   */
  parseAnalysisData(opening, fen) {
    const analysis = opening.analysis_json;
    
    // Parse common_plans to separate white and black plans
    const commonPlans = analysis.common_plans || [];
    const whitePlans = [];
    const blackPlans = [];
    
    // Split plans based on content - plans mentioning "White" go to white_plans, "Black" to black_plans
    commonPlans.forEach(plan => {
      const planLower = plan.toLowerCase();
      if (planLower.includes("white's plan") || planLower.startsWith("white ")) {
        whitePlans.push(plan);
      } else if (planLower.includes("black's plan") || planLower.startsWith("black ")) {
        blackPlans.push(plan);
      } else {
        // If unclear, add to both (generic plan)
        whitePlans.push(plan);
        blackPlans.push(plan);
      }
    });

    // Extract aliases consistently
    const aliasesArray = [];
    if (opening.aliases) {
      if (typeof opening.aliases === 'object') {
        Object.values(opening.aliases).forEach(alias => {
          if (typeof alias === 'string') {
            aliasesArray.push(alias);
          }
        });
      } else if (Array.isArray(opening.aliases)) {
        aliasesArray.push(...opening.aliases);
      } else if (typeof opening.aliases === 'string') {
        aliasesArray.push(opening.aliases);
      }
    }
    
    return {
      eco: opening.eco,
      fen: fen,
      name: opening.name,
      moves: opening.moves || '',
      aliases: aliasesArray,
      description: analysis.description,
      style_tags: analysis.style_tags || [],
      tactical_tags: analysis.tactical_tags || [],
      positional_tags: analysis.positional_tags || [],
      strategic_themes: analysis.strategic_themes || [],
      complexity: analysis.complexity || 'Unknown',
      white_plans: analysis.white_plans || whitePlans,
      black_plans: analysis.black_plans || blackPlans,
      common_plans: commonPlans,
      mainline_moves: analysis.mainline_moves,
      last_enriched_at: analysis.last_enriched_at
    };
  }

  /**
   * Get opening data by FEN position
   * Returns all 8 key attributes: name, eco, fen, moves, aliases, description, tags, stats
   */
  getOpeningByFEN(fen) {
    const ecoData = this.loadECOData();
    
    const opening = ecoData[fen];
    
    if (!opening) {
      // If FEN is not a direct key, search through all openings
      let count = 0;
      for (const [key, openingData] of Object.entries(ecoData)) {
        count++;
        if (openingData.fen === fen) {
          return this.formatOpeningData(openingData, fen);
        }
        if (count > 100) break; // Prevent too much processing
      }
      return null;
    }
    
    return this.formatOpeningData(opening, fen);
  }

  /**
   * Format opening data to include all 8 key attributes consistently
   */
  formatOpeningData(opening, fen) {
    // Extract aliases from the aliases object structure
    const aliasesArray = [];
    if (opening.aliases) {
      if (typeof opening.aliases === 'object') {
        // Handle object structure like {"scid": "Benko Opening: Symmetrical"}
        Object.values(opening.aliases).forEach(alias => {
          if (typeof alias === 'string') {
            aliasesArray.push(alias);
          }
        });
      } else if (Array.isArray(opening.aliases)) {
        // Handle array structure
        aliasesArray.push(...opening.aliases);
      } else if (typeof opening.aliases === 'string') {
        // Handle single string
        aliasesArray.push(opening.aliases);
      }
    }

    // Parse analysis_json for additional attributes
    let description = '';
    let complexity = '';
    let tags = {
      style_tags: [],
      tactical_tags: [],
      positional_tags: [],
      strategic_themes: []
    };
    let commonPlans = [];

    if (opening.analysis_json) {
      try {
        const analysis = typeof opening.analysis_json === 'string' 
          ? JSON.parse(opening.analysis_json) 
          : opening.analysis_json;
        
        description = analysis.description || '';
        complexity = analysis.complexity || '';
        tags.style_tags = analysis.style_tags || [];
        tags.tactical_tags = analysis.tactical_tags || [];
        tags.positional_tags = analysis.positional_tags || [];
        tags.strategic_themes = analysis.strategic_themes || [];
        commonPlans = analysis.common_plans || [];
      } catch (error) {
        console.log('ECO Service: Error parsing analysis_json for', opening.name, ':', error.message);
      }
    }

    return {
      // Core identifiers (attributes 1-3, 8)
      name: opening.name,
      eco: opening.eco,
      fen: fen,
      
      // Move notation (part of core data)
      moves: opening.moves || '',
      
      // Aliases (attribute 7)
      aliases: aliasesArray,
      
      // Description (attribute 1)
      description: description,
      
      // Complexity (from analysis_json)
      complexity: complexity,
      
      // Tags (attribute 6)
      style_tags: tags.style_tags,
      tactical_tags: tags.tactical_tags,
      positional_tags: tags.positional_tags,
      strategic_themes: tags.strategic_themes,
      
      // Common plans (attribute 4)
      common_plans: commonPlans,
      
      // Additional metadata
      src: opening.src,
      scid: opening.scid,
      
      // Note: Stats (attribute 5) should be retrieved separately via stats API
      // to maintain separation of concerns
    };
  }

  /**
   * Get all openings for client-side search
   */
  getAllOpenings() {
    const ecoData = this.loadECOData();
    const popularityData = this.loadPopularityData();
    const results = [];
    
    for (const [fen, opening] of Object.entries(ecoData)) {
      // Enrich with popularity data if available
      const popularity = popularityData[fen];
      const enrichedOpening = {
        fen,
        ...opening,
        games_analyzed: popularity ? popularity.games_analyzed : 0,
        popularity_score: popularity ? popularity.popularity_score : 0,
        white_win_rate: popularity ? popularity.white_win_rate : null,
        black_win_rate: popularity ? popularity.black_win_rate : null,
        draw_rate: popularity ? popularity.draw_rate : null,
        avg_rating: popularity ? popularity.avg_rating : null
      };
      
      results.push(enrichedOpening);
    }
    
    return results;
  }

  /**
   * Get popular openings by ECO category for optimized grid display
   * @param {string} category - ECO category ('A', 'B', 'C', 'D', 'E') or null for all
   * @param {number} limit - Max results per category (default: 6)
   * @param {string} complexity - Filter by complexity ('Beginner', 'Intermediate', 'Advanced')
   * @returns {Object} - ECO categories with popular openings
   */
  getPopularOpeningsByECO(category = null, limit = 6, complexity = null) {
    const maxResultsPerCategory = Math.min(parseInt(limit) || 6, 20);
    
    let allOpenings = this.getAllOpenings();
    
    // Filter by complexity if provided
    if (complexity && ['Beginner', 'Intermediate', 'Advanced'].includes(complexity)) {
      allOpenings = allOpenings.filter(opening => 
        opening.analysis_json?.complexity === complexity
      );
    }
    
    const popularityData = this.loadPopularityData();
    
    // Create optimized lookup map by FEN
    const gameCountsByFen = new Map();
    Object.entries(popularityData).forEach(([fen, stats]) => {
      if (stats.games_analyzed && stats.games_analyzed > 0) {
        gameCountsByFen.set(fen, {
          games_analyzed: stats.games_analyzed,
          rank: stats.rank || 0
        });
      }
    });
    
    // Group openings by ECO family and enrich with popularity data
    const ecoCategories = { A: [], B: [], C: [], D: [], E: [] };
    
    allOpenings.forEach(opening => {
      const ecoFamily = opening.eco ? opening.eco[0] : null;
      if (ecoFamily && ecoCategories[ecoFamily]) {
        const popularityInfo = gameCountsByFen.get(opening.fen);
        
        ecoCategories[ecoFamily].push({
          ...opening,
          games_analyzed: popularityInfo ? popularityInfo.games_analyzed : 0,
          popularity_rank: popularityInfo ? popularityInfo.rank : null
        });
      }
    });
    
    // Sort each category by games_analyzed (descending) and take top N
    Object.keys(ecoCategories).forEach(cat => {
      ecoCategories[cat] = ecoCategories[cat]
        .sort((a, b) => {
          const gameCountDiff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
          if (gameCountDiff !== 0) return gameCountDiff;
          return a.name.localeCompare(b.name);
        })
        .slice(0, maxResultsPerCategory);
    });
    
    // If a specific category is requested, return only that category
    if (category && ecoCategories[category.toUpperCase()]) {
      return {
        [category.toUpperCase()]: ecoCategories[category.toUpperCase()]
      };
    }
    
    return ecoCategories;
  }

  /**
   * Search openings by ECO code
   */
  getOpeningsByECO(ecoCode) {
    const ecoData = this.loadECOData();
    const results = [];
    
    for (const [fen, opening] of Object.entries(ecoData)) {
      if (opening.eco === ecoCode) {
        results.push({ fen, ...opening });
      }
    }
    
    return results;
  }

  /**
   * Search openings by name (fuzzy search with performance optimizations)
   */
  searchOpeningsByName(searchTerm, limit = 20) {
    const ecoData = this.loadECOData();
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    // Early exit if we have enough results
    for (const [fen, opening] of Object.entries(ecoData)) {
      if (results.length >= limit) break;
      
      const nameMatch = opening.name.toLowerCase().includes(searchLower);
      const aliasMatch = opening.aliases && Object.values(opening.aliases).some(alias => 
        alias.toLowerCase().includes(searchLower)
      );
      
      if (nameMatch || aliasMatch) {
        results.push({ fen, ...opening });
      }
    }
    
    // Sort by relevance - exact matches first, then partial matches
    return results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact matches at start of name get highest priority
      const aStartsWithQuery = aName.startsWith(searchLower) ? 0 : 1;
      const bStartsWithQuery = bName.startsWith(searchLower) ? 0 : 1;
      
      if (aStartsWithQuery !== bStartsWithQuery) {
        return aStartsWithQuery - bStartsWithQuery;
      }
      
      // Then shorter names (more specific) get priority
      return aName.length - bName.length;
    });
  }

  /**
   * Get all ECO categories (A00-E99)
   */
  getECOCategories() {
    const ecoData = this.loadECOData();
    const categories = new Set();
    
    for (const opening of Object.values(ecoData)) {
      categories.add(opening.eco);
    }
    
    return Array.from(categories).sort();
  }

  /**
   * Get random opening for training
   */
  getRandomOpening() {
    const ecoData = this.loadECOData();
    const fens = Object.keys(ecoData);
    const randomFen = fens[Math.floor(Math.random() * fens.length)];
    
    return { fen: randomFen, ...ecoData[randomFen] };
  }

  /**
   * Get openings by classification (A, B, C, D, E)
   */
  getOpeningsByClassification(classification) {
    const ecoData = this.loadECOData();
    const results = [];
    
    for (const [fen, opening] of Object.entries(ecoData)) {
      if (opening.eco.startsWith(classification)) {
        results.push({ fen, ...opening });
      }
    }
    
    return results;
  }

  /**
   * Get opening statistics
   */
  getStatistics() {
    const ecoData = this.loadECOData();
    const stats = {
      total: Object.keys(ecoData).length,
      byClassification: {},
      bySource: {},
      withInterpolation: 0
    };
    
    for (const opening of Object.values(ecoData)) {
      const classification = opening.eco.charAt(0);
      stats.byClassification[classification] = (stats.byClassification[classification] || 0) + 1;
      
      stats.bySource[opening.src] = (stats.bySource[opening.src] || 0) + 1;
      
      if (opening.src === 'interpolated') {
        stats.withInterpolation++;
      }
    }
    
    return stats;
  }

  /**
   * Get openings by ECO family (A, B, C, D, E)
   * @param {string} family - ECO family letter (A, B, C, D, E)
   * @returns {Array} Array of opening objects for the family
   */
  getOpeningsByFamily(family) {
    try {
      if (!['A', 'B', 'C', 'D', 'E'].includes(family)) {
        throw new Error('Invalid family code. Must be A, B, C, D, or E');
      }

      const familyFilePath = path.join(this.dataDir, `eco${family}.json`);
      
      if (!fs.existsSync(familyFilePath)) {
        console.log(`ECO family file not found: ${familyFilePath}`);
        return [];
      }

      const familyData = JSON.parse(fs.readFileSync(familyFilePath, 'utf8'));
      
      // Transform data to match expected format
      const openings = familyData.map(opening => ({
        fen: opening.f || '',
        name: opening.n || '',
        eco: opening.c || '',
        moves: opening.m || '',
        popularity: Math.floor(Math.random() * 100) // Placeholder popularity
      }));

      // Sort by ECO code and return top results
      return openings
        .sort((a, b) => a.eco.localeCompare(b.eco))
        .slice(0, 50); // Limit results
        
    } catch (error) {
      console.error(`Error loading family ${family}:`, error);
      return [];
    }
  }

  /**
   * Clear the cached ECO data to force reload
   */
  clearCache() {
    this.mergedData = null;
  }
}

// Export a function to be called from scripts
module.exports = ECOService;

// Allow running as a script
if (require.main === module) {
  const service = new ECOService();
  service.downloadAllECOFiles().then(() => {
    console.log('ECO files downloaded successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Error downloading ECO files:', error);
    process.exit(1);
  });
}
