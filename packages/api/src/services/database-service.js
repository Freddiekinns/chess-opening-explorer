/**
 * Database service for LLM enrichment pipeline
 * Works directly with ECO JSON files
 * Location: packages/api/src/services/database-service.js
 */

const fs = require('fs');
const path = require('path');
const ECOService = require('./eco-service');
const pathResolver = require('../utils/path-resolver');

class DatabaseService {
  constructor(ecoService = null) {
    this.ecoService = ecoService || new ECOService();
    this.ecoDataPath = pathResolver.getECODataPath();
  }

  /**
   * Fetches openings that need LLM enrichment (where analysis_json is missing)
   * @param {number} limit - Maximum number of openings to fetch
   * @returns {Promise<Array>} Array of opening objects with FEN keys
   */
  async getOpeningsToEnrich(limit = 10) {
    try {
      // Load all ECO data
      const allOpenings = await this.ecoService.getAllOpenings();
      
      // Filter openings that don't have analysis_json
      const openingsToEnrich = [];
      
      for (const opening of allOpenings) {
        if (!opening.analysis_json && openingsToEnrich.length < limit) {
          openingsToEnrich.push({
            fen: opening.fen,
            eco: opening.eco,
            name: opening.name,
            moves: opening.moves,
            src: opening.src,
            scid: opening.scid,
            aliases: opening.aliases
          });
        }
      }
      
      return openingsToEnrich;
    } catch (error) {
      throw new Error(`Failed to fetch openings for enrichment: ${error.message}`);
    }
  }

  /**
   * Updates the analysis_json field for a specific opening in the ECO JSON files
   * @param {string} fen - The FEN identifier for the opening
   * @param {Object} analysis - The analysis data object
   * @param {string} ecoCode - The ECO code to match (to handle duplicate FENs)
   * @param {string} name - The opening name to match (to handle duplicate FENs)
   * @returns {Promise<void>}
   */
  async updateOpeningAnalysis(fen, analysis, ecoCode = null, name = null) {
    try {
      // Find which ECO file contains this FEN
      const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
      
      for (const filename of ecoFiles) {
        const filePath = path.join(this.ecoDataPath, filename);
        
        if (!fs.existsSync(filePath)) {
          continue;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const ecoData = JSON.parse(fileContent);
        
        if (ecoData[fen]) {
          const opening = ecoData[fen];
          
          // If we have ECO code and name, match them exactly to handle duplicates
          if (ecoCode && opening.eco !== ecoCode) {
            continue;
          }
          
          if (name && opening.name !== name) {
            continue;
          }
          
          // Add analysis_json to the opening
          opening.analysis_json = analysis;
          
          // Write back to file
          fs.writeFileSync(filePath, JSON.stringify(ecoData, null, 2));
          
          // Clear ECO service cache so it reloads the updated data
          this.ecoService.clearCache();
          
          return;
        }
      }
      
      throw new Error(`Opening with FEN '${fen}' not found in ECO files`);
    } catch (error) {
      throw new Error(`Failed to update opening analysis: ${error.message}`);
    }
  }

  /**
   * Updates the analysis_json field for a specific opening (for video processing)
   * @param {string} fen - The FEN identifier for the opening
   * @param {string} analysisJsonString - The analysis data as a JSON string
   * @param {string} ecoCode - The ECO code to match (to handle duplicate FENs)
   * @param {string} name - The opening name to match (to handle duplicate FENs)
   * @returns {Promise<void>}
   */
  async updateAnalysisJson(fen, analysisJsonString, ecoCode = null, name = null) {
    try {
      // Parse the JSON string to validate it
      const analysis = JSON.parse(analysisJsonString);
      
      // Call the existing updateOpeningAnalysis method
      await this.updateOpeningAnalysis(fen, analysis, ecoCode, name);
      
    } catch (error) {
      throw new Error(`Failed to update analysis JSON: ${error.message}`);
    }
  }

  /**
   * Get statistics about enrichment progress
   * @returns {Promise<Object>} Statistics object
   */
  async getEnrichmentStats() {
    try {
      const allOpenings = await this.ecoService.getAllOpenings();
      const totalOpenings = allOpenings.length;
      
      let enrichedOpenings = 0;
      for (const opening of allOpenings) {
        if (opening.analysis_json) {
          enrichedOpenings++;
        }
      }
      
      return {
        total_openings: totalOpenings,
        enriched_openings: enrichedOpenings,
        pending_enrichment: totalOpenings - enrichedOpenings
      };
    } catch (error) {
      throw new Error(`Failed to get enrichment stats: ${error.message}`);
    }
  }
}

module.exports = DatabaseService;
