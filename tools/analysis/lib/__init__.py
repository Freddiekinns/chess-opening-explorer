"""
Lichess Analysis Pipeline Library

Modular components for processing Lichess game data and calculating
chess opening popularity statistics.
"""

from .state_manager import StateManager
from .data_fetcher import LichessDataFetcher
from .game_processor import GameProcessor
from .stats_calculator import StatsCalculator
from .output_handler import OutputHandler

__all__ = [
    'StateManager',
    'LichessDataFetcher',
    'GameProcessor',
    'StatsCalculator',
    'OutputHandler'
]

__version__ = '2.0.0'
