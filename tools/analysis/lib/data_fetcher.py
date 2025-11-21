#!/usr/bin/env python3
"""
Data fetcher for Lichess database files

Handles downloading and validating compressed PGN data from Lichess.
"""

import logging
import time
from typing import Optional
import requests
import zstandard as zstd
from pathlib import Path
from tqdm import tqdm
import sys

logger = logging.getLogger(__name__)


class LichessDataFetcher:
    """Fetches and validates Lichess database files"""
    
    def __init__(self, base_url: str, work_dir: Path, chunk_size: int = 8192):
        """
        Initialize data fetcher
        
        Args:
            base_url: Base URL template for Lichess database
            work_dir: Directory for downloaded files
            chunk_size: Chunk size for downloads
        """
        self.base_url = base_url
        self.work_dir = Path(work_dir)
        self.chunk_size = chunk_size
        
        # Ensure work directory exists
        self.work_dir.mkdir(parents=True, exist_ok=True)
    
    def download_month(self, month: str, max_retries: int = 3) -> Optional[Path]:
        """
        Download data for a specific month
        
        Args:
            month: Month string (e.g., "2021-07")
            max_retries: Maximum number of retry attempts
            
        Returns:
            Path to downloaded file, or None if failed
        """
        url = self.base_url.format(month)
        filename = f"lichess_db_{month}.pgn.zst"
        final_path = self.work_dir / filename
        temp_path = final_path.with_suffix(final_path.suffix + '.tmp')
        
        # Check if file already exists and is valid
        if final_path.exists():
            logger.info(f"File {filename} already exists")
            if self.validate_file(final_path):
                logger.info(f"Existing file {filename} is valid, skipping download")
                return final_path
            else:
                logger.warning(f"Existing file {filename} is invalid, re-downloading")
                final_path.unlink()
        
        # Download with retry logic
        for attempt in range(max_retries):
            try:
                logger.info(f"Downloading {filename} (attempt {attempt + 1}/{max_retries})")
                
                # Clean up any existing temp file
                if temp_path.exists():
                    temp_path.unlink()
                
                response = requests.get(url, stream=True)
                response.raise_for_status()
                
                # Get file size for progress tracking
                file_size = int(response.headers.get('content-length', 0))
                logger.info(f"File size: {file_size / (1024*1024*1024):.2f} GB")
                
                # Download with progress bar
                progress_bar = tqdm(
                    desc=f"Downloading {month}",
                    total=file_size,
                    unit='B',
                    unit_scale=True,
                    unit_divisor=1024,
                    ncols=80,
                    leave=True,
                    file=sys.stdout
                )
                
                try:
                    # Download to temporary file first
                    with open(temp_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=self.chunk_size):
                            if chunk:
                                f.write(chunk)
                                progress_bar.update(len(chunk))
                    
                    progress_bar.close()
                    
                    # Validate the downloaded file before moving
                    if self.validate_file(temp_path):
                        # Atomic move from temp to final location
                        temp_path.replace(final_path)
                        logger.info(f"Successfully downloaded {filename}")
                        return final_path
                    else:
                        logger.warning(f"Downloaded file failed validation, retrying...")
                        if temp_path.exists():
                            temp_path.unlink()
                        continue
                    
                except Exception as e:
                    progress_bar.close()
                    if temp_path.exists():
                        temp_path.unlink()
                    raise e
                
            except Exception as e:
                logger.warning(f"Download attempt {attempt + 1} failed: {e}")
                if temp_path.exists():
                    temp_path.unlink()
                
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in 30 seconds...")
                    time.sleep(30)
                else:
                    logger.error(f"All download attempts failed for {filename}")
                    return None
        
        return None
    
    def validate_file(self, filepath: Path, min_size_mb: int = 100, max_size_gb: int = 50) -> bool:
        """
        Validate that a downloaded file is complete and not corrupted
        
        Args:
            filepath: Path to file to validate
            min_size_mb: Minimum file size in MB
            max_size_gb: Maximum file size in GB
            
        Returns:
            True if file is valid, False otherwise
        """
        try:
            if not filepath.exists():
                logger.warning(f"File {filepath} does not exist")
                return False
            
            # Check if file size is reasonable
            file_size = filepath.stat().st_size
            
            if file_size < min_size_mb * 1024 * 1024:
                logger.warning(f"File {filepath.name} seems too small ({file_size / (1024*1024):.1f} MB)")
                return False
            
            if file_size > max_size_gb * 1024 * 1024 * 1024:
                logger.warning(f"File {filepath.name} seems unusually large ({file_size / (1024*1024*1024):.1f} GB)")
                return False
            
            # Check zstd magic number
            with open(filepath, 'rb') as f:
                magic = f.read(4)
                if len(magic) < 4:
                    logger.warning(f"File {filepath.name} appears to be truncated")
                    return False
                
                # Check for zstd magic number (little-endian: 0x28, 0xb5, 0x2f, 0xfd)
                if magic != b'\x28\xb5\x2f\xfd':
                    logger.warning(f"File {filepath.name} doesn't have valid zstd magic number")
                    
                    # Additional debug info
                    if magic.startswith(b'<!DOCTYPE') or magic.startswith(b'<html'):
                        logger.warning(f"File appears to be HTML (possibly an error page)")
                    elif magic.startswith(b'PK'):
                        logger.warning(f"File appears to be a ZIP file")
                    
                    return False
            
            # Try to decompress first few bytes to verify structure
            try:
                with open(filepath, 'rb') as f:
                    decompressor = zstd.ZstdDecompressor()
                    with decompressor.stream_reader(f) as reader:
                        test_data = reader.read(100)
                        if not test_data:
                            logger.warning(f"File {filepath.name} appears to be empty after decompression")
                            return False
            except Exception as e:
                logger.warning(f"Error validating zstd structure of {filepath.name}: {e}")
                return False
            
            logger.info(f"File {filepath.name} validated successfully ({file_size / (1024*1024*1024):.2f} GB)")
            return True
            
        except Exception as e:
            logger.warning(f"Error validating {filepath}: {e}")
            return False
    
    def cleanup_temp_files(self):
        """Clean up any remaining temporary files"""
        try:
            for temp_file in self.work_dir.glob('*.tmp'):
                try:
                    temp_file.unlink()
                    logger.info(f"Cleaned up temp file: {temp_file.name}")
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file.name}: {e}")
        except Exception as e:
            logger.warning(f"Error during cleanup: {e}")
