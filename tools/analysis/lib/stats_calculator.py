#!/usr/bin/env python3
"""
Statistics calculator for chess opening popularity

Calculates popularity scores and confidence metrics from game statistics.
"""

import logging
from typing import Dict
from .state_manager import PopularityStats

logger = logging.getLogger(__name__)


class StatsCalculator:
    """Calculates popularity and confidence scores"""
    
    @staticmethod
    def calculate_popularity_scores(stats: Dict[str, PopularityStats]) -> None:
        """
        Calculate popularity scores using percentile-based algorithm
        
        Args:
            stats: Dictionary of FEN -> PopularityStats to update in-place
        """
        logger.info("Calculating popularity scores...")
        
        # Get all game counts, excluding positions with 0 games
        game_counts = [s.games_analyzed for s in stats.values() if s.games_analyzed > 0]
        
        if not game_counts:
            logger.warning("No games found in any position")
            return
        
        # Sort game counts
        game_counts.sort()
        
        # Calculate percentile thresholds
        n = len(game_counts)
        percentile_thresholds = []
        for i in range(1, 11):  # 10%, 20%, ..., 100%
            index = int((i / 10) * n) - 1
            if index < 0:
                index = 0
            percentile_thresholds.append(game_counts[index])
        
        # Assign popularity scores
        for fen, stat in stats.items():
            if stat.games_analyzed == 0:
                stat.popularity_score = 0
                stat.confidence_score = 0.0
            else:
                # Find which percentile this position falls into
                score = 1
                for threshold in percentile_thresholds:
                    if stat.games_analyzed <= threshold:
                        break
                    score += 1
                
                stat.popularity_score = min(score, 10)
                
                # Calculate confidence score based on sample size
                stat.confidence_score = StatsCalculator.calculate_confidence(stat.games_analyzed)
        
        logger.info(f"Popularity scores calculated for {len(stats)} positions")
    
    @staticmethod
    def calculate_confidence(games_analyzed: int) -> float:
        """
        Calculate confidence score based on sample size
        
        Args:
            games_analyzed: Number of games analyzed
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if games_analyzed >= 1000:
            return 1.0
        elif games_analyzed >= 100:
            return 0.8
        elif games_analyzed >= 10:
            return 0.6
        elif games_analyzed >= 1:
            return 0.4
        else:
            return 0.2
    
    @staticmethod
    def calculate_win_rates(stats: PopularityStats) -> tuple:
        """
        Calculate win rates from game statistics
        
        Args:
            stats: PopularityStats object
            
        Returns:
            Tuple of (white_win_rate, black_win_rate, draw_rate)
        """
        if stats.games_analyzed == 0:
            return (None, None, None)
        
        white_win_rate = stats.white_wins / stats.games_analyzed
        black_win_rate = stats.black_wins / stats.games_analyzed
        draw_rate = stats.draws / stats.games_analyzed
        
        return (white_win_rate, black_win_rate, draw_rate)
