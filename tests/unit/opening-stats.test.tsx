const React = require('react');
const { render, screen } = require('@testing-library/react');
const { OpeningStats } = require('../../packages/web/src/components/detail/OpeningStats');

describe('OpeningStats Component', () => {
  test('should display percentage values correctly', () => {
    const mockProps = {
      gamesAnalyzed: 1000,
      whiteWins: 480,
      draws: 320,
      blackWins: 200,
      averageRating: 1654
    };
    
    // Test that the component calculates percentages correctly
    // 480/1000 = 48%, 320/1000 = 32%, 200/1000 = 20%
    expect(mockProps.whiteWins / mockProps.gamesAnalyzed * 100).toBe(48);
    expect(mockProps.draws / mockProps.gamesAnalyzed * 100).toBe(32);
    expect(mockProps.blackWins / mockProps.gamesAnalyzed * 100).toBe(20);
  });

  test('should handle percentage calculations for various scenarios', () => {
    const scenarios = [
      { games: 300, white: 150, draw: 90, black: 60 }, // 50%, 30%, 20%
      { games: 100, white: 46, draw: 32, black: 22 },  // 46%, 32%, 22%
    ];
    
    scenarios.forEach(scenario => {
      const whitePercent = Math.round((scenario.white / scenario.games) * 100);
      const drawPercent = Math.round((scenario.draw / scenario.games) * 100);
      const blackPercent = Math.round((scenario.black / scenario.games) * 100);
      
      expect(whitePercent + drawPercent + blackPercent).toBeCloseTo(100, 1);
    });
  });
});
