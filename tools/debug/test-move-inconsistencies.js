const searchService = require('../../packages/api/src/services/search-service');

async function testMoveInconsistencies() {
  console.log('=== Testing Move Search Inconsistencies ===\n');
  
  try {
    await searchService.initialize();
    console.log('✅ Search service initialized successfully\n');
    
    const moves = [
      { move: 'd4', expected: 'Queen\'s Pawn Game' },
      { move: 'e4', expected: 'King\'s Pawn Game' },
      { move: 'e5', expected: 'King\'s Pawn Game' },
      { move: 'c4', expected: 'English Opening' },
      { move: 'c5', expected: 'Sicilian Defense' }
    ];
    
    for (const testCase of moves) {
      console.log(`🔍 Testing move: "${testCase.move}"`);
      console.log(`Expected: ${testCase.expected}`);
      
      const results = await searchService.search(testCase.move, { limit: 10 });
      console.log(`  Search type: ${results.searchType}`);
      console.log(`  Results found: ${results.results.length}`);
      
      if (results.results.length > 0) {
        console.log('  Top 5 results:');
        for (let i = 0; i < Math.min(5, results.results.length); i++) {
          const result = results.results[i];
          const isExpected = result.name.toLowerCase().includes(testCase.expected.toLowerCase());
          const marker = i === 0 && isExpected ? '✅' : 
                        i === 0 && !isExpected ? '❌' : '  ';
          
          console.log(`${marker} ${i+1}. ${result.name} (${result.eco})`);
          console.log(`       Moves: ${result.moves}`);
          console.log(`       Games: ${result.games_analyzed || 0}`);
          console.log(`       Score: ${result.searchScore?.toFixed(3) || 'N/A'}`);
        }
        
        // Check if the expected opening is in the results
        const expectedResult = results.results.find(r => 
          r.name.toLowerCase().includes(testCase.expected.toLowerCase())
        );
        
        if (expectedResult && results.results.indexOf(expectedResult) !== 0) {
          const position = results.results.indexOf(expectedResult) + 1;
          console.log(`  ⚠️  Expected "${testCase.expected}" found at position ${position}`);
        } else if (!expectedResult) {
          console.log(`  ❌ Expected "${testCase.expected}" not found in top 10 results`);
        }
      } else {
        console.log(`  ❌ No results found`);
      }
      
      console.log('');
    }
    
    // Let's also check what openings actually start with these moves
    console.log('=== Analysis: What openings actually start with these moves? ===\n');
    
    const allOpenings = await searchService.openings;
    
    for (const testCase of moves) {
      console.log(`📊 Openings starting with "${testCase.move}":`);
      
      const matchingOpenings = allOpenings.filter(opening => {
        const moves = opening.moves?.toLowerCase() || '';
        // Check for first move patterns
        return moves.startsWith(`1. ${testCase.move}`) || 
               moves.startsWith(`1.${testCase.move}`) ||
               moves.includes(`1... ${testCase.move}`) ||
               moves.includes(`1...${testCase.move}`);
      });
      
      // Sort by games analyzed
      const sortedOpenings = matchingOpenings
        .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
        .slice(0, 5);
      
      console.log(`  Found ${matchingOpenings.length} total openings`);
      console.log('  Top 5 by popularity:');
      
      sortedOpenings.forEach((opening, index) => {
        console.log(`    ${index + 1}. ${opening.name} (${opening.eco})`);
        console.log(`       Moves: ${opening.moves}`);
        console.log(`       Games: ${opening.games_analyzed || 0}`);
      });
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMoveInconsistencies();
