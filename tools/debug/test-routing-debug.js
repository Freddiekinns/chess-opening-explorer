const searchService = require('../../packages/api/src/services/search-service');

async function debugRouting() {
  console.log('=== Search Routing Debug ===\n');
  
  try {
    await searchService.initialize();
    
    const testQueries = [
      'kings gambit',    // Fixed - goes to popularity_first
      'queens gambit',   // Works - goes to popularity_first  
      'kings indian',    // Issue - goes to fuzzy
      'queens indian',   // Compare
      'gambit',          // Compare
      'attacking'        // Compare
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      // Check routing logic
      const normalizedQuery = query.toLowerCase().trim();
      const looksLikeOpeningName = searchService.looksLikeOpeningName(normalizedQuery);
      const isAmbiguousTerm = searchService.isAmbiguousSemanticTerm(normalizedQuery);
      
      console.log(`  - looksLikeOpeningName: ${looksLikeOpeningName}`);
      console.log(`  - isAmbiguousSemanticTerm: ${isAmbiguousTerm}`);
      
      // Get actual search result to see routing
      const result = await searchService.search(query, { limit: 3 });
      console.log(`  - Actual searchType: ${result.searchType}`);
      console.log(`  - Top result: ${result.results[0]?.name || 'None'} (${result.results[0]?.games_analyzed || 0} games)`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugRouting();
