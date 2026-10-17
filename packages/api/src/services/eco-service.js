const fs = require('fs');
const path = require('path');
const https = require('https');
const pathResolver = require('../utils/path-resolver');
const { getGlobalCache } = require('./cache-service');

class ECOService {
  constructor() {
    // Use path resolver for environment-aware paths
    this.dataDir = pathResolver.getECODataPath();
    this.ecoFile = 'eco.json';
    this.baseUrl = 'https://raw.githubusercontent.com/hayatbiralem/eco.json/master/';
    this.ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
    this.ecoData = null;
    this.cache = getGlobalCache(); // Add cache
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
    // Check global cache first (survives function restarts)
    return this.cache.getOrSet('eco-data', () => {
      if (this.mergedData) {
        return this.mergedData;
      }

      const loadStart = Date.now();
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
      // Cold-start visibility (review P10): parsing ~30 MB of ECO JSON is the
      // suspected dominant first-hit cost — measure before optimising.
      console.warn(
        `[cold-start] ECO data parsed in ${Date.now() - loadStart}ms (${Object.keys(mergedData).length} positions)`
      );
      return mergedData;
    }, 3600000); // Cache for 1 hour
  }  /**
   * Load popularity data from popularity_stats.json
   */
  loadPopularityData() {
    // Check global cache first (survives function restarts) 
    return this.cache.getOrSet('popularity-data', () => {
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
    }, 3600000); // Cache for 1 hour
  }

  // NOTE: there is intentionally no ECO-code-level analysis lookup. ECO codes
  // are coarse buckets (C20 alone holds 30+ named openings), and a bucket
  // lookup served the wrong opening's plans on 96% of detail pages — see
  // docs/proposals/2026-06-12-common-plans-provenance.md. Analysis must be
  // fetched per FEN (formatOpeningData).

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
      for (const [, openingData] of Object.entries(ecoData)) {
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

      // ECO structure flags
      isEcoRoot: opening.isEcoRoot,

      // Family taxonomy (families.json id) — used for family-level fallbacks
      family_id: opening.family_id,

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
        family_id: opening.family_id,
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
   * Get random opening for training
   */
  getRandomOpening() {
    const ecoData = this.loadECOData();
    const fens = Object.keys(ecoData);
    const randomFen = fens[Math.floor(Math.random() * fens.length)];
    
    return { fen: randomFen, ...ecoData[randomFen] };
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
