#!/usr/bin/env node

/**
 * FEN Validation Tool for Course Analysis Data
 * Validates FEN strings and checks if they match the claimed openings
 * 
 * Usage:
 *   node tools/validation/validate_fens.js data/course_analysis/by_opening/filename.json
 *   node tools/validation/validate_fens.js data/course_analysis/by_opening/  # validate all files
 */

const fs = require('fs').promises;
const path = require('path');

class FENValidator {
  constructor() {
    this.results = {
      total_fens: 0,
      valid_fens: 0,
      invalid_fens: 0,
      relevant_fens: 0,
      irrelevant_fens: 0,
      validation_errors: []
    };
  }

  /**
   * Validate FEN string format
   * @param {string} fen - FEN string to validate
   * @returns {Object} - Validation result
   */
  validateFENFormat(fen) {
    if (!fen || typeof fen !== 'string') {
      return { valid: false, error: 'FEN is not a string' };
    }

    const parts = fen.trim().split(' ');
    if (parts.length !== 6) {
      return { valid: false, error: `FEN must have 6 components, got ${parts.length}` };
    }

    const [position, activeColor, castling, enPassant, halfmove, fullmove] = parts;

    // Validate position
    const ranks = position.split('/');
    if (ranks.length !== 8) {
      return { valid: false, error: `Position must have 8 ranks, got ${ranks.length}` };
    }

    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      let squareCount = 0;
      
      for (const char of rank) {
        if ('12345678'.includes(char)) {
          squareCount += parseInt(char);
        } else if ('pnbrqkPNBRQK'.includes(char)) {
          squareCount += 1;
        } else {
          return { valid: false, error: `Invalid character '${char}' in rank ${i + 1}` };
        }
      }
      
      if (squareCount !== 8) {
        return { valid: false, error: `Rank ${i + 1} must have 8 squares, got ${squareCount}` };
      }
    }

    // Validate active color
    if (!['w', 'b'].includes(activeColor)) {
      return { valid: false, error: `Active color must be 'w' or 'b', got '${activeColor}'` };
    }

    // Validate castling
    if (castling !== '-' && !/^[KQkq]*$/.test(castling)) {
      return { valid: false, error: `Invalid castling rights: '${castling}'` };
    }

    // Validate en passant
    if (enPassant !== '-' && !/^[a-h][36]$/.test(enPassant)) {
      return { valid: false, error: `Invalid en passant square: '${enPassant}'` };
    }

    // Validate halfmove and fullmove
    if (isNaN(parseInt(halfmove)) || parseInt(halfmove) < 0) {
      return { valid: false, error: `Invalid halfmove clock: '${halfmove}'` };
    }

    if (isNaN(parseInt(fullmove)) || parseInt(fullmove) < 1) {
      return { valid: false, error: `Invalid fullmove number: '${fullmove}'` };
    }

    return { valid: true, error: null };
  }

  /**
   * Check if FEN is relevant to the claimed opening
   * @param {string} fen - FEN string
   * @param {string} openingName - Name of the opening
   * @param {string} openingEco - ECO code of the opening
   * @param {string} openingFen - Main FEN of the opening
   * @returns {Object} - Relevance check result
   */
  checkFENRelevance(fen, openingName, openingEco, openingFen) {
    // Basic relevance check - see if the FEN is close to the opening FEN
    const fenPosition = fen.split(' ')[0];
    const openingPosition = openingFen.split(' ')[0];
    
    // Check if positions are identical (same piece placement)
    if (fenPosition === openingPosition) {
      return { relevant: true, reason: 'Exact position match' };
    }

    // Check if it's a starting position
    if (fenPosition === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
      return { relevant: true, reason: 'Starting position' };
    }

    // Check for common opening patterns
    const pieceCount = (fenPosition.match(/[pnbrqkPNBRQK]/g) || []).length;
    const startingPieceCount = 32;
    
    if (pieceCount === startingPieceCount) {
      return { relevant: true, reason: 'Early game position (all pieces on board)' };
    }

    // Check if it's a reasonable number of moves into the game
    const fullmoveNumber = parseInt(fen.split(' ')[5]);
    if (fullmoveNumber <= 10) {
      return { relevant: true, reason: `Early game (move ${fullmoveNumber})` };
    }

    // More detailed analysis based on opening name
    const openingLower = openingName.toLowerCase();
    
    // Check for specific opening characteristics
    if (openingLower.includes('sicilian') && fenPosition.includes('2p5')) {
      return { relevant: true, reason: 'Sicilian structure detected' };
    }
    
    if (openingLower.includes('french') && fenPosition.includes('4p3')) {
      return { relevant: true, reason: 'French structure detected' };
    }
    
    if (openingLower.includes('caro') && fenPosition.includes('3p4')) {
      return { relevant: true, reason: 'Caro-Kann structure detected' };
    }

    return { relevant: false, reason: `Advanced position (move ${fullmoveNumber}), unclear relevance` };
  }

  /**
   * Validate all FENs in a course analysis file
   * @param {string} filePath - Path to the JSON file
   * @returns {Promise<Object>} - Validation results
   */
  async validateCourseFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const courseData = JSON.parse(data);
      
      if (!courseData.found_courses || !Array.isArray(courseData.found_courses)) {
        throw new Error('Invalid course data format');
      }

      const fileResults = {
        file: path.basename(filePath),
        opening: courseData.analysis_for_opening?.name || 'Unknown',
        openingEco: courseData.analysis_for_opening?.eco || 'Unknown',
        openingFen: courseData.analysis_for_opening?.fen || '',
        courses: []
      };

      console.log(`\n🔍 Validating FENs for: ${fileResults.opening} (${fileResults.openingEco})`);
      console.log(`📍 Opening FEN: ${fileResults.openingFen}`);
      
      for (const course of courseData.found_courses) {
        console.log(`\n   📚 Course: ${course.course_title}`);
        console.log(`   👨‍🏫 Author: ${course.author}`);
        
        if (!course.anchor_fens || !Array.isArray(course.anchor_fens)) {
          console.log(`   ❌ No anchor_fens array found`);
          continue;
        }

        const courseResult = {
          course_title: course.course_title,
          author: course.author,
          scope: course.scope,
          anchor_fens: []
        };

        for (let i = 0; i < course.anchor_fens.length; i++) {
          const fen = course.anchor_fens[i];
          this.results.total_fens++;
          
          console.log(`   📍 FEN ${i + 1}: ${fen}`);
          
          // Validate format
          const formatValidation = this.validateFENFormat(fen);
          
          if (!formatValidation.valid) {
            this.results.invalid_fens++;
            console.log(`   ❌ Invalid format: ${formatValidation.error}`);
            
            this.results.validation_errors.push({
              file: fileResults.file,
              course: course.course_title,
              fen: fen,
              error: formatValidation.error,
              type: 'format'
            });
          } else {
            this.results.valid_fens++;
            console.log(`   ✅ Valid format`);
            
            // Check relevance
            const relevanceCheck = this.checkFENRelevance(
              fen, 
              fileResults.opening, 
              fileResults.openingEco, 
              fileResults.openingFen
            );
            
            if (relevanceCheck.relevant) {
              this.results.relevant_fens++;
              console.log(`   🎯 Relevant: ${relevanceCheck.reason}`);
            } else {
              this.results.irrelevant_fens++;
              console.log(`   ⚠️  Questionable relevance: ${relevanceCheck.reason}`);
            }
          }
          
          courseResult.anchor_fens.push({
            fen: fen,
            valid: formatValidation.valid,
            error: formatValidation.error,
            relevant: formatValidation.valid ? this.checkFENRelevance(fen, fileResults.opening, fileResults.openingEco, fileResults.openingFen).relevant : false
          });
        }
        
        fileResults.courses.push(courseResult);
      }

      return fileResults;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate a validation report
   * @param {Array} results - Validation results
   */
  generateReport(results) {
    console.log('\n📊 FEN VALIDATION REPORT');
    console.log('========================');
    console.log(`Total FENs checked: ${this.results.total_fens}`);
    console.log(`Valid format: ${this.results.valid_fens} (${((this.results.valid_fens / this.results.total_fens) * 100).toFixed(1)}%)`);
    console.log(`Invalid format: ${this.results.invalid_fens} (${((this.results.invalid_fens / this.results.total_fens) * 100).toFixed(1)}%)`);
    console.log(`Relevant to opening: ${this.results.relevant_fens} (${((this.results.relevant_fens / this.results.total_fens) * 100).toFixed(1)}%)`);
    console.log(`Questionable relevance: ${this.results.irrelevant_fens} (${((this.results.irrelevant_fens / this.results.total_fens) * 100).toFixed(1)}%)`);
    
    if (this.results.validation_errors.length > 0) {
      console.log('\n❌ FORMAT ERRORS:');
      this.results.validation_errors.forEach(error => {
        console.log(`   ${error.file} - ${error.course}`);
        console.log(`   FEN: ${error.fen}`);
        console.log(`   Error: ${error.error}`);
        console.log('');
      });
    }

    // Summary by file
    console.log('\n📋 BY FILE SUMMARY:');
    results.forEach(fileResult => {
      if (fileResult) {
        const totalFens = fileResult.courses.reduce((sum, course) => sum + course.anchor_fens.length, 0);
        const validFens = fileResult.courses.reduce((sum, course) => 
          sum + course.anchor_fens.filter(f => f.valid).length, 0);
        const relevantFens = fileResult.courses.reduce((sum, course) => 
          sum + course.anchor_fens.filter(f => f.relevant).length, 0);
        
        console.log(`   ${fileResult.file}: ${validFens}/${totalFens} valid, ${relevantFens}/${totalFens} relevant`);
      }
    });
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node tools/validation/validate_fens.js <path>

Arguments:
  <path>    Path to a JSON file or directory containing course analysis files

Examples:
  node tools/validation/validate_fens.js data/course_analysis/by_opening/filename.json
  node tools/validation/validate_fens.js data/course_analysis/by_opening/
    `);
    process.exit(1);
  }

  const inputPath = args[0];

  (async () => {
    try {
      const validator = new FENValidator();
      let results = [];

      const stat = await fs.stat(inputPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(inputPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
          console.log(`No JSON files found in ${inputPath}`);
          process.exit(1);
        }

        console.log(`Found ${jsonFiles.length} course analysis files`);
        
        for (const file of jsonFiles) {
          const filePath = path.join(inputPath, file);
          const result = await validator.validateCourseFile(filePath);
          if (result) {
            results.push(result);
          }
        }
      } else if (stat.isFile()) {
        const result = await validator.validateCourseFile(inputPath);
        if (result) {
          results = [result];
        }
      } else {
        console.error('❌ Invalid path: must be a file or directory');
        process.exit(1);
      }

      validator.generateReport(results);

    } catch (error) {
      console.error(`💥 Error: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = FENValidator;
