/**
 * Course Data Integration Pipeline
 * Processes AI-generated course analysis into production-ready course database
 * Location: tools/production/integrate_course_data.js
 */

const fs = require('fs');
const path = require('path');

class CourseDataIntegrator {
  constructor() {
    this.analysisDir = path.join(__dirname, '../../data/course_analysis/by_opening');
    this.outputPath = path.join(__dirname, '../../packages/api/src/data/courses.json');
    this.stats = {
      processedFiles: 0,
      totalCourses: 0,
      duplicatesRemoved: 0,
      errors: 0
    };
  }

  /**
   * Main integration function
   */
  async integrate() {
    console.log('🔄 Starting course data integration...');
    
    try {
      // Ensure output directory exists
      await this.ensureOutputDir();
      
      // Process all analysis files
      const courseDatabase = await this.processAnalysisFiles();
      
      // Apply anchor and deduplication logic
      const cleanedDatabase = await this.cleanAndValidateData(courseDatabase);
      
      // Write to production file
      await this.writeProductionData(cleanedDatabase);
      
      // Generate statistics
      this.printStatistics(cleanedDatabase);
      
      console.log('✅ Course data integration completed successfully!');
      
    } catch (error) {
      console.error('❌ Integration failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Process all analysis files in the analysis directory
   */
  async processAnalysisFiles() {
    if (!fs.existsSync(this.analysisDir)) {
      console.log('📁 No analysis directory found. Creating empty course database.');
      return {};
    }

    const files = fs.readdirSync(this.analysisDir).filter(f => f.endsWith('.json'));
    const courseDatabase = {};

    for (const filename of files) {
      try {
        const filePath = path.join(this.analysisDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = JSON.parse(content);

        // Extract FEN from the analysis content, not filename (prevents name collisions)
        const fen = analysis.analysis_for_opening?.fen;
        
        if (!fen) {
          console.warn(`⚠️  No FEN found in analysis_for_opening for ${filename}`);
          this.stats.errors++;
          continue;
        }
        
        // Process the analysis
        if (analysis.found_courses && Array.isArray(analysis.found_courses)) {
          courseDatabase[fen] = this.processCourses(analysis.found_courses, fen);
          this.stats.processedFiles++;
          this.stats.totalCourses += analysis.found_courses.length;
        }
        
      } catch (error) {
        console.warn(`⚠️  Failed to process ${filename}:`, error.message);
        this.stats.errors++;
      }
    }

    return courseDatabase;
  }

  /**
   * Process courses for a specific opening
   */
  processCourses(courses, fen) {
    return courses
      .filter(course => this.validateCourse(course))
      .map(course => this.normalizeCourse(course, fen));
  }

  /**
   * Validate a course object
   */
  validateCourse(course) {
    const requiredFields = [
      'course_title', 'author', 'platform', 'repertoire_for', 'scope', 'anchor_fens'
    ];

    for (const field of requiredFields) {
      if (!course[field]) {
        return false;
      }
    }

    // Validate anchor_fens is an array
    if (!Array.isArray(course.anchor_fens) || course.anchor_fens.length === 0) {
      return false;
    }

    // Validate repertoire_for has valid values
    if (!['White', 'Black', 'Both'].includes(course.repertoire_for)) {
      return false;
    }

    // Validate scope has valid values
    if (!['Generalist', 'Specialist', 'System'].includes(course.scope)) {
      return false;
    }

    return true;
  }

  /**
   * Normalize course data and ensure schema compliance
   */
  normalizeCourse(course, fen) {
    return {
      course_title: course.course_title.trim(),
      author: course.author.trim(),
      platform: course.platform.trim(),
      repertoire_for: course.repertoire_for,
      publication_year: course.publication_year || new Date().getFullYear(),
      estimated_level: course.estimated_level || 'Intermediate', // Default if not specified
      scope: course.scope,
      source_url: course.source_url ? course.source_url.trim() : '', // Optional field
      vetting_notes: course.vetting_notes || '',
      last_verified_on: new Date().toISOString().split('T')[0],
      quality_score: {
        authority_score: course.quality_score?.authority_score || 0,
        social_proof_score: course.quality_score?.social_proof_score || 0,
        buzz_score: course.quality_score?.buzz_score || 0,
        total_score: course.quality_score?.total_score || 0
      },
      anchor_fens: course.anchor_fens || [fen]
    };
  }

  /**
   * Clean and validate the final course database
   */
  async cleanAndValidateData(courseDatabase) {
    const cleanedDatabase = {};
    const seenUrls = new Set();

    for (const [fen, courses] of Object.entries(courseDatabase)) {
      const uniqueCourses = [];

      for (const course of courses) {
        // Remove duplicates based on source URL
        if (!seenUrls.has(course.source_url)) {
          seenUrls.add(course.source_url);
          uniqueCourses.push(course);
        } else {
          this.stats.duplicatesRemoved++;
        }
      }

      if (uniqueCourses.length > 0) {
        // Sort by quality score descending
        uniqueCourses.sort((a, b) => b.quality_score.total_score - a.quality_score.total_score);
        cleanedDatabase[fen] = uniqueCourses;
      }
    }

    return cleanedDatabase;
  }

  /**
   * Write the production course data
   */
  async writeProductionData(courseDatabase) {
    const jsonData = JSON.stringify(courseDatabase, null, 2);
    fs.writeFileSync(this.outputPath, jsonData);
    console.log(`📝 Written course database to: ${this.outputPath}`);
  }

  /**
   * Print integration statistics
   */
  printStatistics(courseDatabase) {
    const fens = Object.keys(courseDatabase);
    const totalCourses = Object.values(courseDatabase).reduce((sum, courses) => sum + courses.length, 0);
    const platforms = new Set();
    
    Object.values(courseDatabase).forEach(courses => {
      courses.forEach(course => platforms.add(course.platform));
    });

    console.log('\n📊 Integration Statistics:');
    console.log(`   Files processed: ${this.stats.processedFiles}`);
    console.log(`   FENs with courses: ${fens.length}`);
    console.log(`   Total courses: ${totalCourses}`);
    console.log(`   Duplicates removed: ${this.stats.duplicatesRemoved}`);
    console.log(`   Processing errors: ${this.stats.errors}`);
    console.log(`   Platforms found: ${platforms.size} (${Array.from(platforms).join(', ')})`);
    console.log(`   Average courses per FEN: ${(totalCourses / fens.length || 0).toFixed(1)}`);
  }
}

// CLI execution
if (require.main === module) {
  const integrator = new CourseDataIntegrator();
  integrator.integrate().catch(error => {
    console.error('❌ Integration failed:', error);
    process.exit(1);
  });
}

module.exports = CourseDataIntegrator;
