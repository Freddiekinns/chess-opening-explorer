/**
 * @file PopularOpeningsGrid filtering tests
 * @description Tests for consistent filtering behavior across complexity levels
 */

// Helper function to count the number of moves in a moves string (same as in component)
const countMoves = (moves) => {
  if (!moves || typeof moves !== 'string') return 0;
  
  // Remove move numbers (1., 2., etc.) and split by spaces
  // Example: "1. e4 e5 2. Nf3" -> ["e4", "e5", "Nf3"] = 3 moves
  const cleanMoves = moves.replace(/\d+\./g, '').trim();
  if (!cleanMoves) return 0;
  
  const moveList = cleanMoves.split(/\s+/).filter(move => move.length > 0);
  return moveList.length;
};

// Filter function that mimics the component logic
const filterOpeningsForDisplay = (openings, selectedCategory = 'all') => {
  let filtered = openings;
  
  // Apply ECO category filter
  if (selectedCategory !== 'all') {
    filtered = openings.filter(opening => 
      opening.eco && opening.eco.startsWith(selectedCategory)
    );
  }
  
  // Remove invalid FEN and openings with only 1 move
  filtered = filtered.filter(opening => {
    if (!opening.fen || opening.fen.trim().length === 0) return false;
    if (countMoves(opening.moves) <= 1) return false;
    return true;
  });
  
  // Deduplicate openings by FEN
  const uniqueOpenings = filtered.reduce((acc, opening) => {
    const key = opening.fen
    if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
      acc[key] = opening
    }
    return acc
  }, {})
  
  const deduplicated = Object.values(uniqueOpenings);
  
  // Sort by games played (descending order - most popular first)
  deduplicated.sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0));
  
  // Limit to top 6 for consistent display
  return deduplicated.slice(0, 6);
};

const mockOpenings = [
  {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    name: "King's Pawn",
    eco: "B00",
    moves: "1. e4", // Single move - should be filtered out
    src: "eco_tsv",
    games_analyzed: 1000
  },
  {
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    name: "French Defense",
    eco: "C02",
    moves: "1. e4 e6", // Two moves - should be included
    src: "eco_tsv",
    games_analyzed: 800
  },
  {
    fen: "rnbqkbnr/ppp1pppp/3p4/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2",
    name: "Queen's Pawn Game",
    eco: "D00",
    moves: "1. d4", // Single move - should be filtered out
    src: "eco_tsv",
    games_analyzed: 900
  },
  {
    fen: "rnbqkbnr/ppp1pppp/3p4/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
    name: "Queen's Gambit",
    eco: "D06",
    moves: "1. d4 d6 2. c4", // Three moves - should be included
    src: "eco_tsv",
    games_analyzed: 1200
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
    name: "Réti Opening",
    eco: "A05",
    moves: "1. Nf3", // Single move - should be filtered out
    src: "eco_tsv",
    games_analyzed: 600
  },
  {
    fen: "rnbqkbnr/pppp1ppp/4p3/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2",
    name: "Réti Opening: French Defense",
    eco: "A05",
    moves: "1. Nf3 e6", // Two moves - should be included
    src: "eco_tsv",
    games_analyzed: 500
  }
];

describe('PopularOpeningsGrid filtering consistency', () => {
  test('should filter out single-move openings consistently', () => {
    const filtered = filterOpeningsForDisplay(mockOpenings);
    
    // Should only include multi-move openings
    expect(filtered.length).toBe(3); // French Defense, Queen's Gambit, Réti Opening: French Defense
    
    // Check that single-move openings are filtered out
    const filteredNames = filtered.map(opening => opening.name);
    expect(filteredNames).not.toContain("King's Pawn");
    expect(filteredNames).not.toContain("Queen's Pawn Game");
    expect(filteredNames).not.toContain("Réti Opening");
    
    // Check that multi-move openings are included
    expect(filteredNames).toContain("French Defense");
    expect(filteredNames).toContain("Queen's Gambit");
    expect(filteredNames).toContain("Réti Opening: French Defense");
  });

  test('should maintain consistent results when filtering by ECO category', () => {
    // Filter for ECO A category
    const filteredA = filterOpeningsForDisplay(mockOpenings, 'A');
    
    // Should only include ECO A openings with multiple moves
    expect(filteredA.length).toBe(1); // Only "Réti Opening: French Defense"
    expect(filteredA[0].name).toBe("Réti Opening: French Defense");
    expect(filteredA[0].eco).toBe("A05");
    
    // Should not include single-move A openings
    expect(filteredA.find(opening => opening.name === "Réti Opening")).toBeUndefined();
  });

  test('should handle edge cases correctly', () => {
    const edgeCases = [
      {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        name: "Starting Position",
        eco: "A00",
        moves: "", // Empty moves - should be filtered out
        src: "eco_tsv",
        games_analyzed: 100
      },
      {
        fen: "", // Empty FEN - should be filtered out
        name: "Invalid Opening",
        eco: "B00",
        moves: "1. e4 e5",
        src: "eco_tsv",
        games_analyzed: 50
      },
      {
        fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        name: "Valid Opening",
        eco: "C02",
        moves: "1. e4 e6", // Valid two moves
        src: "eco_tsv",
        games_analyzed: 200
      }
    ];

    const filtered = filterOpeningsForDisplay(edgeCases);
    
    // Should only include the valid opening
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("Valid Opening");
  });
});
