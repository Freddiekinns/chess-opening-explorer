#!/usr/bin/env python3
"""
Output handler for saving analysis results

Handles exporting statistics to JSON format with validation and backups.
"""

import json
import logging
import shutil
from pathlib import Path
from typing import Dict
from datetime import datetime
from dataclasses import asdict
from .state_manager import PopularityStats
from .stats_calculator import StatsCalculator

logger = logging.getLogger(__name__)


class OutputHandler:
    """Handles output and export of analysis results"""
    
    def __init__(self, output_file: Path, create_backup: bool = True):
        """
        Initialize output handler
        
        Args:
            output_file: Path to output JSON file
            create_backup: Whether to create backup of existing file
        """
        self.output_file = Path(output_file)
        self.create_backup = create_backup
    
    def save_results(self, stats: Dict[str, PopularityStats]) -> bool:
        """
        Save final results to JSON file
        
        Args:
            stats: Dictionary of FEN -> PopularityStats
            
        Returns:
            True if save succeeded, False otherwise
        """
        try:
            logger.info("Saving final results...")
            
            # Create backup if requested and file exists
            if self.create_backup and self.output_file.exists():
                backup_path = self.output_file.with_suffix('.json.backup')
                shutil.copy2(self.output_file, backup_path)
                logger.info(f"Created backup: {backup_path}")
            
            # Set analysis date
            analysis_date = datetime.now().strftime("%Y-%m-%d")
            
            # Prepare final data
            final_data = {
                "positions": {}
            }
            
            for fen, stat in stats.items():
                stat.analysis_date = analysis_date
                
                # Convert to dictionary
                stats_dict = asdict(stat)
                
                # Calculate and add win rates
                white_rate, black_rate, draw_rate = StatsCalculator.calculate_win_rates(stat)
                stats_dict['white_win_rate'] = white_rate
                stats_dict['black_win_rate'] = black_rate
                stats_dict['draw_rate'] = draw_rate
                
                # Remove the raw counts as they're not needed in output
                # (We keep games_analyzed but remove white_wins, black_wins, draws)
                stats_dict.pop('white_wins', None)
                stats_dict.pop('black_wins', None)
                stats_dict.pop('draws', None)
                
                final_data["positions"][fen] = stats_dict
            
            # Validate data before writing
            if not self._validate_output_data(final_data):
                logger.error("Output data validation failed")
                return False
            
            # Ensure directory exists
            self.output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to temporary file first, then rename (atomic operation)
            temp_file = self.output_file.with_suffix('.json.tmp')
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2)
            
            # Atomic rename
            temp_file.replace(self.output_file)
            
            logger.info(f"Results saved to {self.output_file}")
            logger.info(f"Total positions: {len(final_data['positions'])}")
            
            # Print summary
            positions_with_games = sum(1 for s in stats.values() if s.games_analyzed > 0)
            logger.info(f"Positions with games: {positions_with_games}")
            logger.info(f"Positions without games: {len(stats) - positions_with_games}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving results: {e}")
            return False
    
    def _validate_output_data(self, data: dict) -> bool:
        """
        Validate output data structure
        
        Args:
            data: Data dictionary to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Check top-level structure
            if not isinstance(data, dict):
                logger.error("Output data is not a dictionary")
                return False
            
            if "positions" not in data:
                logger.error("Output data missing 'positions' key")
                return False
            
            positions = data["positions"]
            if not isinstance(positions, dict):
                logger.error("'positions' is not a dictionary")
                return False
            
            # Validate a sample of positions
            sample_size = min(10, len(positions))
            sample_keys = list(positions.keys())[:sample_size]
            
            required_fields = [
                'popularity_score',
                'frequency_count',
                'games_analyzed',
                'white_win_rate',
                'black_win_rate',
                'draw_rate',
                'avg_rating',
                'confidence_score',
                'analysis_date'
            ]
            
            for fen in sample_keys:
                pos_data = positions[fen]
                
                if not isinstance(pos_data, dict):
                    logger.error(f"Position data for {fen} is not a dictionary")
                    return False
                
                # Check all required fields are present
                for field in required_fields:
                    if field not in pos_data:
                        logger.error(f"Position {fen} missing required field: {field}")
                        return False
            
            logger.info("Output data validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Error validating output data: {e}")
            return False
    
    def get_file_size(self) -> int:
        """
        Get size of output file in bytes
        
        Returns:
            File size in bytes, or 0 if file doesn't exist
        """
        if self.output_file.exists():
            return self.output_file.stat().st_size
        return 0
