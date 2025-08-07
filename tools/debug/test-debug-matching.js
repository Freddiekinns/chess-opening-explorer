const searchService = require('../../packages/api/src/services/search-service');

async function debugWordMatching() {
  console.log('=== Debug Word Matching Logic ===\n');
  
  try {
    await searchService.initialize();
    console.log('✅ Search service initialized successfully\n');
    
    // Test the exact issue
    console.log('🔍 Debugging "kings gambit" search\n');
    
    const query = 'kings gambit';
    const results = await searchService.search(query, { limit: 10 });
    
    console.log(`Search type: ${results.searchType}`);
    console.log('Top 10 results with debug info:\n');
    
    for (let i = 0; i < Math.min(10, results.results.length); i++) {
      const result = results.results[i];
      const isKingsGambit = result.name.toLowerCase().includes("king's gambit");
      const isQueensGambit = result.name.toLowerCase().includes("queen's gambit");
      
      console.log(`${i + 1}. ${result.name} (${result.eco})`);
      console.log(`   Games: ${result.games_analyzed || 0}`);
      console.log(`   Score: ${result.searchScore?.toFixed(3) || 'N/A'}`);
      console.log(`   Match type: ${result._debugMatchType || 'unknown'}`);
      console.log(`   Word precision: ${result._debugWordPrecision?.toFixed(3) || 'N/A'}`);
      
      if (isKingsGambit) {
        console.log(`   ✅ THIS IS A KING'S GAMBIT`);
      } else if (isQueensGambit) {
        console.log(`   ❌ This is Queen's Gambit (should rank lower)`);
      }
      
      // Manual word analysis
      const name = result.name.toLowerCase();
      const queryWords = query.split(/\s+/);
      console.log(`   Word analysis:`);
      queryWords.forEach(word => {
        const nameWords = name.split(/\s+/);
        const exactMatch = nameWords.includes(word);
        const startsWithMatch = nameWords.some(nw => nw.startsWith(word));
        const substringMatch = name.includes(word);
        
        console.log(`     "${word}": exact=${exactMatch}, starts=${startsWithMatch}, substring=${substringMatch}`);
      });
      
      console.log('');
    }
    
    // Test specific problematic matching
    console.log('\n🔍 Specific Word Matching Tests\n');
    
    const testCases = [
      { query: 'kings', name: "King's Gambit" },
      { query: 'kings', name: "Queen's Gambit" },
      { query: 'kings', name: "Queen's Gambit Declined" },
    ];
    
    testCases.forEach(testCase => {
      const name = testCase.name.toLowerCase();
      const nameWords = name.split(/\s+/);
      const queryWord = testCase.query;
      
      console.log(`Query: "${queryWord}" vs Name: "${testCase.name}"`);
      console.log(`  Name words: [${nameWords.join(', ')}]`);
      console.log(`  Exact word match: ${nameWords.includes(queryWord)}`);
      console.log(`  Starts with match: ${nameWords.some(nw => nw.startsWith(queryWord))}`);
      console.log(`  Substring match: ${name.includes(queryWord)}`);
      console.log(`  Problem: ${name.includes(queryWord) && !nameWords.includes(queryWord) ? 'YES - FALSE POSITIVE' : 'NO'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugWordMatching();
