const searchService = require('../../packages/api/src/services/search-service');

async function testSearchRanking() {
  console.log('=== Search Ranking Diagnostic Test ===\n');
  
  try {
    await searchService.initialize();
    console.log('✅ Search service initialized successfully\n');
    
    // Test 1: Direct search for "d4" - should prioritize Queen's Pawn Game
    console.log('🔍 TEST 1: Move search for "d4"');
    console.log('Expected: Queen\'s Pawn Game should be #1\n');
    
    const d4Results = await searchService.search('d4', { limit: 10 });
    console.log(`Found ${d4Results.results.length} results for "d4"`);
    console.log(`Search type: ${d4Results.searchType}\n`);
    
    d4Results.results.slice(0, 5).forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Moves: ${opening.moves}`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Search score: ${opening.searchScore || 'N/A'}`);
      console.log('');
    });
    
    // Test 2: Search for "queens gambit" - should prioritize exact name match
    console.log('🔍 TEST 2: Name search for "queens gambit"');
    console.log('Expected: Queen\'s Gambit should be #1\n');
    
    const qgResults = await searchService.search('queens gambit', { limit: 10 });
    console.log(`Found ${qgResults.results.length} results for "queens gambit"`);
    console.log(`Search type: ${qgResults.searchType}\n`);
    
    qgResults.results.slice(0, 5).forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Moves: ${opening.moves}`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Search score: ${opening.searchScore || 'N/A'}`);
      console.log('');
    });
    
    // Test 3: Check if Queen's Pawn Game exists in data
    console.log('🔍 TEST 3: Looking for Queen\'s Pawn Game in database');
    const allOpenings = await searchService.openings;
    
    const queensPawnGames = allOpenings.filter(opening => 
      opening.name.toLowerCase().includes('queen\'s pawn') ||
      opening.name.toLowerCase().includes('queens pawn')
    );
    
    if (queensPawnGames.length > 0) {
      console.log(`Found ${queensPawnGames.length} Queen's Pawn Game entries:`);
      queensPawnGames.forEach(opening => {
        console.log(`- ${opening.name} (${opening.eco})`);
        console.log(`  Moves: ${opening.moves}`);
        console.log(`  Games analyzed: ${opening.games_analyzed || 0}`);
      });
    } else {
      console.log('❌ No Queen\'s Pawn Game found in database');
    }
    console.log('');
    
    // Test 4: Check exact "Queen's Gambit" entries
    console.log('🔍 TEST 4: Looking for Queen\'s Gambit variations');
    
    const queensGambits = allOpenings.filter(opening => 
      opening.name.toLowerCase().includes('queen\'s gambit') ||
      opening.name.toLowerCase().includes('queens gambit')
    );
    
    if (queensGambits.length > 0) {
      console.log(`Found ${queensGambits.length} Queen's Gambit entries:`);
      queensGambits.slice(0, 10).forEach(opening => {
        console.log(`- ${opening.name} (${opening.eco})`);
        console.log(`  Games analyzed: ${opening.games_analyzed || 0}`);
      });
    } else {
      console.log('❌ No Queen\'s Gambit found in database');
    }
    console.log('');
    
    // Test 5: Check d4 openings specifically
    console.log('🔍 TEST 5: Looking for openings starting with 1.d4');
    
    const d4Openings = allOpenings.filter(opening => {
      const moves = opening.moves?.toLowerCase() || '';
      return moves.startsWith('1. d4') || moves.startsWith('1.d4');
    });
    
    console.log(`Found ${d4Openings.length} openings starting with 1.d4`);
    
    // Sort by games analyzed to see most popular
    const popularD4 = d4Openings
      .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
      .slice(0, 5);
    
    console.log('Top 5 most popular d4 openings:');
    popularD4.forEach((opening, index) => {
      console.log(`${index + 1}. ${opening.name} (${opening.eco})`);
      console.log(`   Games analyzed: ${opening.games_analyzed || 0}`);
      console.log(`   Moves: ${opening.moves}`);
    });
    console.log('');
    
    // Test 6: Test chess move detection
    console.log('🔍 TEST 6: Testing chess move detection');
    console.log(`Is "d4" detected as chess move: ${searchService.isChessMove('d4')}`);
    console.log(`Is "queens gambit" detected as chess move: ${searchService.isChessMove('queens gambit')}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSearchRanking();
