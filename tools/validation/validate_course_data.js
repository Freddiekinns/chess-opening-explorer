#!/usr/bin/env node

/**
 * Comprehensive Data Validation Tool for Course Analysis
 * Checks for potentially false or suspicious data in course analysis files
 * 
 * Usage:
 *   node tools/validation/validate_course_data.js data/course_analysis/by_opening/filename.json
 *   node tools/validation/validate_course_data.js data/course_analysis/by_opening/  # validate all files
 */

const fs = require('fs').promises;
const path = require('path');

class CourseDataValidator {
  constructor() {
    this.results = {
      total_courses: 0,
      suspicious_patterns: [],
      author_issues: [],
      title_issues: [],
      platform_issues: [],
      social_proof_issues: [],
      publication_year_issues: []
    };
    
    // Known real chess authors and their details
    this.knownAuthors = {
      'GM Magnus Carlsen': { verified: true, rating: '2800+', notes: 'World Champion' },
      'GM Fabiano Caruana': { verified: true, rating: '2800+', notes: 'World Championship challenger' },
      'GM Anish Giri': { verified: true, rating: '2750+', notes: 'Top 10 player' },
      'GM Sam Shankland': { verified: true, rating: '2700+', notes: 'US Champion, known for d4 courses' },
      'GM Daniel Naroditsky': { verified: true, rating: '2650+', notes: 'Popular educator' },
      'GM Peter Svidler': { verified: true, rating: '2650+', notes: 'World Cup winner' },
      'GM Ivan Cheparinov': { verified: true, rating: '2650+', notes: 'Bulgarian GM' },
      'GM Simon Williams': { verified: true, rating: '2500+', notes: 'Popular chess educator' },
      'GM Gawain Jones': { verified: true, rating: '2650+', notes: 'English GM' },
      'GM Ivan Sokolov': { verified: true, rating: '2650+', notes: 'Dutch GM, author' },
      'GM Judit Polgar': { verified: true, rating: '2700+', notes: 'Strongest female player ever' },
      'GM Jan-Krzysztof Duda': { verified: true, rating: '2750+', notes: 'Polish super GM' },
      'GM Harikrishna Pentala': { verified: true, rating: '2700+', notes: 'Indian super GM' },
      'GM Gregory Kaidanov': { verified: true, rating: '2600+', notes: 'US-based GM, educator' },
      'GM Alex Colovic': { verified: true, rating: '2550+', notes: 'Serbian GM, author' },
      'GM Srinath Narayanan': { verified: true, rating: '2550+', notes: 'Indian GM, educator' },
      'GM Erwin L\'Ami': { verified: true, rating: '2650+', notes: 'Dutch GM' },
      'IM Christof Sielecki': { verified: true, rating: '2400+', notes: 'German IM, popular educator' },
      'IM John Bartholomew': { verified: true, rating: '2400+', notes: 'Popular chess educator' },
      'IM Levy Rozman': { verified: true, rating: '2400+', notes: 'GothamChess YouTuber' }
    };
    
    // Known real course series
    this.knownCourseSeries = {
      'Lifetime Repertoires': { platform: 'Chessable', verified: true },
      'Short & Sweet': { platform: 'Chessable', verified: true },
      'Keep it Simple': { platform: 'Chessable', verified: true },
      'The Complete': { platform: 'Chessable', verified: true },
      'Master Class': { platform: 'Chess.com', verified: true },
      'Chessable MoveTrainer': { platform: 'Chessable', verified: true }
    };
    
    // Suspicious patterns that indicate hallucination
    this.suspiciousPatterns = [
      { pattern: /GM [A-Z][a-z]+ [A-Z][a-z]+\'s.*1\.\s*e4\s*e5/, desc: 'Suspicious e4-e5 course titles' },
      { pattern: /exactly \d+ ratings/, desc: 'Overly specific rating counts' },
      { pattern: /4\.[89]\/5 average/, desc: 'Suspiciously high ratings' },
      { pattern: /\d{4}\+ ratings/, desc: 'Round number ratings (likely fabricated)' },
      { pattern: /course\/\d{5,6}\//, desc: 'Suspicious course ID patterns' }
    ];
  }

  /**
   * Validate author credentials
   * @param {string} author - Author name
   * @returns {Object} - Validation result
   */
  validateAuthor(author) {
    const normalizedAuthor = author.trim();
    
    if (this.knownAuthors[normalizedAuthor]) {
      return { 
        valid: true, 
        confidence: 'high', 
        details: this.knownAuthors[normalizedAuthor] 
      };
    }
    
    // Check for title patterns
    const titlePattern = /^(GM|IM|FM|WGM|WIM|WFM)\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/;
    if (titlePattern.test(normalizedAuthor)) {
      return { 
        valid: true, 
        confidence: 'medium', 
        details: { notes: 'Follows proper title format, needs verification' } 
      };
    }
    
    // Check for suspicious patterns
    if (normalizedAuthor.includes('Expert') || normalizedAuthor.includes('Master') || normalizedAuthor.includes('Player')) {
      return { 
        valid: false, 
        confidence: 'low', 
        details: { notes: 'Generic title, likely fabricated' } 
      };
    }
    
    return { 
      valid: false, 
      confidence: 'low', 
      details: { notes: 'Unknown author, needs verification' } 
    };
  }

  /**
   * Validate course title
   * @param {string} title - Course title
   * @param {string} platform - Platform name
   * @returns {Object} - Validation result
   */
  validateCourseTitle(title, platform) {
    const normalizedTitle = title.trim();
    
    // Check for known course series
    for (const [series, details] of Object.entries(this.knownCourseSeries)) {
      if (normalizedTitle.includes(series)) {
        if (details.platform === platform) {
          return { 
            valid: true, 
            confidence: 'high', 
            details: { notes: `Known ${series} series on ${platform}` } 
          };
        } else {
          return { 
            valid: false, 
            confidence: 'low', 
            details: { notes: `${series} series not found on ${platform}` } 
          };
        }
      }
    }
    
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.pattern.test(normalizedTitle)) {
        return { 
          valid: false, 
          confidence: 'low', 
          details: { notes: pattern.desc } 
        };
      }
    }
    
    return { 
      valid: true, 
      confidence: 'medium', 
      details: { notes: 'Title format seems reasonable' } 
    };
  }

  /**
   * Validate publication year
   * @param {number} year - Publication year
   * @returns {Object} - Validation result
   */
  validatePublicationYear(year) {
    const currentYear = new Date().getFullYear();
    
    if (year < 2010) {
      return { 
        valid: false, 
        confidence: 'low', 
        details: { notes: 'Too early for modern online chess courses' } 
      };
    }
    
    if (year > currentYear) {
      return { 
        valid: false, 
        confidence: 'low', 
        details: { notes: 'Future publication year' } 
      };
    }
    
    if (year >= 2020) {
      return { 
        valid: true, 
        confidence: 'high', 
        details: { notes: 'Recent publication, likely accurate' } 
      };
    }
    
    return { 
      valid: true, 
      confidence: 'medium', 
      details: { notes: 'Reasonable publication year' } 
    };
  }

  /**
   * Validate social proof data
   * @param {string} vettingNotes - Vetting notes containing social proof
   * @returns {Object} - Validation result
   */
  validateSocialProof(vettingNotes) {
    const suspiciousPatterns = [
      { pattern: /\d{4}\+\s+ratings/, desc: 'Round number ratings' },
      { pattern: /4\.[89]\/5 average/, desc: 'Suspiciously high ratings' },
      { pattern: /exactly \d+ ratings/, desc: 'Overly specific counts' },
      { pattern: /\d+k\+\s+views/, desc: 'Round number views' },
      { pattern: /Widely recommended on.*Reddit/, desc: 'Generic Reddit endorsement' },
      { pattern: /top recommendation.*multiple.*threads/, desc: 'Generic community endorsement' }
    ];
    
    const issues = [];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.pattern.test(vettingNotes)) {
        issues.push(pattern.desc);
      }
    }
    
    if (issues.length > 0) {
      return { 
        valid: false, 
        confidence: 'low', 
        details: { notes: `Suspicious patterns: ${issues.join(', ')}` } 
      };
    }
    
    return { 
      valid: true, 
      confidence: 'medium', 
      details: { notes: 'Social proof seems reasonable' } 
    };
  }

  /**
   * Validate platform assignment
   * @param {string} platform - Platform name
   * @param {string} author - Author name
   * @returns {Object} - Validation result
   */
  validatePlatform(platform, author) {
    const knownPlatforms = ['Chessable', 'Chess.com', 'Lichess', 'Chessly', 'YouTube', 'ChessBase'];
    
    if (!knownPlatforms.includes(platform)) {
      return { 
        valid: false, 
        confidence: 'low', 
        details: { notes: `Unknown platform: ${platform}` } 
      };
    }
    
    // Check for known author-platform combinations
    if (author.includes('Sam Shankland') && platform === 'Chessable') {
      return { 
        valid: true, 
        confidence: 'high', 
        details: { notes: 'Sam Shankland has real Chessable courses' } 
      };
    }
    
    if (author.includes('Levy Rozman') && platform === 'Chessly') {
      return { 
        valid: true, 
        confidence: 'high', 
        details: { notes: 'Levy Rozman founded Chessly' } 
      };
    }
    
    return { 
      valid: true, 
      confidence: 'medium', 
      details: { notes: 'Platform seems reasonable' } 
    };
  }

  /**
   * Validate a single course
   * @param {Object} course - Course data
   * @returns {Object} - Validation results
   */
  validateCourse(course) {
    const validations = {
      author: this.validateAuthor(course.author),
      title: this.validateCourseTitle(course.course_title, course.platform),
      publicationYear: this.validatePublicationYear(course.publication_year),
      socialProof: this.validateSocialProof(course.vetting_notes),
      platform: this.validatePlatform(course.platform, course.author)
    };
    
    // Calculate overall confidence
    const confidenceScores = { high: 3, medium: 2, low: 1 };
    const avgConfidence = Object.values(validations).reduce((sum, v) => 
      sum + confidenceScores[v.confidence], 0) / Object.keys(validations).length;
    
    let overallConfidence = 'low';
    if (avgConfidence >= 2.5) overallConfidence = 'high';
    else if (avgConfidence >= 1.5) overallConfidence = 'medium';
    
    return {
      course_title: course.course_title,
      author: course.author,
      platform: course.platform,
      validations: validations,
      overallConfidence: overallConfidence,
      suspicious: overallConfidence === 'low'
    };
  }

  /**
   * Validate all courses in a file
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
        courses: []
      };

      console.log(`\n🔍 Validating data for: ${fileResults.opening}`);
      
      for (const course of courseData.found_courses) {
        this.results.total_courses++;
        
        const validation = this.validateCourse(course);
        fileResults.courses.push(validation);
        
        console.log(`\n   📚 Course: ${course.course_title}`);
        console.log(`   👨‍🏫 Author: ${course.author}`);
        console.log(`   🏢 Platform: ${course.platform}`);
        console.log(`   📅 Year: ${course.publication_year}`);
        
        if (validation.suspicious) {
          console.log(`   ⚠️  SUSPICIOUS - Overall confidence: ${validation.overallConfidence}`);
        } else {
          console.log(`   ✅ Seems legitimate - Overall confidence: ${validation.overallConfidence}`);
        }
        
        // Log specific issues
        Object.entries(validation.validations).forEach(([field, result]) => {
          if (result.confidence === 'low') {
            console.log(`   ❌ ${field}: ${result.details.notes}`);
          }
        });
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
    const allCourses = results.flatMap(r => r ? r.courses : []);
    const suspiciousCourses = allCourses.filter(c => c.suspicious);
    const highConfidenceCourses = allCourses.filter(c => c.overallConfidence === 'high');
    
    console.log('\n📊 COMPREHENSIVE DATA VALIDATION REPORT');
    console.log('======================================');
    console.log(`Total courses analyzed: ${allCourses.length}`);
    console.log(`High confidence: ${highConfidenceCourses.length} (${((highConfidenceCourses.length / allCourses.length) * 100).toFixed(1)}%)`);
    console.log(`Suspicious/Low confidence: ${suspiciousCourses.length} (${((suspiciousCourses.length / allCourses.length) * 100).toFixed(1)}%)`);
    
    if (suspiciousCourses.length > 0) {
      console.log('\n🚨 SUSPICIOUS COURSES:');
      suspiciousCourses.forEach(course => {
        console.log(`\n   📚 ${course.course_title}`);
        console.log(`   👨‍🏫 ${course.author} (${course.platform})`);
        console.log(`   Issues:`);
        Object.entries(course.validations).forEach(([field, result]) => {
          if (result.confidence === 'low') {
            console.log(`     - ${field}: ${result.details.notes}`);
          }
        });
      });
    }
    
    // Summary by validation type
    const validationTypes = ['author', 'title', 'publicationYear', 'socialProof', 'platform'];
    console.log('\n📋 VALIDATION SUMMARY BY TYPE:');
    validationTypes.forEach(type => {
      const lowConfidence = allCourses.filter(c => c.validations[type].confidence === 'low').length;
      const highConfidence = allCourses.filter(c => c.validations[type].confidence === 'high').length;
      console.log(`   ${type}: ${highConfidence} high confidence, ${lowConfidence} low confidence`);
    });
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node tools/validation/validate_course_data.js <path>

Arguments:
  <path>    Path to a JSON file or directory containing course analysis files

Examples:
  node tools/validation/validate_course_data.js data/course_analysis/by_opening/filename.json
  node tools/validation/validate_course_data.js data/course_analysis/by_opening/
    `);
    process.exit(1);
  }

  const inputPath = args[0];

  (async () => {
    try {
      const validator = new CourseDataValidator();
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

module.exports = CourseDataValidator;
