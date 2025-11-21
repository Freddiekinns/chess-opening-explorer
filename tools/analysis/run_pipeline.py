#!/usr/bin/env python3
"""
Main CLI entry point for the Lichess analysis pipeline

Provides a user-friendly command-line interface for running the analysis pipeline
with support for incremental updates and custom configurations.
"""

import argparse
import logging
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import PipelineConfig
from lib import (
    StateManager,
    LichessDataFetcher,
    GameProcessor,
    StatsCalculator,
    OutputHandler
)


# Configure logging
class TqdmLoggingHandler(logging.Handler):
    """Custom logging handler that works with tqdm progress bars"""
    def emit(self, record):
        try:
            from tqdm import tqdm
            msg = self.format(record)
            tqdm.write(msg)
        except Exception:
            pass


def setup_logging(verbose: bool = False):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(level)
    
    # Remove existing handlers
    logger.handlers = []
    
    # Add tqdm-compatible handler
    handler = TqdmLoggingHandler()
    handler.setLevel(level)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


def load_target_fens(eco_files: List[Path]) -> set:
    """
    Load target FEN positions from ECO JSON files
    
    Args:
        eco_files: List of ECO file paths
        
    Returns:
        Set of FEN positions
    """
    target_fens = set()
    
    for eco_file in eco_files:
        if not eco_file.exists():
            logging.warning(f"ECO file not found: {eco_file}")
            continue
        
        try:
            with open(eco_file, 'r', encoding='utf-8') as f:
                eco_data = json.load(f)
            
            # Add all FENs from this file
            for fen in eco_data.keys():
                target_fens.add(fen)
            
            logging.info(f"Loaded {len(eco_data)} positions from {eco_file.name}")
            
        except Exception as e:
            logging.error(f"Error loading {eco_file}: {e}")
    
    return target_fens


def generate_month_list(start_date: str) -> List[str]:
    """
    Generate list of months from start_date to present
    
    Args:
        start_date: Start date in format YYYY-MM
        
    Returns:
        List of month strings
    """
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    # Parse start date
    start = datetime.strptime(start_date, "%Y-%m")
    end = datetime.now()
    
    months = []
    current = start
    while current <= end:
        months.append(current.strftime("%Y-%m"))
        current += relativedelta(months=1)
    
    return months


def run_pipeline(config: PipelineConfig, incremental: bool = False):
    """
    Run the complete analysis pipeline
    
    Args:
        config: Pipeline configuration
        incremental: If True, only process new months
    """
    logger = logging.getLogger()
    
    logger.info("=" * 80)
    logger.info("Lichess Chess Opening Popularity Analysis Pipeline")
    logger.info("=" * 80)
    logger.info(f"Start date: {config.start_date}")
    logger.info(f"Output file: {config.output_file}")
    logger.info(f"Work directory: {config.work_dir}")
    logger.info(f"Incremental mode: {incremental}")
    logger.info("=" * 80)
    
    # Validate configuration
    errors = config.validate()
    if errors:
        logger.error("Configuration validation failed:")
        for error in errors:
            logger.error(f"  - {error}")
        return False
    
    # Load target FENs
    logger.info("Loading target FEN positions from ECO files...")
    eco_files = config.get_eco_files()
    target_fens = load_target_fens(eco_files)
    
    if not target_fens:
        logger.error("No target FENs loaded. Cannot proceed.")
        return False
    
    logger.info(f"Loaded {len(target_fens)} target FEN positions")
    
    # Initialize state manager
    state_manager = StateManager(config.checkpoint_file)
    state_manager.initialize_from_fens(target_fens)
    
    # Load checkpoint if incremental mode
    if incremental:
        state_manager.load_checkpoint()
    
    # Generate month list
    all_months = generate_month_list(config.start_date)
    
    # Filter months if incremental
    if incremental:
        months_to_process = [m for m in all_months if not state_manager.is_month_processed(m)]
        logger.info(f"Incremental mode: {len(months_to_process)} new months to process")
    else:
        months_to_process = all_months
        logger.info(f"Full mode: {len(months_to_process)} total months to process")
    
    if not months_to_process:
        logger.info("No new months to process!")
        # Still calculate and save stats
    else:
        # Initialize components
        data_fetcher = LichessDataFetcher(
            base_url=config.lichess_base_url,
            work_dir=config.work_dir,
            chunk_size=config.chunk_size
        )
        
        game_processor = GameProcessor(
            target_fens=target_fens,
            stats_update_callback=state_manager.update_stats,
            max_moves=config.max_moves_per_game,
            min_rating=config.min_rating
        )
        
        # Process each month
        for i, month in enumerate(months_to_process, 1):
            logger.info(f"\n{'=' * 80}")
            logger.info(f"Processing month {i}/{len(months_to_process)}: {month}")
            logger.info(f"{'=' * 80}\n")
            
            # Download month data
            file_path = data_fetcher.download_month(month, max_retries=config.max_download_retries)
            
            if not file_path:
                logger.error(f"Failed to download data for {month}")
                continue
            
            # Process the file
            success = game_processor.process_file(file_path, month)
            
            if success:
                # Mark month as processed
                state_manager.mark_month_processed(month)
                
                # Save checkpoint
                state_manager.save_checkpoint()
                
                # Clean up downloaded file
                try:
                    file_path.unlink()
                    logger.info(f"Cleaned up downloaded file for {month}")
                except Exception as e:
                    logger.warning(f"Failed to delete {file_path}: {e}")
            else:
                logger.error(f"Failed to process {month}")
        
        # Cleanup any remaining temp files
        data_fetcher.cleanup_temp_files()
    
    # Calculate popularity scores
    logger.info("\n" + "=" * 80)
    logger.info("Calculating final popularity scores...")
    logger.info("=" * 80)
    
    all_stats = state_manager.get_all_stats()
    StatsCalculator.calculate_popularity_scores(all_stats)
    
    # Save results
    logger.info("\n" + "=" * 80)
    logger.info("Saving results...")
    logger.info("=" * 80)
    
    output_handler = OutputHandler(config.output_file)
    success = output_handler.save_results(all_stats)
    
    if success:
        # Print summary
        summary = state_manager.get_summary()
        logger.info("\n" + "=" * 80)
        logger.info("Pipeline completed successfully!")
        logger.info("=" * 80)
        logger.info(f"Total positions tracked: {summary['total_positions']:,}")
        logger.info(f"Positions with games: {summary['positions_with_games']:,}")
        logger.info(f"Total games analyzed: {summary['total_games_analyzed']:,}")
        logger.info(f"Months processed: {summary['months_processed']}")
        logger.info(f"Output file: {config.output_file}")
        logger.info(f"Output size: {output_handler.get_file_size() / (1024*1024):.2f} MB")
        logger.info("=" * 80)
        return True
    else:
        logger.error("Failed to save results")
        return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Lichess Chess Opening Popularity Analysis Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run full analysis from default start date
  python run_pipeline.py
  
  # Run incremental update (only process new months)
  python run_pipeline.py --incremental
  
  # Use custom configuration file
  python run_pipeline.py --config my_config.json
  
  # Override start date
  python run_pipeline.py --start-date 2024-01
  
  # Specify custom output file
  python run_pipeline.py --output custom_stats.json
        """
    )
    
    parser.add_argument(
        '--config',
        type=str,
        help='Path to configuration JSON file'
    )
    
    parser.add_argument(
        '--incremental',
        action='store_true',
        help='Only process new months (incremental update)'
    )
    
    parser.add_argument(
        '--start-date',
        type=str,
        help='Start date in format YYYY-MM (overrides config)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='Output file path (overrides config)'
    )
    
    parser.add_argument(
        '--work-dir',
        type=str,
        help='Work directory for temporary files (overrides config)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger()
    
    # Load configuration
    if args.config:
        logger.info(f"Loading configuration from {args.config}")
        config = PipelineConfig.from_file(args.config)
    else:
        logger.info("Using default configuration")
        config = PipelineConfig()
    
    # Override with command-line arguments
    if args.start_date:
        config.start_date = args.start_date
    
    if args.output:
        config.output_file = Path(args.output)
    
    if args.work_dir:
        config.work_dir = Path(args.work_dir)
    
    # Run pipeline
    try:
        success = run_pipeline(config, incremental=args.incremental)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nPipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed with error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
