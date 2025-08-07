const searchService = require('../../packages/api/src/services/search-service');

async function testFrenchSearch() {
  console.log('🔍 Testing "French" search ranking...\n');
  
  try {
    const results = await searchService.search('french', { limit: 10 });
    
    console.log(`Found ${results.totalResults} results for "french"`);
    console.log(`Search type: ${results.searchType}\n`);
    
    console.log('Top 10 results:');
    console.log('=' .repeat(120));
    console.log('Rank | Name                                    | Games Analyzed  | Search Score');
    console.log('-'.repeat(120));
    
    results.results.forEach((opening, index) => {
      const name = opening.name.substring(0, 40).padEnd(40);
      const games = (opening.games_analyzed || 0).toLocaleString().padStart(12);
      const score = opening.searchScore?.toFixed(4).padStart(6) || 'N/A';
      console.log(`${(index + 1).toString().padStart(2)}   | ${name} | ${games}    | ${score}`);
    });
    
    console.log('-'.repeat(120));
    
    // Check if French Defense is #1
    const topResult = results.results[0];
    const frenchDefense = results.results.find(r => r.name.toLowerCase().includes('french defense'));
    const owensDefense = results.results.find(r => r.name.toLowerCase().includes('owens defense french'));
    
    console.log('\n📊 Analysis:');
    console.log(`Top result: "${topResult?.name}" (${(topResult?.games_analyzed || 0).toLocaleString()} games)`);
    
    if (frenchDefense) {
      const frenchRank = results.results.findIndex(r => r.name.toLowerCase().includes('french defense')) + 1;
      console.log(`French Defense rank: #${frenchRank} (${(frenchDefense.games_analyzed || 0).toLocaleString()} games)`);
    }
    
    if (owensDefense) {
      const owensRank = results.results.findIndex(r => r.name.toLowerCase().includes('owens defense french')) + 1;
      console.log(`Owens Defense French rank: #${owensRank} (${(owensDefense.games_analyzed || 0).toLocaleString()} games)`);
    }
    
    // Success criteria
    const success = topResult?.name.toLowerCase().includes('french defense');
    
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ SUCCESS: French Defense is now ranking #1!');
    } else {
      console.log('❌ ISSUE: French Defense is not ranking #1');
      console.log('   Expected: French Defense should be #1 due to popularity (389M+ games)');
      console.log(`   Actual: "${topResult?.name}" is #1`);
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error testing French search:', error.message);
    console.error(error.stack);
  }
}

// Also test some edge cases
async function testEdgeCases() {
  console.log('\n\n🧪 Testing edge cases...\n');
  
  const testCases = [
    'french defense',
    'French',
    'FRENCH',
    'french defence'
  ];
  
  for (const testCase of testCases) {
    try {
      const results = await searchService.search(testCase, { limit: 3 });
      const topResult = results.results[0];
      
      console.log(`Query: "${testCase}"`);
      console.log(`  Top result: "${topResult?.name}" (${(topResult?.games_analyzed || 0).toLocaleString()} games)`);
      console.log(`  Search type: ${results.searchType}`);
      console.log();
    } catch (error) {
      console.log(`Query: "${testCase}" - ERROR: ${error.message}`);
    }
  }
}

async function runTests() {
  await testFrenchSearch();
  await testEdgeCases();
}

runTests().catch(console.error);
