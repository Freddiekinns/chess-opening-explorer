/**
 * @file Move counting utility tests
 * @description Tests for filtering openings by number of moves
 */

// Helper function to count the number of moves in a moves string
const countMoves = (moves) => {
  if (!moves || typeof moves !== 'string') return 0;
  
  // Remove move numbers (1., 2., etc.) and split by spaces
  // Example: "1. e4 e5 2. Nf3" -> ["e4", "e5", "Nf3"] = 3 moves
  const cleanMoves = moves.replace(/\d+\./g, '').trim();
  if (!cleanMoves) return 0;
  
  const moveList = cleanMoves.split(/\s+/).filter(move => move.length > 0);
  return moveList.length;
};

describe('Move counting logic', () => {
  test('should count moves correctly for various opening sequences', () => {
    // Single move scenarios (should be filtered out)
    expect(countMoves('1. e4')).toBe(1);
    expect(countMoves('1. d4')).toBe(1);
    expect(countMoves('1. Nf3')).toBe(1);
    
    // Two move scenarios (should be included)
    expect(countMoves('1. e4 e5')).toBe(2);
    expect(countMoves('1. e4 f6')).toBe(2); // Barnes Defense example
    expect(countMoves('1. d4 d5')).toBe(2);
    
    // Multi-move scenarios (should be included)
    expect(countMoves('1. e4 e5 2. Nf3')).toBe(3);
    expect(countMoves('1. e4 e5 2. Nf3 Nc6')).toBe(4);
    expect(countMoves('1. e4 e5 2. Nf3 Nc6 3. Bb5')).toBe(5);
    
    // Edge cases
    expect(countMoves('')).toBe(0);
    expect(countMoves(null)).toBe(0);
    expect(countMoves(undefined)).toBe(0);
    expect(countMoves('   ')).toBe(0);
    expect(countMoves('1.')).toBe(0); // Just move number, no actual move
  });

  test('should handle complex notation correctly', () => {
    // With check notation
    expect(countMoves('1. e4 e5 2. Qh5+')).toBe(3);
    
    // With capture notation
    expect(countMoves('1. e4 e5 2. exd5')).toBe(3);
    
    // With castling
    expect(countMoves('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O')).toBe(7);
    
    // With long algebraic notation
    expect(countMoves('1. e2-e4 e7-e5')).toBe(2);
  });

  test('should identify openings that should be filtered', () => {
    const singleMoveOpenings = [
      { moves: '1. e4', name: 'King\'s Pawn' },
      { moves: '1. d4', name: 'Queen\'s Pawn' },
      { moves: '1. Nf3', name: 'Réti Opening' }
    ];

    const validOpenings = [
      { moves: '1. e4 e5', name: 'King\'s Pawn Game' },
      { moves: '1. e4 f6', name: 'Barnes Defense' },
      { moves: '1. e4 e5 2. Nf3', name: 'King\'s Knight Opening' }
    ];

    // Single move openings should be filtered out
    singleMoveOpenings.forEach(opening => {
      expect(countMoves(opening.moves)).toBeLessThanOrEqual(1);
    });

    // Multi-move openings should be included
    validOpenings.forEach(opening => {
      expect(countMoves(opening.moves)).toBeGreaterThan(1);
    });
  });
});
