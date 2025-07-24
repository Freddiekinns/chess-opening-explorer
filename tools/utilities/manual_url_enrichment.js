#!/usr/bin/env node

/**
 * Manual URL Enrichment Tool
 * Helps efficiently add verified URLs and additional details to course data
 * 
 * Usage:
 *   node tools/utilities/manual_url_enrichment.js data/course_analysis/by_opening/french_defense.json
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ManualUrlEnrichment {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async enrichCourseFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const courseData = JSON.parse(data);
      
      if (!courseData.found_courses || !Array.isArray(courseData.found_courses)) {
        throw new Error('Invalid course data format');
      }

      console.log(`\n📚 MANUAL URL ENRICHMENT`);
      console.log(`================================`);
      console.log(`Opening: ${courseData.analysis_for_opening.name}`);
      console.log(`Courses to verify: ${courseData.found_courses.length}`);
      console.log(`\nFor each course, you can:`);
      console.log(`  - Add verified URL`);
      console.log(`  - Add publication year`);
      console.log(`  - Add estimated difficulty level`);
      console.log(`  - Add brief notes`);
      console.log(`  - Skip if course doesn't exist`);
      console.log(`\n${'='.repeat(50)}\n`);

      const enrichedCourses = [];
      
      for (let i = 0; i < courseData.found_courses.length; i++) {
        const course = courseData.found_courses[i];
        
        console.log(`\n📖 COURSE ${i + 1}/${courseData.found_courses.length}`);
        console.log(`${'─'.repeat(30)}`);
        console.log(`Title: ${course.course_title}`);
        console.log(`Author: ${course.author}`);
        console.log(`Platform: ${course.platform}`);
        console.log(`Scope: ${course.scope}`);
        console.log(`For: ${course.repertoire_for}`);
        
        // Generate search suggestions
        const searchSuggestions = this.generateSearchSuggestions(course);
        console.log(`\n🔍 SEARCH SUGGESTIONS:`);
        searchSuggestions.forEach((suggestion, idx) => {
          console.log(`  ${idx + 1}. ${suggestion}`);
        });
        
        console.log(`\n${'─'.repeat(30)}`);
        
        // Ask if course exists
        const exists = await this.question(`Does this course exist? (y/n/skip): `);
        
        if (exists.toLowerCase() === 'n') {
          console.log(`❌ Course marked as non-existent - excluding from final data`);
          continue;
        }
        
        if (exists.toLowerCase() === 'skip') {
          console.log(`⏭️  Course skipped - keeping in data without URL`);
          enrichedCourses.push(course);
          continue;
        }
        
        // Collect additional information
        const url = await this.question(`Enter verified URL (or press Enter to skip): `);
        const year = await this.question(`Enter publication year (or press Enter to skip): `);
        const level = await this.question(`Enter difficulty level (Beginner/Intermediate/Advanced/Master, or press Enter to skip): `);
        const notes = await this.question(`Enter brief notes (or press Enter to skip): `);
        
        // Build enriched course object
        const enrichedCourse = { ...course };
        
        if (url.trim()) {
          enrichedCourse.verified_url = url.trim();
        }
        
        if (year.trim() && !isNaN(parseInt(year.trim()))) {
          enrichedCourse.publication_year = parseInt(year.trim());
        }
        
        if (level.trim() && ['Beginner', 'Intermediate', 'Advanced', 'Master'].includes(level.trim())) {
          enrichedCourse.estimated_level = level.trim();
        }
        
        if (notes.trim()) {
          enrichedCourse.manual_notes = notes.trim();
        }
        
        enrichedCourse.manually_verified = true;
        enrichedCourse.verified_on = new Date().toISOString();
        
        enrichedCourses.push(enrichedCourse);
        console.log(`✅ Course enriched and added`);
      }
      
      // Update course data
      courseData.found_courses = enrichedCourses;
      courseData.manual_enrichment_completed = true;
      courseData.manual_enrichment_date = new Date().toISOString();
      
      // Save enriched data
      const enrichedPath = filePath.replace('.json', '_enriched.json');
      await fs.writeFile(enrichedPath, JSON.stringify(courseData, null, 2));
      
      console.log(`\n✅ ENRICHMENT COMPLETE`);
      console.log(`==============================`);
      console.log(`Original courses: ${courseData.found_courses.length + (courseData.found_courses.length - enrichedCourses.length)}`);
      console.log(`Verified courses: ${enrichedCourses.length}`);
      console.log(`Excluded courses: ${courseData.found_courses.length - enrichedCourses.length}`);
      console.log(`Enriched file saved: ${enrichedPath}`);
      
      return enrichedPath;
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  generateSearchSuggestions(course) {
    const suggestions = [];
    
    // Platform-specific searches
    if (course.platform === 'Chessable') {
      suggestions.push(`site:chessable.com "${course.course_title}"`);
      suggestions.push(`site:chessable.com "${course.author}" french defense`);
    } else if (course.platform === 'Chess.com') {
      suggestions.push(`site:chess.com "${course.course_title}"`);
      suggestions.push(`site:chess.com "${course.author}" course`);
    } else if (course.platform === 'ChessBase') {
      suggestions.push(`site:chessbase.com "${course.course_title}"`);
      suggestions.push(`site:chessbase.com "${course.author}" dvd`);
    }
    
    // General searches
    suggestions.push(`"${course.course_title}" ${course.author}`);
    suggestions.push(`${course.author} french defense course`);
    
    return suggestions;
  }

  async close() {
    this.rl.close();
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node tools/utilities/manual_url_enrichment.js <course_file.json>

Examples:
  node tools/utilities/manual_url_enrichment.js course_analysis_test/french_defense.json
    `);
    process.exit(1);
  }

  const filePath = args[0];

  (async () => {
    const enricher = new ManualUrlEnrichment();
    
    try {
      await enricher.enrichCourseFile(filePath);
    } catch (error) {
      console.error(`💥 Error: ${error.message}`);
      process.exit(1);
    } finally {
      await enricher.close();
    }
  })();
}

module.exports = ManualUrlEnrichment;
