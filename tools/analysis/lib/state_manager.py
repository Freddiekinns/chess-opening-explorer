#!/usr/bin/env python3
"""
State management for the Lichess analysis pipeline

Handles checkpoint creation, loading, and progress tracking for
resumable pipeline execution.
"""

import json
import logging
import threading
from pathlib import Path
from typing import Set, Dict, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class PopularityStats:
    """Statistics for a chess opening position"""
    popularity_score: int = 0
    frequency_count: int = 0
    white_wins: int = 0
    black_wins: int = 0
    draws: int = 0
    games_analyzed: int = 0
    avg_rating: Optional[float] = None
    confidence_score: float = 0.0
    analysis_date: str = ""


class StateManager:
    """Manages pipeline state and checkpoints"""
    
    def __init__(self, checkpoint_file: Path):
        """
        Initialize state manager
        
        Args:
            checkpoint_file: Path to checkpoint file
        """
        self.checkpoint_file = checkpoint_file
        self.stats: Dict[str, PopularityStats] = {}
        self.processed_months: Set[str] = set()
        self.target_fens: Set[str] = set()
        self.stats_lock = threading.Lock()
        
    def initialize_from_fens(self, target_fens: Set[str]):
        """
        Initialize statistics for target FEN positions
        
        Args:
            target_fens: Set of FEN positions to track
        """
        self.target_fens = target_fens
        
        with self.stats_lock:
            for fen in target_fens:
                if fen not in self.stats:
                    self.stats[fen] = PopularityStats()
        
        logger.info(f"Initialized {len(self.stats)} positions for tracking")
    
    def load_checkpoint(self) -> bool:
        """
        Load checkpoint data if it exists
        
        Returns:
            True if checkpoint was loaded, False otherwise
        """
        if not self.checkpoint_file.exists():
            logger.info("No checkpoint file found, starting fresh")
            return False
        
        try:
            with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
            
            # Load processed months
            self.processed_months = set(checkpoint_data.get('processed_months', []))
            
            # Load statistics
            stats_data = checkpoint_data.get('stats', {})
            with self.stats_lock:
                for fen, stats_dict in stats_data.items():
                    self.stats[fen] = PopularityStats(**stats_dict)
            
            logger.info(f"Loaded checkpoint: {len(self.processed_months)} months processed, "
                       f"{len(self.stats)} positions tracked")
            return True
            
        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            return False
    
    def save_checkpoint(self):
        """Save current progress to checkpoint file (thread-safe)"""
        try:
            with self.stats_lock:
                checkpoint_data = {
                    'processed_months': sorted(list(self.processed_months)),
                    'last_updated': datetime.now().isoformat(),
                    'total_positions': len(self.stats),
                    'stats': {}
                }
                
                # Save statistics
                for fen, stats in self.stats.items():
                    checkpoint_data['stats'][fen] = asdict(stats)
            
            # Write to temporary file first, then rename (atomic operation)
            temp_file = self.checkpoint_file.with_suffix('.tmp')
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(checkpoint_data, f, indent=2)
            
            # Atomic rename
            temp_file.replace(self.checkpoint_file)
            
            logger.info(f"Checkpoint saved: {len(self.processed_months)} months processed")
            
        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
    
    def mark_month_processed(self, month: str):
        """
        Mark a month as processed
        
        Args:
            month: Month string (e.g., "2021-07")
        """
        with self.stats_lock:
            self.processed_months.add(month)
    
    def is_month_processed(self, month: str) -> bool:
        """
        Check if a month has been processed
        
        Args:
            month: Month string to check
            
        Returns:
            True if month was processed, False otherwise
        """
        return month in self.processed_months
    
    def get_stats(self, fen: str) -> Optional[PopularityStats]:
        """
        Get statistics for a FEN position (thread-safe)
        
        Args:
            fen: FEN string
            
        Returns:
            PopularityStats object or None if not found
        """
        with self.stats_lock:
            return self.stats.get(fen)
    
    def update_stats(self, fen: str, avg_rating: float, result: str):
        """
        Update statistics for a position (thread-safe)
        
        Args:
            fen: FEN position
            avg_rating: Average rating of the game
            result: Game result ('1-0', '0-1', '1/2-1/2')
        """
        with self.stats_lock:
            if fen not in self.stats:
                return
            
            stats = self.stats[fen]
            
            # Update statistics
            stats.games_analyzed += 1
            stats.frequency_count += 1
            
            # Update rating average (running average)
            if stats.avg_rating is None:
                stats.avg_rating = avg_rating
            else:
                stats.avg_rating = ((stats.avg_rating * (stats.games_analyzed - 1)) + avg_rating) / stats.games_analyzed
            
            # Update win/loss/draw counts
            if result == '1-0':  # White wins
                stats.white_wins += 1
            elif result == '0-1':  # Black wins
                stats.black_wins += 1
            elif result == '1/2-1/2':  # Draw
                stats.draws += 1
    
    def get_all_stats(self) -> Dict[str, PopularityStats]:
        """
        Get all statistics (thread-safe copy)
        
        Returns:
            Dictionary of FEN -> PopularityStats
        """
        with self.stats_lock:
            return dict(self.stats)
    
    def get_summary(self) -> dict:
        """
        Get summary statistics
        
        Returns:
            Dictionary with summary information
        """
        with self.stats_lock:
            positions_with_games = sum(1 for stats in self.stats.values() if stats.games_analyzed > 0)
            total_games = sum(stats.games_analyzed for stats in self.stats.values())
            
            return {
                'total_positions': len(self.stats),
                'positions_with_games': positions_with_games,
                'positions_without_games': len(self.stats) - positions_with_games,
                'total_games_analyzed': total_games,
                'months_processed': len(self.processed_months)
            }
