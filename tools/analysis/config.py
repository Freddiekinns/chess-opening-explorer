#!/usr/bin/env python3
"""
Configuration management for Lichess analysis pipeline
"""

import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional, List


@dataclass
class PipelineConfig:
    """Configuration for the Lichess analysis pipeline"""
    
    # Data sources
    lichess_base_url: str = "https://database.lichess.org/standard/lichess_db_standard_rated_{}.pgn.zst"
    start_date: str = "2021-07"
    
    # Paths
    eco_base_path: Optional[Path] = None
    output_file: Optional[Path] = None
    checkpoint_file: Optional[Path] = None
    work_dir: Optional[Path] = None
    
    # Processing parameters
    max_moves_per_game: int = 35
    min_rating: int = 0
    chunk_size: int = 8192
    
    # Parallel processing
    max_concurrent_downloads: int = 1
    download_queue_size: int = 2
    
    # Validation
    min_file_size_mb: int = 100
    max_file_size_gb: int = 50
    
    # Checkpoint settings
    checkpoint_interval_games: int = 100000
    
    # Retry settings
    max_download_retries: int = 3
    download_retry_delay: int = 30
    
    def __post_init__(self):
        """Initialize paths with defaults if not provided"""
        # Get the script directory
        script_dir = Path(__file__).parent.resolve()
        project_root = script_dir.parent.parent
        
        # Set default paths if not provided
        if self.eco_base_path is None:
            self.eco_base_path = project_root / "api" / "data" / "eco"
        
        if self.output_file is None:
            self.output_file = project_root / "api" / "data" / "popularity_stats.json"
        
        if self.checkpoint_file is None:
            self.checkpoint_file = script_dir / "stats_checkpoint.json"
        
        if self.work_dir is None:
            # Use a temp directory in the analysis folder
            self.work_dir = script_dir / "temp"
        
        # Convert string paths to Path objects
        self.eco_base_path = Path(self.eco_base_path)
        self.output_file = Path(self.output_file)
        self.checkpoint_file = Path(self.checkpoint_file)
        self.work_dir = Path(self.work_dir)
        
        # Create work directory if it doesn't exist
        self.work_dir.mkdir(parents=True, exist_ok=True)
    
    def get_eco_files(self) -> List[Path]:
        """Get list of ECO file paths"""
        eco_files = [
            self.eco_base_path / "ecoA.json",
            self.eco_base_path / "ecoB.json",
            self.eco_base_path / "ecoC.json",
            self.eco_base_path / "ecoD.json",
            self.eco_base_path / "ecoE.json"
        ]
        return eco_files
    
    def get_eco_files_as_strings(self) -> List[str]:
        """Get list of ECO file paths as strings"""
        return [str(f) for f in self.get_eco_files()]
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Check ECO files exist
        for eco_file in self.get_eco_files():
            if not eco_file.exists():
                errors.append(f"ECO file not found: {eco_file}")
        
        # Check output directory is writable
        output_dir = self.output_file.parent
        if not output_dir.exists():
            try:
                output_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create output directory {output_dir}: {e}")
        
        # Check work directory
        if not self.work_dir.exists():
            try:
                self.work_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create work directory {self.work_dir}: {e}")
        
        # Validate numeric parameters
        if self.max_moves_per_game < 1:
            errors.append("max_moves_per_game must be positive")
        
        if self.min_rating < 0:
            errors.append("min_rating cannot be negative")
        
        if self.chunk_size < 1024:
            errors.append("chunk_size should be at least 1024 bytes")
        
        return errors
    
    @classmethod
    def from_file(cls, config_path: str) -> 'PipelineConfig':
        """Load configuration from JSON file"""
        with open(config_path, 'r') as f:
            config_dict = json.load(f)
        
        # Convert path strings to Path objects
        if 'eco_base_path' in config_dict:
            config_dict['eco_base_path'] = Path(config_dict['eco_base_path'])
        if 'output_file' in config_dict:
            config_dict['output_file'] = Path(config_dict['output_file'])
        if 'checkpoint_file' in config_dict:
            config_dict['checkpoint_file'] = Path(config_dict['checkpoint_file'])
        if 'work_dir' in config_dict:
            config_dict['work_dir'] = Path(config_dict['work_dir'])
        
        return cls(**config_dict)
    
    @classmethod
    def from_env(cls) -> 'PipelineConfig':
        """Load configuration from environment variables"""
        config = cls()
        
        # Override with environment variables if present
        if os.getenv('LICHESS_START_DATE'):
            config.start_date = os.getenv('LICHESS_START_DATE')
        
        if os.getenv('LICHESS_OUTPUT_FILE'):
            config.output_file = Path(os.getenv('LICHESS_OUTPUT_FILE'))
        
        if os.getenv('LICHESS_WORK_DIR'):
            config.work_dir = Path(os.getenv('LICHESS_WORK_DIR'))
        
        return config
    
    def to_dict(self) -> dict:
        """Convert configuration to dictionary"""
        config_dict = asdict(self)
        
        # Convert Path objects to strings for JSON serialization
        config_dict['eco_base_path'] = str(self.eco_base_path)
        config_dict['output_file'] = str(self.output_file)
        config_dict['checkpoint_file'] = str(self.checkpoint_file)
        config_dict['work_dir'] = str(self.work_dir)
        
        return config_dict
    
    def save_to_file(self, config_path: str):
        """Save configuration to JSON file"""
        with open(config_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
