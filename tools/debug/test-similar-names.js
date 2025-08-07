const searchService = require('../../packages/api/src/services/search-service');

async function testSimilarOpeningNames() {
  console.log('=== Testing Similar Opening Names Issue ===\n');
  
  try {
    await searchService.initialize();
    console.log('✅ Search service initialized successfully\n');
    
    // Test cases for similar opening names
    const testCases = [
      {
        name: 'Kings Gambit vs Queens Gambit',
        query: 'kings gambit',
        expectedFirst: 'King\'s Gambit',
        issue: 'Should return King\'s Gambit, not Queen\'s Gambit'
      },
      {
        name: 'King\'s Indian vs Queen\'s Indian',
        query: 'kings indian',
        expectedFirst: 'King\'s Indian',
        issue: 'Should return King\'s Indian Defense'
      },
      {
        name: 'Comparison: queens gambit search',
        query: 'queens gambit',
        expectedFirst: 'Queen\'s Gambit',
        issue: 'Should still work correctly for Queen\'s Gambit'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`🔍 ${testCase.name}`);
      console.log(`Query: "${testCase.query}"`);
      console.log(`Issue: ${testCase.issue}`);
      
      const results = await searchService.search(testCase.query, { limit: 10 });
      
      console.log(`✓ Search type: ${results.searchType}`);
      console.log(`✓ Results found: ${results.results.length}`);
      
      if (results.results.length > 0) {
        console.log('\nTop 5 results:');
        for (let i = 0; i < Math.min(5, results.results.length); i++) {
          const result = results.results[i];
          const isExpected = testCase.expectedFirst && 
                            result.name.toLowerCase().includes(testCase.expectedFirst.toLowerCase());
          const marker = i === 0 && isExpected ? '✅' : 
                        i === 0 && !isExpected ? '❌' : '  ';
          
          console.log(`${marker} ${i + 1}. ${result.name} (${result.eco})`);
          console.log(`     Games: ${result.games_analyzed || 0}`);
          console.log(`     Score: ${result.searchScore?.toFixed(3) || 'N/A'}`);
        }
        
        // Analyze the issue
        const firstResult = results.results[0];
        if (testCase.expectedFirst && !firstResult.name.toLowerCase().includes(testCase.expectedFirst.toLowerCase())) {
          console.log(`\n⚠️  ISSUE CONFIRMED: Expected "${testCase.expectedFirst}" in top result`);
          console.log(`    Got: ${firstResult.name} (${firstResult.games_analyzed || 0} games)`);
          
          // Look for the expected result in the list
          const expectedResult = results.results.find(r => 
            r.name.toLowerCase().includes(testCase.expectedFirst.toLowerCase())
          );
          
          if (expectedResult) {
            const expectedIndex = results.results.indexOf(expectedResult);
            console.log(`    Expected result found at position ${expectedIndex + 1}:`);
            console.log(`    ${expectedResult.name} (${expectedResult.games_analyzed || 0} games, score: ${expectedResult.searchScore?.toFixed(3)})`);
            
            // Calculate the score difference
            const scoreDiff = firstResult.searchScore - expectedResult.searchScore;
            console.log(`    Score difference: ${scoreDiff.toFixed(3)} (higher means first result has higher score)`);
            
            // Analyze why Queen's Gambit might be ranking higher
            if (testCase.query === 'kings gambit') {
              console.log(`    Popularity ratio: ${(firstResult.games_analyzed / expectedResult.games_analyzed).toFixed(2)}x more popular`);
            }
          } else {
            console.log(`    Expected result not found in top ${results.results.length} results`);
          }
        }
      } else {
        console.log(`❌ No results found`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    // Additional analysis: Check fuzzy matching behavior
    console.log('🔍 Analyzing Fuzzy Matching Behavior\n');
    
    // Test the Fuse.js scoring directly
    console.log('Direct fuzzy search for "kings gambit":');
    const directFuzzy = searchService.fuse.search('kings gambit');
    
    if (directFuzzy.length > 0) {
      console.log('Top 5 direct fuzzy results:');
      for (let i = 0; i < Math.min(5, directFuzzy.length); i++) {
        const result = directFuzzy[i];
        console.log(`  ${i + 1}. ${result.item.name} (${result.item.eco})`);
        console.log(`     Fuzzy score: ${result.score.toFixed(3)} (lower is better)`);
        console.log(`     Games: ${result.item.games_analyzed || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimilarOpeningNames();
