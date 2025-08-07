#!/usr/bin/env node

/**
 * Test script for semantic search functionality
 * Run with: node test-semantic-search.js
 */

const searchService = require('../../packages/api/src/services/search-service');

async function testSemanticSearch() {
  console.log('🧪 Testing Semantic Search Functionality\n');
  
  // Test queries based on user examples
  const testQueries = [
    'aggressive openings',
    'solid response to d4', 
    'beginner queens pawn openings',
    'attacking options for black',
    'french defense',
    'sicilian',
    'tactical openings',
    'positional play',
    'gambit'
  ];

  try {
    // Initialize the search service
    console.log('🔄 Initializing search service...');
    await searchService.initialize();
    console.log('✅ Search service initialized\n');

    for (const query of testQueries) {
      console.log(`🔍 Testing query: "${query}"`);
      
      try {
        const results = await searchService.search(query, { limit: 5 });
        
        if (results.results && results.results.length > 0) {
          console.log(`✅ Found ${results.results.length} results (${results.searchType || 'unknown'} search)`);
          
          // Show top 3 results
          results.results.slice(0, 3).forEach((opening, index) => {
            const score = opening.searchScore ? ` (${(opening.searchScore * 100).toFixed(1)}%)` : '';
            console.log(`   ${index + 1}. ${opening.name} (${opening.eco})${score}`);
            
            // Show style tags if available
            if (opening.analysis_json?.style_tags) {
              const tags = opening.analysis_json.style_tags.slice(0, 3).join(', ');
              console.log(`      Tags: ${tags}`);
            }
          });
          
          // Show query intent if available
          if (results.queryIntent) {
            console.log(`   Intent: ${results.queryIntent.type} - ${JSON.stringify(results.queryIntent.style || [])}`);
          }
        } else {
          console.log('❌ No results found');
        }
        
        console.log(''); // Empty line for readability
      } catch (error) {
        console.error(`❌ Error searching for "${query}":`, error.message);
        console.log('');
      }
    }

    // Test category search
    console.log('📂 Testing category search...');
    try {
      const categories = await searchService.getCategories();
      console.log(`✅ Found ${categories.length} categories:`);
      categories.slice(0, 5).forEach(cat => {
        console.log(`   - ${cat.displayName}: ${cat.count} openings`);
      });
      console.log('');

      // Test searching within a category
      if (categories.length > 0) {
        const testCategory = categories[0].name;
        console.log(`🔍 Testing category search for "${testCategory}"...`);
        const categoryResults = await searchService.searchByCategory(testCategory, { limit: 3 });
        
        if (categoryResults.results.length > 0) {
          console.log(`✅ Found ${categoryResults.results.length} results in ${testCategory}:`);
          categoryResults.results.forEach((opening, index) => {
            console.log(`   ${index + 1}. ${opening.name} (${opening.eco})`);
          });
        }
        console.log('');
      }
    } catch (error) {
      console.error('❌ Error testing categories:', error.message);
    }

    // Test suggestions
    console.log('💡 Testing search suggestions...');
    try {
      const suggestionQueries = ['aggr', 'solid', 'd4', 'french'];
      
      for (const partialQuery of suggestionQueries) {
        const suggestions = await searchService.getSuggestions(partialQuery, 5);
        if (suggestions.length > 0) {
          console.log(`✅ Suggestions for "${partialQuery}": ${suggestions.slice(0, 3).join(', ')}`);
        } else {
          console.log(`❌ No suggestions for "${partialQuery}"`);
        }
      }
    } catch (error) {
      console.error('❌ Error testing suggestions:', error.message);
    }

    console.log('\n🎉 Semantic search testing completed!');
  } catch (error) {
    console.error('❌ Failed to initialize search service:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSemanticSearch().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testSemanticSearch };
