#!/usr/bin/env node

/**
 * URL Validation Tool for Course Analysis Data
 * Checks if the generated course URLs actually exist (return 200 status)
 * 
 * Usage:
 *   node tools/validation/validate_course_urls.js data/course_analysis/by_opening/filename.json
 *   node tools/validation/validate_course_urls.js data/course_analysis/by_opening/  # validate all files
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class CourseURLValidator {
  constructor() {
    this.results = {
      total_courses: 0,
      valid_urls: 0,
      invalid_urls: 0,
      validation_errors: []
    };
  }

  /**
   * Check if a URL returns a 200 status code with detailed response info
   * @param {string} url - URL to check
   * @returns {Promise<{valid: boolean, status: number, error: string, redirectUrl: string, contentType: string}>}
   */
  async validateURL(url) {
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET', // Use GET to see what we actually get
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };

        const req = client.request(options, (res) => {
          let redirectUrl = null;
          let contentType = res.headers['content-type'] || 'unknown';
          
          // Check for redirects
          if (res.statusCode >= 300 && res.statusCode < 400) {
            redirectUrl = res.headers.location;
          }
          
          // Read a small amount of the response to check content
          let responseData = '';
          res.setEncoding('utf8');
          
          res.on('data', (chunk) => {
            responseData += chunk;
            // Only read first 1000 characters to check for 404 pages
            if (responseData.length > 1000) {
              res.destroy();
            }
          });
          
          res.on('end', () => {
            // Check if it's actually a 404 page disguised as 200
            const is404Content = responseData.toLowerCase().includes('404') || 
                                responseData.toLowerCase().includes('not found') ||
                                responseData.toLowerCase().includes('page not found');
            
            // Extract the actual course title from the page
            let actualTitle = 'Unknown';
            const titleMatch = responseData.match(/<title[^>]*>([^<]*)<\/title>/i);
            if (titleMatch) {
              actualTitle = titleMatch[1].replace(' - Chessable', '').trim();
            }
            
            // Also check meta title
            const metaTitleMatch = responseData.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"[^>]*>/i);
            if (metaTitleMatch) {
              actualTitle = metaTitleMatch[1].replace(' - Chessable', '').trim();
            }
            
            resolve({
              valid: res.statusCode === 200 && !is404Content,
              status: res.statusCode,
              error: null,
              redirectUrl: redirectUrl,
              contentType: contentType,
              actualContent: is404Content ? '404 content detected' : 'Valid content',
              actualTitle: actualTitle
            });
          });
          
          res.on('error', () => {
            resolve({
              valid: false,
              status: res.statusCode,
              error: 'Response error',
              redirectUrl: redirectUrl,
              contentType: contentType
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            valid: false,
            status: null,
            error: error.message,
            redirectUrl: null,
            contentType: null
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            valid: false,
            status: null,
            error: 'Request timeout',
            redirectUrl: null,
            contentType: null
          });
        });

        req.end();
      } catch (error) {
        resolve({
          valid: false,
          status: null,
          error: `Invalid URL: ${error.message}`,
          redirectUrl: null,
          contentType: null
        });
      }
    });
  }

  /**
   * Check if two course titles are similar enough to be considered a match
   * @param {string} claimed - The claimed course title
   * @param {string} actual - The actual course title from the page
   * @returns {boolean} - Whether they match
   */
  fuzzyTitleMatch(claimed, actual) {
    if (!claimed || !actual) return false;
    
    // Normalize both titles
    const normalize = (str) => str.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const claimedNorm = normalize(claimed);
    const actualNorm = normalize(actual);
    
    // Direct match
    if (claimedNorm === actualNorm) return true;
    
    // Check if one contains the other
    if (claimedNorm.includes(actualNorm) || actualNorm.includes(claimedNorm)) return true;
    
    // Check for key words overlap
    const claimedWords = claimedNorm.split(' ').filter(w => w.length > 3);
    const actualWords = actualNorm.split(' ').filter(w => w.length > 3);
    
    if (claimedWords.length === 0 || actualWords.length === 0) return false;
    
    const commonWords = claimedWords.filter(w => actualWords.includes(w));
    const overlapRatio = commonWords.length / Math.max(claimedWords.length, actualWords.length);
    
    return overlapRatio > 0.5; // 50% overlap
  }

  /**
   * Validate all URLs in a course analysis file
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

      console.log(`\n🔍 Validating URLs for: ${fileResults.opening}`);
      
      for (const course of courseData.found_courses) {
        this.results.total_courses++;
        
        console.log(`   Checking: ${course.course_title}`);
        console.log(`   URL: ${course.source_url}`);
        
        const validation = await this.validateURL(course.source_url);
        
        const courseResult = {
          course_title: course.course_title,
          author: course.author,
          platform: course.platform,
          source_url: course.source_url,
          validation: validation
        };
        
        if (validation.valid) {
          this.results.valid_urls++;
          console.log(`   ✅ Valid (${validation.status})`);
          if (validation.actualTitle) {
            console.log(`   📚 Actual course: ${validation.actualTitle}`);
            // Check if the actual title matches the claimed title
            const titleMatch = this.fuzzyTitleMatch(course.course_title, validation.actualTitle);
            if (!titleMatch) {
              console.log(`   ⚠️  Title mismatch! Expected: ${course.course_title}`);
            }
          }
        } else {
          this.results.invalid_urls++;
          console.log(`   ❌ Invalid (${validation.status || 'Error'}: ${validation.error || validation.actualContent || 'Unknown error'})`);
          if (validation.redirectUrl) {
            console.log(`   🔄 Redirect to: ${validation.redirectUrl}`);
          }
          if (validation.contentType) {
            console.log(`   📄 Content-Type: ${validation.contentType}`);
          }
          
          this.results.validation_errors.push({
            file: fileResults.file,
            course: course.course_title,
            url: course.source_url,
            error: validation.error || validation.actualContent || `HTTP ${validation.status}`,
            redirectUrl: validation.redirectUrl,
            contentType: validation.contentType,
            actualTitle: validation.actualTitle
          });
        }
        
        fileResults.courses.push(courseResult);
        
        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return fileResults;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate all JSON files in a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array>} - Array of validation results
   */
  async validateDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        console.log(`No JSON files found in ${dirPath}`);
        return [];
      }

      console.log(`Found ${jsonFiles.length} course analysis files`);
      
      const allResults = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(dirPath, file);
        const result = await this.validateCourseFile(filePath);
        if (result) {
          allResults.push(result);
        }
      }

      return allResults;
    } catch (error) {
      console.error(`❌ Error reading directory ${dirPath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate a validation report
   * @param {Array} results - Validation results
   */
  generateReport(results) {
    console.log('\n📊 VALIDATION REPORT');
    console.log('===================');
    console.log(`Total courses checked: ${this.results.total_courses}`);
    console.log(`Valid URLs: ${this.results.valid_urls} (${((this.results.valid_urls / this.results.total_courses) * 100).toFixed(1)}%)`);
    console.log(`Invalid URLs: ${this.results.invalid_urls} (${((this.results.invalid_urls / this.results.total_courses) * 100).toFixed(1)}%)`);
    
    if (this.results.validation_errors.length > 0) {
      console.log('\n❌ INVALID URLS SUMMARY:');
      this.results.validation_errors.forEach(error => {
        console.log(`   ${error.file} - ${error.course}`);
        console.log(`   URL: ${error.url}`);
        console.log(`   Error: ${error.error}`);
        console.log('');
      });
    }

    // Group by platform to see patterns
    const platformStats = {};
    results.forEach(fileResult => {
      fileResult.courses.forEach(course => {
        if (!platformStats[course.platform]) {
          platformStats[course.platform] = { valid: 0, invalid: 0 };
        }
        if (course.validation.valid) {
          platformStats[course.platform].valid++;
        } else {
          platformStats[course.platform].invalid++;
        }
      });
    });

    console.log('\n📈 PLATFORM BREAKDOWN:');
    Object.entries(platformStats).forEach(([platform, stats]) => {
      const total = stats.valid + stats.invalid;
      const validPercent = ((stats.valid / total) * 100).toFixed(1);
      console.log(`   ${platform}: ${stats.valid}/${total} valid (${validPercent}%)`);
    });
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node tools/validation/validate_course_urls.js <path>

Arguments:
  <path>    Path to a JSON file or directory containing course analysis files

Examples:
  node tools/validation/validate_course_urls.js data/course_analysis/by_opening/filename.json
  node tools/validation/validate_course_urls.js data/course_analysis/by_opening/
    `);
    process.exit(1);
  }

  const inputPath = args[0];

  (async () => {
    try {
      const validator = new CourseURLValidator();
      let results = [];

      const stat = await fs.stat(inputPath);
      
      if (stat.isDirectory()) {
        results = await validator.validateDirectory(inputPath);
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

module.exports = CourseURLValidator;
