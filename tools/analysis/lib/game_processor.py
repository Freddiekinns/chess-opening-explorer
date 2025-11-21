#!/usr/bin/env python3
"""
Game processor for analyzing chess games

Processes PGN games from compressed Lichess database files and
extracts position statistics.
"""

import logging
import io
import os
import chess
import chess.pgn
import zstandard as zstd
from pathlib import Path
from tqdm import tqdm
import sys
from typing import Set, Callable

logger = logging.getLogger(__name__)


class GameProcessor:
    """Processes chess games from PGN files"""
    
    def __init__(
        self,
        target_fens: Set[str],
        stats_update_callback: Callable[[str, float, str], None],
        max_moves: int = 35,
        min_rating: int = 0
    ):
        """
        Initialize game processor
        
        Args:
            target_fens: Set of FEN positions to track
            stats_update_callback: Callback function for updating stats
            max_moves: Maximum number of moves to analyze per game
            min_rating: Minimum rating to include games
        """
        self.target_fens = target_fens
        self.stats_update_callback = stats_update_callback
        self.max_moves = max_moves
        self.min_rating = min_rating
    
    def process_file(self, filepath: Path, month: str) -> bool:
        """
        Process a PGN file (zstd compressed)
        
        Args:
            filepath: Path to compressed PGN file
            month: Month identifier for progress tracking
            
        Returns:
            True if processing succeeded, False otherwise
        """
        try:
            logger.info(f"Processing {filepath.name}")
            
            # Get file size for progress tracking
            file_size = os.path.getsize(filepath)
            logger.info(f"File size: {file_size / (1024*1024):.1f} MB")
            
            # Process the compressed file using stream reader
            with open(filepath, 'rb') as f:
                decompressor = zstd.ZstdDecompressor()
                
                with decompressor.stream_reader(f) as reader:
                    # Create progress bar
                    progress_bar = tqdm(
                        desc=f"Processing {month}",
                        total=file_size,
                        unit='B',
                        unit_scale=True,
                        unit_divisor=1024,
                        ncols=80,
                        mininterval=1.0,
                        leave=True,
                        file=sys.stdout
                    )
                    
                    logger.info(f"Started processing {month}")
                    
                    game_buffer = ""
                    games_processed = 0
                    bytes_read = 0
                    
                    try:
                        while True:
                            # Read decompressed data in chunks
                            chunk = reader.read(8192)
                            if not chunk:
                                break
                            
                            # Update progress bar
                            bytes_read += len(chunk)
                            progress_bar.update(len(chunk))
                            
                            try:
                                decoded_chunk = chunk.decode('utf-8')
                                game_buffer += decoded_chunk
                                
                                # Process complete games
                                while '\n\n\n' in game_buffer:
                                    game_text, game_buffer = game_buffer.split('\n\n\n', 1)
                                    if game_text.strip():
                                        self.process_game(game_text)
                                        games_processed += 1
                                        
                                        # Update progress bar description periodically
                                        if games_processed % 50000 == 0:
                                            progress_bar.set_postfix(games=f"{games_processed:,}")
                            
                            except Exception as e:
                                # Log warnings occasionally to avoid spam
                                if games_processed % 100000 == 0:
                                    logger.warning(f"Error processing chunk: {e}")
                                continue
                        
                        # Process any remaining game
                        if game_buffer.strip():
                            self.process_game(game_buffer)
                            games_processed += 1
                        
                        # Final update
                        progress_bar.set_postfix(games=f"{games_processed:,}")
                        progress_bar.close()
                        
                        logger.info(f"Completed processing {month}: {games_processed:,} games")
                        return True
                        
                    except Exception as e:
                        progress_bar.close()
                        raise e
                
        except Exception as e:
            logger.error(f"Error processing file {filepath}: {e}")
            return False
    
    def process_game(self, game_text: str) -> None:
        """
        Process a single PGN game
        
        Args:
            game_text: PGN text of the game
        """
        try:
            # Parse PGN
            game = chess.pgn.read_game(io.StringIO(game_text))
            if not game:
                return
            
            # Extract game metadata
            headers = game.headers
            white_elo = self._safe_int(headers.get('WhiteElo', '0'))
            black_elo = self._safe_int(headers.get('BlackElo', '0'))
            result = headers.get('Result', '*')
            
            # Skip games without ratings or below minimum
            if white_elo < self.min_rating or black_elo < self.min_rating:
                return
            
            # Calculate average rating
            avg_rating = (white_elo + black_elo) / 2
            
            # Collect position updates to batch them
            position_updates = []
            
            # Iterate through game positions (limit to first N moves)
            board = game.board()
            move_count = 0
            max_plies = self.max_moves * 2  # 2 plies per move
            
            for move in game.mainline_moves():
                # Check if we've reached the move limit
                if move_count >= max_plies:
                    break
                
                current_fen = board.fen()
                
                # Check if this position is in our target set
                if current_fen in self.target_fens:
                    position_updates.append((current_fen, avg_rating, result))
                
                # Make the move
                board.push(move)
                move_count += 1
            
            # Apply all updates via callback
            for fen, rating, game_result in position_updates:
                self.stats_update_callback(fen, rating, game_result)
                
        except Exception:
            # Skip malformed games silently
            pass
    
    def _safe_int(self, value: str) -> int:
        """
        Safely convert string to int
        
        Args:
            value: String value to convert
            
        Returns:
            Integer value, or 0 if conversion fails
        """
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0
