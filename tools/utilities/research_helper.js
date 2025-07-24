#!/usr/bin/env node

/**
 * Research Helper Tool
 * Opens browser tabs with search suggestions for course verification
 * 
 * Usage:
 *   node tools/utilities/research_helper.js data/course_analysis/by_opening/french_defense.json
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class ResearchHelper {
  async generateResearchBatch(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const courseData = JSON.parse(data);
      
      console.log(`\n🔍 RESEARCH BATCH GENERATOR`);
      console.log(`===========================`);
      console.log(`Opening: ${courseData.analysis_for_opening.name}`);
      console.log(`Courses: ${courseData.found_courses.length}`);
      
      const searches = [];
      
      courseData.found_courses.forEach((course, idx) => {
        console.log(`\n📖 Course ${idx + 1}: ${course.course_title}`);
        console.log(`👨‍🏫 Author: ${course.author}`);
        console.log(`🏢 Platform: ${course.platform}`);
        
        // Generate search URLs
        const searchQueries = this.generateSearchQueries(course);
        searchQueries.forEach((query, queryIdx) => {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          searches.push({ course: idx + 1, query, url: searchUrl });
          console.log(`  ${queryIdx + 1}. ${query}`);
        });
      });
      
      // Save research batch
      const researchFile = filePath.replace('.json', '_research_batch.json');
      await fs.writeFile(researchFile, JSON.stringify({
        opening: courseData.analysis_for_opening.name,
        generated_on: new Date().toISOString(),
        courses: courseData.found_courses.map((course, idx) => ({
          index: idx + 1,
          course_title: course.course_title,
          author: course.author,
          platform: course.platform,
          search_queries: this.generateSearchQueries(course),
          search_urls: this.generateSearchQueries(course).map(q => 
            `https://www.google.com/search?q=${encodeURIComponent(q)}`
          )
        }))
      }, null, 2));
      
      console.log(`\n✅ Research batch saved: ${researchFile}`);
      console.log(`\n🌐 NEXT STEPS:`);
      console.log(`1. Open the research file in your browser`);
      console.log(`2. Click through the search URLs`);
      console.log(`3. Copy verified URLs to a spreadsheet`);
      console.log(`4. Use manual enrichment tool to add them back`);
      
      return researchFile;
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  generateSearchQueries(course) {
    const queries = [];
    
    // Platform-specific searches
    if (course.platform === 'Chessable') {
      queries.push(`site:chessable.com "${course.course_title}"`);
      queries.push(`site:chessable.com "${course.author}" french`);
    } else if (course.platform === 'Chess.com') {
      queries.push(`site:chess.com "${course.course_title}"`);
      queries.push(`site:chess.com "${course.author}" course`);
    } else if (course.platform === 'ChessBase') {
      queries.push(`site:chessbase.com "${course.course_title}"`);
      queries.push(`site:chessbase.com "${course.author}"`);
    }
    
    // General searches
    queries.push(`"${course.course_title}" ${course.author}`);
    
    return queries;
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node tools/utilities/research_helper.js <course_file.json>

Examples:
  node tools/utilities/research_helper.js data/course_analysis/by_opening/french_defense.json
    `);
    process.exit(1);
  }

  const filePath = args[0];

  (async () => {
    const helper = new ResearchHelper();
    
    try {
      await helper.generateResearchBatch(filePath);
    } catch (error) {
      console.error(`💥 Error: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = ResearchHelper;
