# Lichess Chess Opening Popularity Analysis Pipeline

A production-ready data pipeline for analyzing chess opening popularity from
Lichess game database. This pipeline downloads, processes, and analyzes millions
of chess games to generate comprehensive opening statistics.

## Features

- 📊 **Comprehensive Statistics**: Analyzes popularity, win rates, and
  confidence scores for chess openings
- 🔄 **Incremental Updates**: Support for incremental processing to update
  statistics efficiently
- 💾 **Checkpoint/Resume**: Automatic checkpointing for recovery from
  interruptions
- 🚀 **Parallel Processing**: Efficient parallel download and processing
- 🔍 **Data Validation**: Built-in validation for downloads and outputs
- 📝 **Detailed Logging**: Comprehensive logging with progress bars

## Output

The pipeline generates `popularity_stats.json` containing statistics for chess
opening positions:

```json
{
  "positions": {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": {
      "popularity_score": 10,
      "frequency_count": 62896557,
      "white_win_rate": 0.49,
      "black_win_rate": 0.47,
      "draw_rate": 0.04,
      "games_analyzed": 62896557,
      "avg_rating": 1708,
      "confidence_score": 1.0,
      "analysis_date": "2025-07-15"
    }
  }
}
```

## Installation

### Prerequisites

- Python 3.7 or higher
- ~50 GB free disk space for temporary files
- Stable internet connection

### Setup

1. **Clone the repository** (if not already done)

2. **Navigate to the analysis directory**:

   ```bash
   cd tools/analysis
   ```

3. **Install Python dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

   Or with a virtual environment (recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Usage

### Quick Start

Run the pipeline with default settings:

**Unix/Mac**:

```bash
./run_pipeline.sh
```

**Windows**:

```batch
run_pipeline.bat
```

**Python directly**:

```bash
python run_pipeline.py
```

### Incremental Update

To only process new months since the last run:

```bash
python run_pipeline.py --incremental
```

This is much faster and recommended for regular updates.

### Advanced Options

```bash
# Use custom configuration file
python run_pipeline.py --config my_config.json

# Override start date
python run_pipeline.py --start-date 2024-01

# Specify custom output file
python run_pipeline.py --output custom_stats.json

# Specify work directory for temp files
python run_pipeline.py --work-dir /path/to/temp

# Enable verbose logging
python run_pipeline.py --verbose

# Combine options
python run_pipeline.py --incremental --verbose
```

### View Help

```bash
python run_pipeline.py --help
```

## Configuration

The pipeline can be configured using a JSON configuration file. Create a config
file based on `config.example.json`:

```json
{
  "start_date": "2021-07",
  "max_moves_per_game": 35,
  "min_rating": 0,
  "chunk_size": 8192,
  "max_download_retries": 3
}
```

Then use it:

```bash
python run_pipeline.py --config my_config.json
```

### Configuration Options

| Option                 | Description                       | Default                                |
| ---------------------- | --------------------------------- | -------------------------------------- |
| `start_date`           | Start month (YYYY-MM)             | `2021-07`                              |
| `max_moves_per_game`   | Maximum moves to analyze per game | `35`                                   |
| `min_rating`           | Minimum player rating to include  | `0`                                    |
| `chunk_size`           | Download chunk size in bytes      | `8192`                                 |
| `max_download_retries` | Maximum download retry attempts   | `3`                                    |
| `work_dir`             | Directory for temporary files     | `./temp`                               |
| `output_file`          | Output JSON file path             | `../../api/data/popularity_stats.json` |

## Architecture

The pipeline consists of modular components:

```
tools/analysis/
├── config.py                   # Configuration management
├── run_pipeline.py             # Main CLI entry point
├── run_pipeline.sh             # Unix/Mac runner script
├── run_pipeline.bat            # Windows runner script
├── requirements.txt            # Python dependencies
└── lib/
    ├── state_manager.py        # Checkpoint & state management
    ├── data_fetcher.py         # Download Lichess data
    ├── game_processor.py       # Process PGN games
    ├── stats_calculator.py     # Calculate statistics
    └── output_handler.py       # Export results
```

### Pipeline Flow

```
1. Load Configuration
   ↓
2. Load Target FENs from ECO files
   ↓
3. Load Checkpoint (if incremental)
   ↓
4. For each month:
   - Download compressed PGN file
   - Validate download
   - Process games (extract positions)
   - Update statistics
   - Save checkpoint
   - Clean up temp files
   ↓
5. Calculate popularity scores
   ↓
6. Save results to JSON
```

## Data Source

The pipeline downloads data from the
[Lichess Open Database](https://database.lichess.org/):

- URL:
  `https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst`
- Each file contains all rated standard games for one month
- Files are compressed with zstandard (.zst)
- File sizes: 1-10 GB compressed, larger when decompressed

## Checkpoints & Recovery

The pipeline automatically creates checkpoints after processing each month:

- Checkpoint file: `stats_checkpoint.json`
- Contains processed months and current statistics
- Enables resuming after interruption
- Use `--incremental` to leverage checkpoints

## Troubleshooting

### Issue: Download fails

**Solution**: The pipeline automatically retries downloads. If persistent:

- Check internet connection
- Verify Lichess database is accessible
- Increase `max_download_retries` in config

### Issue: Out of disk space

**Solution**:

- The pipeline needs ~10-50 GB for temp files
- Specify a different `work_dir` with more space
- Files are cleaned up automatically after processing

### Issue: Process killed/interrupted

**Solution**:

- The pipeline saves checkpoints automatically
- Simply re-run with `--incremental` to resume
- Progress is preserved in `stats_checkpoint.json`

### Issue: "Required Python packages not found"

**Solution**:

```bash
pip install -r requirements.txt
```

### Issue: Python version incompatible

**Solution**:

- Requires Python 3.7+
- Check version: `python --version`
- Update Python if needed

## Utility Scripts

### Check Enrichment Status

Check the enrichment status of ECO files:

```bash
python check_enrichment_status.py
```

### Analyze Top Openings

Analyze and export top openings from the generated statistics:

```bash
node analyze_top_openings.js
```

This generates:

- `comprehensive_openings.json`
- `top_100_openings.json`

## Performance

**Typical Performance**:

- Download speed: Limited by internet connection
- Processing speed: ~50,000-100,000 games/second
- Full run (2021-07 to present): 6-12 hours
- Incremental update (1 month): 15-30 minutes

**Resource Usage**:

- CPU: Moderate (single-threaded decompression)
- RAM: ~2-4 GB
- Disk: 10-50 GB temporary storage
- Network: ~500 GB total download

## Development

### Running Tests

```bash
# Test with one month only
python run_pipeline.py --start-date 2024-01 --verbose
```

### Module Documentation

Each module in `lib/` has comprehensive docstrings. To view:

```python
from lib import StateManager
help(StateManager)
```

## License

Part of the chess-opening-explorer project.

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs in `logs/` directory
3. Open an issue in the project repository

## Version

Current version: 2.0.0 (Productionized)

---

**Last Updated**: 2025-11-21
