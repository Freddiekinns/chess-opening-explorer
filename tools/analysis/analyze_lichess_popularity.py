#!/usr/bin/env python3
"""
Lichess Popularity Analysis Script for Chess Trainer
Feature 1.6: Game Data Popularity Analysis with Parallel Downloading

This script analyzes Lichess game data to generate popularity statistics 
for chess openings. It's designed to run in Google Colab with checkpoint/resume capability.

Requirements:
- python-chess>=1.999
- requests>=2.28.0
- zstandard>=0.18.0
- tqdm>=4.62.0

Usage:
1. Upload this script to Google Colab
2. Run the setup cell to install dependencies
3. Execute the main analysis function

Author: Chess Trainer Team
Date: July 14, 2025
"""

import os
import json
import zstandard as zstd
import io
import requests
import chess
import chess.pgn
from datetime import datetime, timedelta
import time
from typing import Dict, List, Set, Optional, Tuple
import logging
from dataclasses import dataclass, asdict
from tqdm import tqdm
import threading
import queue
import sys
import tempfile
import platform
from pathlib import Path
import shutil

class TqdmLoggingHandler(logging.Handler):
    """Custom logging handler that works with tqdm progress bars"""
    
    def __init__(self, level=logging.NOTSET):
        super().__init__(level)
        
    def emit(self, record):
        try:
            msg = self.format(record)
            # Use tqdm.write() to print without interfering with progress bars
            tqdm.write(msg)
        except Exception:
            self.handleError(record)

# Configure logging with tqdm-compatible handler
def setup_logging():
    """Setup logging that works with tqdm progress bars"""
    # Remove any existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    # Create tqdm-compatible handler
    handler = TqdmLoggingHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    
    # Configure root logger
    logging.root.setLevel(logging.INFO)
    logging.root.addHandler(handler)
    
    return logging.getLogger(__name__)

# Setup logging
logger = setup_logging()

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

class LichessAnalyzer:
    """Main analyzer class for processing Lichess data"""
    
    def __init__(self, 
                 start_date: str = "2021-07", 
                 checkpoint_file: str = "stats_checkpoint.json",
                 output_file: str = "popularity_stats.json",
                 work_dir: Optional[str] = None):
        self.start_date = start_date
        
        # Use OS-agnostic paths
        self.work_dir = Path(work_dir) if work_dir else Path.cwd()
        self.checkpoint_file = self.work_dir / checkpoint_file
        self.output_file = self.work_dir / output_file
        
        # Get OS-specific configuration
        self.os_config = get_os_specific_config()
        
        self.target_fens: Set[str] = set()
        self.stats: Dict[str, PopularityStats] = {}
        self.processed_months: Set[str] = set()
        
        # Lichess database URL pattern
        self.lichess_base_url = "https://database.lichess.org/standard/lichess_db_standard_rated_{}.pgn.zst"
        
        # Threading infrastructure for parallel processing
        self.download_queue = queue.Queue(maxsize=3)  # Limit to 3 files max
        self.download_complete = threading.Event()
        self.shutdown_requested = threading.Event()
        self.stats_lock = threading.Lock()  # Protect stats dictionary
        
        # Initialize thread-safe progress monitoring
        self.initialize_progress_monitoring()
        
    def initialize_progress_monitoring(self):
        """Initialize thread-safe progress monitoring"""
        # Set tqdm to use thread-safe mode
        import tqdm
        tqdm.tqdm.set_lock(threading.RLock())
        logger.info("Progress monitoring initialized for multi-threading")

    def load_target_fens(self, eco_files: List[str]) -> None:
        """Load target FEN positions from ECO JSON files"""
        logger.info("Loading target FEN positions from ECO files...")
        
        for eco_file in eco_files:
            try:
                if os.path.exists(eco_file):
                    with open(eco_file, 'r', encoding='utf-8') as f:
                        eco_data = json.load(f)
                        # ECO files are structured as objects with FEN keys
                        for fen in eco_data.keys():
                            fen = fen.strip()
                            if fen:
                                self.target_fens.add(fen)
                                # Initialize stats for this FEN
                                if fen not in self.stats:
                                    self.stats[fen] = PopularityStats()
                else:
                    logger.warning(f"ECO file not found: {eco_file}")
            except Exception as e:
                logger.error(f"Error loading ECO file {eco_file}: {e}")
        
        logger.info(f"Loaded {len(self.target_fens)} target FEN positions")
    
    def load_checkpoint(self) -> None:
        """Load checkpoint data if it exists"""
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                    checkpoint_data = json.load(f)
                    
                self.processed_months = set(checkpoint_data.get('processed_months', []))
                
                # Restore stats from checkpoint
                for fen, stats_data in checkpoint_data.get('stats', {}).items():
                    self.stats[fen] = PopularityStats(**stats_data)
                
                logger.info(f"Loaded checkpoint with {len(self.processed_months)} processed months")
            except Exception as e:
                logger.error(f"Error loading checkpoint: {e}")
    
    def save_checkpoint(self) -> None:
        """Save current progress to checkpoint file (thread-safe)"""
        try:
            with self.stats_lock:
                checkpoint_data = {
                    'processed_months': list(self.processed_months),
                    'stats': {fen: asdict(stats) for fen, stats in self.stats.items()},
                    'last_updated': datetime.now().isoformat()
                }
                
                # Ensure directory exists
                self.checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
                
                with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
                    json.dump(checkpoint_data, f, indent=2)
                
                logger.info(f"Checkpoint saved with {len(self.processed_months)} processed months")
        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
    
    def generate_month_list(self) -> List[str]:
        """Generate list of months from start_date to present"""
        months = []
        
        # Parse start date
        start_year, start_month = map(int, self.start_date.split('-'))
        current_date = datetime.now()
        
        # Generate months
        year, month = start_year, start_month
        while year < current_date.year or (year == current_date.year and month <= current_date.month):
            months.append(f"{year}-{month:02d}")
            
            month += 1
            if month > 12:
                month = 1
                year += 1
        
        return months
    
    def download_and_process_month(self, month: str) -> bool:
        """Download and process a single month of Lichess data"""
        if month in self.processed_months:
            logger.info(f"Month {month} already processed, skipping")
            return True
        
        url = self.lichess_base_url.format(month)
        temp_file = f"temp_{month}.pgn.zst"
        
        logger.info(f"Processing month {month} from {url}")
        
        try:
            # Stage 1: Download file to disk with retry logic
            if not self.download_file_with_retry(url, temp_file, max_retries=3):
                logger.error(f"Failed to download {month} after retries")
                return False
            
            # Stage 2: Process the local file
            success = self.process_local_file(temp_file, month)
            
            # Clean up temp file
            try:
                os.remove(temp_file)
            except:
                pass
            
            if success:
                self.processed_months.add(month)
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"Error processing {month}: {e}")
            # Clean up temp file on error
            try:
                os.remove(temp_file)
            except:
                pass
            return False
    
    def download_file_with_retry(self, url: str, filename: str, max_retries: int = 3) -> bool:
        """Download a file with retry logic and progress bar using atomic downloads"""
        final_path = self.work_dir / filename
        temp_path = final_path.with_suffix(final_path.suffix + '.tmp')
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Downloading {filename} (attempt {attempt + 1}/{max_retries})")
                
                # Clean up any existing temp file
                safe_file_remove(str(temp_path))
                
                response = requests.get(url, stream=True)
                response.raise_for_status()
                
                # Get file size for progress tracking
                file_size = int(response.headers.get('content-length', 0))
                logger.info(f"File size: {file_size / (1024*1024*1024):.2f} GB")
                
                # Use OS-specific chunk size
                chunk_size = self.os_config['chunk_size']
                
                # Use tqdm progress bar for download
                progress_bar = tqdm(
                    desc=f"Downloading {filename}",
                    total=file_size,
                    unit='B',
                    unit_scale=True,
                    unit_divisor=1024,
                    ncols=80,
                    mininterval=0.5,
                    maxinterval=2.0,
                    leave=True,
                    file=sys.stdout,
                    position=0,
                    dynamic_ncols=True
                )
                
                try:
                    # Download to temporary file first
                    with open(temp_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=chunk_size):
                            if chunk:
                                f.write(chunk)
                                progress_bar.update(len(chunk))
                    
                    progress_bar.close()
                    
                    # Verify the downloaded file before moving
                    if self.validate_downloaded_file(str(temp_path)):
                        # Atomic move from temp to final location
                        if safe_file_move(str(temp_path), str(final_path)):
                            logger.info(f"Successfully downloaded {filename}")
                            return True
                        else:
                            logger.error(f"Failed to move temp file to final location")
                            continue
                    else:
                        logger.warning(f"Downloaded file failed validation, retrying...")
                        safe_file_remove(str(temp_path))
                        continue
                    
                except Exception as e:
                    progress_bar.close()
                    safe_file_remove(str(temp_path))
                    raise e
                
            except Exception as e:
                logger.warning(f"Download attempt {attempt + 1} failed: {e}")
                safe_file_remove(str(temp_path))
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in 30 seconds...")
                    time.sleep(30)
                else:
                    logger.error(f"All download attempts failed for {filename}")
                    return False
        
        return False
    
    def process_local_file(self, filename: str, month: str) -> bool:
        """Process a local zst file with progress bar"""
        try:
            logger.info(f"Processing local file {filename}")
            
            # Get file size for progress tracking
            file_size = os.path.getsize(filename)
            logger.info(f"File size for processing: {file_size / (1024*1024):.1f} MB")
            
            # Process the compressed file using high-level stream reader
            with open(filename, 'rb') as f:
                decompressor = zstd.ZstdDecompressor()
                
                # Use the high-level stream reader with progress bar
                with decompressor.stream_reader(f) as reader:
                    # Create progress bar with thread-safe settings
                    progress_bar = tqdm(
                        desc=f"Processing {month}",
                        total=file_size,
                        unit='B',
                        unit_scale=True,
                        unit_divisor=1024,
                        ncols=80,
                        mininterval=1.0,   # Update at most every 1 second
                        maxinterval=3.0,   # Update at least every 3 seconds
                        leave=True,        # Keep progress bar after completion
                        file=sys.stdout,   # Explicitly use stdout
                        position=0,        # Position for multi-threaded env
                        dynamic_ncols=True # Adjust width dynamically
                    )
                    
                    logger.info(f"Started processing progress bar for {month}")
                    
                    game_buffer = ""
                    games_processed = 0
                    bytes_read = 0
                    
                    try:
                        while True:
                            # Read decompressed data in chunks
                            chunk = reader.read(8192)
                            if not chunk:
                                break
                            
                            # Update progress bar (approximate based on chunk size)
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
                                        
                                        # Update progress bar description with game count (less frequently)
                                        if games_processed % 50000 == 0:  # Every 50k games instead of 10k
                                            progress_bar.set_postfix(games=f"{games_processed:,}")
                            
                            except Exception as e:
                                # Only log warnings occasionally to avoid spam
                                if games_processed % 100000 == 0:  # Only every 100k games
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
            logger.error(f"Error processing local file {filename}: {e}")
            return False
    
    def process_game(self, game_text: str) -> None:
        """Process a single PGN game (first 35 moves only) - thread-safe"""
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
            
            # Skip games without ratings
            if white_elo == 0 or black_elo == 0:
                return
            
            # Calculate average rating
            avg_rating = (white_elo + black_elo) / 2
            
            # Collect position updates to batch them
            position_updates = []
            
            # Iterate through game positions (limit to first 35 moves = 70 plies)
            board = game.board()
            move_count = 0
            max_moves = 35  # Limit to first 35 moves for performance
            
            for move in game.mainline_moves():
                # Check if we've reached the move limit
                if move_count >= max_moves * 2:  # 2 plies per move
                    break
                
                current_fen = board.fen()
                
                # Check if this position is in our target set
                if current_fen in self.target_fens:
                    position_updates.append((current_fen, avg_rating, result))
                
                # Make the move
                board.push(move)
                move_count += 1
            
            # Apply all updates in a single thread-safe operation
            if position_updates:
                with self.stats_lock:
                    for fen, rating, game_result in position_updates:
                        if fen in self.stats:  # Extra safety check
                            stats = self.stats[fen]
                            
                            # Update statistics
                            stats.games_analyzed += 1
                            stats.frequency_count += 1
                            
                            # Update rating average
                            if stats.avg_rating is None:
                                stats.avg_rating = rating
                            else:
                                # Running average
                                stats.avg_rating = ((stats.avg_rating * (stats.games_analyzed - 1)) + rating) / stats.games_analyzed
                            
                            # Update win/loss/draw counts
                            if game_result == '1-0':  # White wins
                                stats.white_wins += 1
                            elif game_result == '0-1':  # Black wins
                                stats.black_wins += 1
                            elif game_result == '1/2-1/2':  # Draw
                                stats.draws += 1
                
        except Exception as e:
            # Skip malformed games
            pass
    
    def _safe_int(self, value: str) -> int:
        """Safely convert string to int"""
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0
    
    def calculate_popularity_scores(self) -> None:
        """Calculate popularity scores using percentile-based algorithm"""
        logger.info("Calculating popularity scores...")
        
        # Get all game counts, excluding positions with 0 games
        game_counts = [stats.games_analyzed for stats in self.stats.values() if stats.games_analyzed > 0]
        
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
        for fen, stats in self.stats.items():
            if stats.games_analyzed == 0:
                stats.popularity_score = 0
                stats.confidence_score = 0.0
            else:
                # Find which percentile this position falls into
                score = 1
                for threshold in percentile_thresholds:
                    if stats.games_analyzed <= threshold:
                        break
                    score += 1
                
                stats.popularity_score = min(score, 10)
                
                # Calculate confidence score based on sample size
                # Using a simple logarithmic confidence measure
                if stats.games_analyzed >= 1000:
                    stats.confidence_score = 1.0
                elif stats.games_analyzed >= 100:
                    stats.confidence_score = 0.8
                elif stats.games_analyzed >= 10:
                    stats.confidence_score = 0.6
                else:
                    stats.confidence_score = 0.4
        
        logger.info(f"Popularity scores calculated for {len(self.stats)} positions")
    
    def save_final_results(self) -> None:
        """Save final results to JSON file"""
        logger.info("Saving final results...")
        
        # Set analysis date
        analysis_date = datetime.now().isoformat()
        
        # Prepare final data
        final_data = {}
        for fen, stats in self.stats.items():
            stats.analysis_date = analysis_date
            
            # Convert counts to rates
            final_stats_dict = asdict(stats)
            if stats.games_analyzed > 0:
                final_stats_dict['white_win_rate'] = stats.white_wins / stats.games_analyzed
                final_stats_dict['black_win_rate'] = stats.black_wins / stats.games_analyzed
                final_stats_dict['draw_rate'] = stats.draws / stats.games_analyzed
            else:
                final_stats_dict['white_win_rate'] = None
                final_stats_dict['black_win_rate'] = None
                final_stats_dict['draw_rate'] = None
                
            final_data[fen] = final_stats_dict
        
        # Ensure directory exists
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save to file
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, indent=2)
        
        logger.info(f"Results saved to {self.output_file}")
        logger.info(f"Total positions analyzed: {len(final_data)}")
        
        # Print statistics summary
        positions_with_games = sum(1 for stats in self.stats.values() if stats.games_analyzed > 0)
        logger.info(f"Positions with games: {positions_with_games}")
        logger.info(f"Positions without games: {len(self.stats) - positions_with_games}")
    
    def run_analysis(self, eco_files: List[str]) -> None:
        """Run the complete analysis pipeline with parallel processing"""
        logger.info("Starting Lichess popularity analysis with parallel processing...")
        
        try:
            # Initialize thread-safe progress monitoring
            self.initialize_progress_monitoring()
            
            # Clean up any existing temp files
            self.cleanup_temp_files()
            
            # Load target FEN positions
            self.load_target_fens(eco_files)
            
            # Load checkpoint if it exists
            self.load_checkpoint()
            
            # Generate month list
            months = self.generate_month_list()
            
            # Filter out already processed months
            remaining_months = [month for month in months if month not in self.processed_months]
            
            if not remaining_months:
                logger.info("All months already processed!")
            else:
                logger.info(f"Will process {len(remaining_months)} months: {remaining_months[0]} to {remaining_months[-1]}")
                
                # Check for existing temp files and validate them
                existing_files = []
                valid_existing_files = []
                invalid_existing_files = []
                
                for month in remaining_months:
                    temp_filename = f"temp_{month}.pgn.zst"
                    temp_file_path = self.work_dir / temp_filename
                    if temp_file_path.exists():
                        existing_files.append(month)
                        if self.validate_downloaded_file(str(temp_file_path)):
                            valid_existing_files.append(month)
                        else:
                            invalid_existing_files.append(month)
                
                if existing_files:
                    logger.info(f"Found {len(existing_files)} existing temp files")
                    if valid_existing_files:
                        logger.info(f"  - {len(valid_existing_files)} valid files will be reused: {valid_existing_files}")
                    if invalid_existing_files:
                        logger.info(f"  - {len(invalid_existing_files)} invalid files will be re-downloaded: {invalid_existing_files}")
                else:
                    logger.info("No existing temp files found, will download all files")
                
                # Start parallel processing with true producer-consumer pattern
                logger.info("Starting parallel download and processing...")
                
                # Start download worker thread
                download_thread = threading.Thread(
                    target=self.download_worker, 
                    args=(remaining_months,),
                    name="DownloadWorker"
                )
                download_thread.daemon = True
                download_thread.start()
                
                # Start process worker thread
                process_thread = threading.Thread(
                    target=self.process_worker,
                    name="ProcessWorker"
                )
                process_thread.daemon = True
                process_thread.start()
                
                # Wait for both threads to complete
                try:
                    download_thread.join()
                    process_thread.join()
                except KeyboardInterrupt:
                    logger.info("Interrupted by user, shutting down gracefully...")
                    self.shutdown_requested.set()
                    # Give threads time to see the shutdown signal
                    download_thread.join(timeout=5)
                    process_thread.join(timeout=5)
                except Exception as e:
                    logger.error(f"Error during parallel processing: {e}")
                    self.shutdown_requested.set()
            
            # Calculate final popularity scores
            logger.info("Calculating final popularity scores...")
            self.calculate_popularity_scores()
            
            # Save final results
            self.save_final_results()
            
            logger.info("Analysis complete!")
            
        except Exception as e:
            logger.error(f"Critical error in analysis: {e}")
            self.shutdown_requested.set()
        finally:
            # Final cleanup
            self.cleanup_temp_files()
    
    def download_worker(self, months: List[str]) -> None:
        """Download worker thread - downloads files and adds them to processing queue"""
        try:
            logger.info(f"Download worker: Starting to process {len(months)} months")
            
            for month in months:
                # Check if we should stop
                if self.shutdown_requested.is_set():
                    logger.info("Download worker: Shutdown requested")
                    break
                
                # Skip already processed months (checkpoint protection)
                if month in self.processed_months:
                    logger.info(f"Download worker: Month {month} already processed, skipping")
                    continue
                
                url = self.lichess_base_url.format(month)
                temp_filename = f"temp_{month}.pgn.zst"
                temp_file_path = self.work_dir / temp_filename
                
                # Check if file already exists (file system check)
                if temp_file_path.exists():
                    logger.info(f"Download worker: Found existing file {temp_file_path}")
                    
                    # Validate the existing file thoroughly
                    if self.validate_downloaded_file(str(temp_file_path)):
                        file_size = temp_file_path.stat().st_size
                        logger.info(f"Download worker: Using validated existing file {temp_file_path} ({file_size / (1024*1024*1024):.2f} GB)")
                        
                        # Add to processing queue directly (no download needed)
                        logger.info(f"Download worker: Adding existing {month} to processing queue")
                        self.download_queue.put((month, str(temp_file_path)))
                        continue  # Skip download and move to next month (no pause needed)
                    else:
                        logger.warning(f"Download worker: Existing file {temp_file_path} failed validation, will re-download")
                        # Remove the invalid file
                        if safe_file_remove(str(temp_file_path)):
                            logger.info(f"Download worker: Removed invalid file {temp_file_path}")
                        else:
                            logger.warning(f"Download worker: Failed to remove invalid file {temp_file_path}")
                
                # File doesn't exist or is invalid, need to download
                logger.info(f"Download worker: Starting download for {month} from {url}")
                
                # Download the file with retry logic
                if self.download_file_with_retry(url, temp_filename, max_retries=3):
                    # Validate the downloaded file before adding to queue
                    if self.validate_downloaded_file(str(temp_file_path)):
                        # Add to processing queue (will block if queue is full)
                        logger.info(f"Download worker: Adding downloaded {month} to processing queue")
                        self.download_queue.put((month, str(temp_file_path)))
                    else:
                        logger.error(f"Download worker: Downloaded file {temp_file_path} failed validation")
                        # Remove the invalid downloaded file
                        safe_file_remove(str(temp_file_path))
                        self.shutdown_requested.set()
                        break
                else:
                    logger.error(f"Download worker: Failed to download {month}, stopping")
                    self.shutdown_requested.set()
                    break
                
                # Brief pause to avoid overwhelming the server (only after actual downloads)
                time.sleep(1)
                
        except Exception as e:
            logger.error(f"Download worker error: {e}")
            self.shutdown_requested.set()
        finally:
            # Signal that downloads are complete
            self.download_complete.set()
            logger.info("Download worker: Finished")

    def process_worker(self) -> None:
        """Process worker thread - processes files from the download queue"""
        try:
            while True:
                try:
                    # Get file from queue (with timeout to check for completion)
                    month, temp_file = self.download_queue.get(timeout=30)
                    
                    logger.info(f"Process worker: Processing {month}")
                    
                    # Process the file
                    success = self.process_local_file(temp_file, month)
                    
                    if success:
                        # Thread-safe update of processed months
                        with self.stats_lock:
                            self.processed_months.add(month)
                        
                        # Save checkpoint after successful processing
                        self.save_checkpoint()
                        logger.info(f"Process worker: Successfully processed {month}")
                    else:
                        logger.error(f"Process worker: Failed to process {month}")
                    
                    # Clean up temp file immediately
                    if safe_file_remove(temp_file):
                        # Only log cleanup success occasionally to reduce noise
                        if success:
                            logger.info(f"Process worker: Completed {month} and cleaned up temp file")
                    else:
                        logger.warning(f"Process worker: Failed to delete {temp_file}")
                    
                    # Mark task as done
                    self.download_queue.task_done()
                    
                except queue.Empty:
                    # Check if downloads are complete
                    if self.download_complete.is_set():
                        logger.info("Process worker: No more files to process")
                        break
                    # Otherwise continue waiting
                    
        except Exception as e:
            logger.error(f"Process worker error: {e}")
            self.shutdown_requested.set()
        finally:
            logger.info("Process worker: Finished")

    def cleanup_temp_files(self) -> None:
        """Clean up any remaining temp files"""
        try:
            # Use pathlib for better cross-platform compatibility
            for temp_file in self.work_dir.glob('temp_*.pgn.zst*'):  # Include .tmp files
                if safe_file_remove(str(temp_file)):
                    logger.info(f"Cleaned up temp file: {temp_file.name}")
                else:
                    logger.warning(f"Failed to clean up {temp_file.name}")
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}")
    
    def create_progress_bar(self, desc: str, total: int, unit: str = 'B') -> tqdm:
        """Create a standardized progress bar"""
        return tqdm(
            desc=desc,
            total=total,
            unit=unit,
            unit_scale=True,
            unit_divisor=1024,
            ncols=80,
            mininterval=0.5,
            maxinterval=2.0,
            leave=True,
            file=sys.stdout,
            disable=False  # Ensure progress bars are always shown
        )
    
    def validate_downloaded_file(self, filename: str) -> bool:
        """Validate that a downloaded file is complete and not corrupted"""
        try:
            filepath = Path(filename)
            
            if not filepath.exists():
                logger.warning(f"File {filename} does not exist")
                return False
            
            # Check if file size is reasonable (at least 100MB for Lichess files)
            file_size = filepath.stat().st_size
            if file_size < 100 * 1024 * 1024:  # 100MB minimum
                logger.warning(f"File {filename} seems too small ({file_size / (1024*1024):.1f} MB), may be incomplete")
                return False
            
            # Check if file is very large (sanity check - Lichess files can be up to 50GB for busy months)
            if file_size > 50 * 1024 * 1024 * 1024:  # 50GB maximum (very generous)
                logger.warning(f"File {filename} seems unusually large ({file_size / (1024*1024*1024):.1f} GB)")
                return False
            
            # Try to open and read the first few bytes to verify it's a valid zst file
            try:
                with open(filename, 'rb') as f:
                    # Read first 4 bytes - zstd magic number is 0xFD2FB528
                    magic = f.read(4)
                    if len(magic) < 4:
                        logger.warning(f"File {filename} appears to be truncated (less than 4 bytes)")
                        return False
                    
                    # Check for zstd magic number (little-endian: 0x28, 0xb5, 0x2f, 0xfd)
                    if magic != b'\x28\xb5\x2f\xfd':
                        logger.warning(f"File {filename} doesn't have valid zstd magic number")
                        logger.warning(f"Expected: 28b52ffd, Got: {magic.hex()}")
                        
                        # Additional debug info
                        if magic.startswith(b'<!DOCTYPE') or magic.startswith(b'<html'):
                            logger.warning(f"File {filename} appears to be HTML (possibly an error page)")
                        elif magic.startswith(b'PK'):
                            logger.warning(f"File {filename} appears to be a ZIP file")
                        elif len(magic) == 0:
                            logger.warning(f"File {filename} is empty")
                        
                        return False
                    
                    # Try to read more to ensure file isn't truncated
                    f.seek(0)
                    header = f.read(min(1024, file_size))  # Read up to 1KB or file size
                    if len(header) < min(1024, file_size):
                        logger.warning(f"File {filename} appears to be truncated (header too short)")
                        return False
                        
            except Exception as e:
                logger.warning(f"Error reading {filename}: {e}")
                return False
            
            # Try to create a decompressor to verify file structure
            try:
                with open(filename, 'rb') as f:
                    decompressor = zstd.ZstdDecompressor()
                    # Try to read just the first few bytes of decompressed data
                    with decompressor.stream_reader(f) as reader:
                        test_data = reader.read(100)  # Read first 100 bytes
                        if not test_data:
                            logger.warning(f"File {filename} appears to be empty after decompression")
                            return False
                            
            except Exception as e:
                logger.warning(f"Error validating zstd structure of {filename}: {e}")
                return False
            
            logger.info(f"File {filename} validated successfully ({file_size / (1024*1024*1024):.2f} GB)")
            return True
            
        except Exception as e:
            logger.warning(f"Error validating {filename}: {e}")
            return False

    def debug_list_temp_files(self) -> None:
        """Debug method to list all temp files in the directory"""
        try:
            temp_files = []
            for filename in os.listdir('.'):
                if filename.startswith('temp_') and filename.endswith('.pgn.zst'):
                    temp_files.append(filename)
            
            if temp_files:
                logger.info(f"Debug: Found {len(temp_files)} temp files in directory:")
                for temp_file in temp_files:
                    file_size = os.path.getsize(temp_file)
                    logger.info(f"  - {temp_file} ({file_size / (1024*1024*1024):.2f} GB)")
            else:
                logger.info("Debug: No temp files found in directory")
        except Exception as e:
            logger.error(f"Debug: Error listing temp files: {e}")

# OS-agnostic utility functions
def get_temp_dir() -> Path:
    """Get OS-appropriate temporary directory"""
    return Path(tempfile.gettempdir())

def safe_file_remove(filepath: str, max_retries: int = 3) -> bool:
    """Safely remove a file with retry logic for Windows file locking issues"""
    for attempt in range(max_retries):
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return True  # File doesn't exist, consider it removed
        except PermissionError:
            if platform.system() == "Windows":
                # Windows-specific handling for file locking
                time.sleep(0.5)  # Wait a bit and retry
                continue
            else:
                raise
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"Failed to remove {filepath} after {max_retries} attempts: {e}")
                return False
            time.sleep(0.1)
    return False

def safe_file_move(src: str, dst: str, max_retries: int = 3) -> bool:
    """Safely move a file with retry logic for Windows"""
    for attempt in range(max_retries):
        try:
            shutil.move(src, dst)
            return True
        except PermissionError:
            if platform.system() == "Windows":
                time.sleep(0.5)
                continue
            else:
                raise
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"Failed to move {src} to {dst} after {max_retries} attempts: {e}")
                return False
            time.sleep(0.1)
    return False

def get_os_specific_config():
    """Get OS-specific configuration settings"""
    config = {
        'chunk_size': 8192,
        'file_retry_delay': 0.1,
        'max_file_retries': 3
    }
    
    if platform.system() == "Windows":
        config.update({
            'file_retry_delay': 0.5,
            'max_file_retries': 5,
            'chunk_size': 4096  # Smaller chunks for Windows
        })
    
    return config

def main():
    """Main function for execution"""
    
    # Determine ECO file paths based on current directory structure
    current_dir = Path.cwd()
    
    # Check if we're in the tools directory or project root
    if current_dir.name == 'tools':
        eco_base_path = current_dir.parent / 'data' / 'eco'
    else:
        eco_base_path = current_dir / 'data' / 'eco'
    
    # ECO files to load
    eco_files = [
        str(eco_base_path / "ecoA.json"),
        str(eco_base_path / "ecoB.json"), 
        str(eco_base_path / "ecoC.json"),
        str(eco_base_path / "ecoD.json"),
        str(eco_base_path / "ecoE.json")
    ]
    
    # Download ECO files if they don't exist
    eco_base_url = "https://raw.githubusercontent.com/hayatbiralem/eco.json/master/"
    for eco_file in eco_files:
        eco_path = Path(eco_file)
        if not eco_path.exists():
            print(f"Downloading {eco_path.name}...")
            try:
                response = requests.get(eco_base_url + eco_path.name)
                if response.status_code == 200:
                    # Ensure directory exists
                    eco_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(eco_path, 'w', encoding='utf-8') as f:
                        f.write(response.text)
                    print(f"Successfully downloaded {eco_path.name}")
                else:
                    print(f"Failed to download {eco_path.name} (HTTP {response.status_code})")
            except Exception as e:
                print(f"Error downloading {eco_path.name}: {e}")
    
    # Create analyzer and run analysis
    analyzer = LichessAnalyzer(
        start_date="2021-07",
        checkpoint_file="stats_checkpoint.json",
        output_file="popularity_stats.json"
    )
    
    # Run the analysis
    analyzer.run_analysis(eco_files)

if __name__ == "__main__":
    main()
