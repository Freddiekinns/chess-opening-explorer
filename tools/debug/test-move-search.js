/**
 * Test the improved move search functionality
 */

// Mock some test data
const testOpenings = [
  {
    name: "Queen's Pawn Game",
    eco: "D00",
    moves: "1. d4",
    analysis_json: { popularity_score: 95 },
    games_analyzed: 10000
  },
  {
    name: "English Opening",
    eco: "A10", 
    moves: "1. c4",
    analysis_json: { popularity_score: 85 },
    games_analyzed: 8000
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: "1. d4 Nf6 2. c4 g6",
    analysis_json: { popularity_score: 80 },
    games_analyzed: 7000
  },
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: "1. d4 d5 2. c4",
    analysis_json: { popularity_score: 90 },
    games_analyzed: 9000
  }
];

// Test the move search logic
console.log('Testing d4 search:');

// Simulate the new move search logic
const testMoveSearch = (move, openings) => {
  return openings.map(opening => {
    let score = 0;
    const moves = opening.moves?.toLowerCase() || '';
    
    // Exact opening move (highest priority)
    if (moves.startsWith(`1. ${move}`) || moves.startsWith(`1.${move}`)) {
      score = 1000;
    }
    // Second move for white
    else if (moves.includes(`2. ${move}`) || moves.includes(`2.${move}`)) {
      score = 800;
    }
    // Black's first response
    else if (moves.includes(`1... ${move}`) || moves.includes(`1...${move}`)) {
      score = 900;
    }
    // Black's second move
    else if (moves.includes(`2... ${move}`) || moves.includes(`2...${move}`)) {
      score = 700;
    }
    // Move appears anywhere in sequence
    else if (moves.includes(` ${move} `) || moves.includes(` ${move}.`) || moves.includes(`${move} `)) {
      score = 500;
    }
    // Partial match
    else if (moves.includes(move)) {
      score = 300;
    }
    
    // Small popularity boost
    if (score > 0) {
      const popularity = opening.games_analyzed || opening.analysis_json?.popularity_score || 0;
      score += Math.min(50, popularity / 1000);
    }
    
    return {
      ...opening,
      searchScore: score / 1000
    };
  })
  .filter(opening => opening.searchScore > 0)
  .sort((a, b) => b.searchScore - a.searchScore);
};

const d4Results = testMoveSearch('d4', testOpenings);

console.log('Results for "d4" search:');
d4Results.forEach((opening, index) => {
  console.log(`${index + 1}. ${opening.name} (${opening.eco}) - Score: ${opening.searchScore.toFixed(3)}`);
  console.log(`   Moves: ${opening.moves}`);
});

console.log('\n' + '='.repeat(50));
console.log('Expected: Queen\'s Pawn Game should be #1 (starts with 1. d4)');
console.log('Expected: Queen\'s Gambit should be #2 (contains 1. d4 d5)'); 
console.log('Expected: King\'s Indian should be #3 (contains 1. d4 Nf6)');
console.log('Expected: English Opening should NOT appear (doesn\'t contain d4)');
