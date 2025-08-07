const searchService = require('../../packages/api/src/services/search-service');

async function testProblemCases() {
  console.log('=== Testing Problem Cases ===\n');
  
  try {
    await searchService.initialize();
    console.log('✅ Search service initialized successfully\n');
    
    // Test 1: attacking search
    console.log('🔍 TEST 1: Search for "attacking"');
    console.log('Expected: Popular attacking openings prioritized by games count\n');
    
    const attackingResults = await searchService.search('attacking', { limit: 5 });
    console.log(`Found ${attackingResults.results.length} results for "attacking"`);
    console.log(`Search type: ${attackingResults.searchType}\n`);
    
    attackingResults.results.slice(0, 5).forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Search score: ${opening.searchScore || 'N/A'}`);
      console.log('');
    });
    
    // Test 2: gambit search
    console.log('🔍 TEST 2: Search for "gambit"');
    console.log('Expected: Popular gambits like Queen\'s Gambit prioritized\n');
    
    const gambitResults = await searchService.search('gambit', { limit: 5 });
    console.log(`Found ${gambitResults.results.length} results for "gambit"`);
    console.log(`Search type: ${gambitResults.searchType}\n`);
    
    gambitResults.results.slice(0, 5).forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Search score: ${opening.searchScore || 'N/A'}`);
      console.log('');
    });
    
    // Test 3: gambi search (partial)
    console.log('🔍 TEST 3: Search for "gambi" (partial)');
    console.log('Expected: Should work similarly to "gambit"\n');
    
    const gambiResults = await searchService.search('gambi', { limit: 5 });
    console.log(`Found ${gambiResults.results.length} results for "gambi"`);
    console.log(`Search type: ${gambiResults.searchType}\n`);
    
    gambiResults.results.slice(0, 5).forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Search score: ${opening.searchScore || 'N/A'}`);
      console.log('');
    });
    
    // Test 4: Check if "attacking" triggers semantic search 
    console.log('🔍 TEST 4: Check search routing for "attacking"');
    console.log('looksLikeOpeningName("attacking"):', searchService.looksLikeOpeningName('attacking'));
    console.log('parseQueryIntent("attacking"):', searchService.parseQueryIntent('attacking'));
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testProblemCases();
