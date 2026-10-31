# Lichess Chess Opening Popularity Analysis Pipeline

## Current pipeline: monthly summaries and a 3-month window

The served stats come from the last 3 published months of the Lichess database
(rated blitz, rapid and classical games; bots and abandoned games excluded, as
the explorer excludes them). Two steps:

1. **Summarise a month** (~29 GB download, ~2 h on 11 workers):

   ```bash
   python summarise_month.py --month 2026-09 --file lichess_db_standard_rated_2026-09.pgn.zst
   ```

   Check the download against Lichess's `sha256sums.txt` first, and the printed
   game count against `counts.txt`. Writes `data/monthly/2026-09.json.gz` (~2.7
   MB): per position, per band, games, results, rating total and the top 12 next
   moves. Commit it; delete the raw file. Run without `-I`, so `lib` imports.

2. **Combine the window**:

   ```bash
   python combine_window.py --since 2026-07 --until 2026-09
   ```

   A missing month aborts. Writes into `api/data/`:
   - `popularity_stats.json`: the all-ratings figures in the shape the API
     already reads, with `metadata.window`.
   - `popularity-bands.json`: per FEN, per band `{g, w, d, b}`.
   - `position-stats/NN.json`: 256 shards (djb2 of the FEN, the hash in
     `middleware.ts`), each FEN with every band's counts, average rating and
     next moves. No shard may exceed 250 KB, or nothing is written.

   Under 20 games, a band is `null` and `popularity_stats.json` keeps the real
   count with `null` rates: the page shows "no stats" rather than a win rate
   over three games. In the 2026-07..09 window that is 601 of 12,377 positions,
   all deep lines.

   Game and result totals are exact. Move lists are summed from each month's top
   12, so a move outside one month's top 12 is undercounted for that month; it
   only affects the last few rows. `analysis_date` is the run date, so rerunning
   the same window on another day rewrites `popularity_stats.json` with no
   change to the numbers.

Bands are the average of both players' ratings: under 1400, 1400–1800,
1800–2200, 2200+ (`BAND_RATINGS` in `explorer.routes.js`). Positions match on
board, side, castling and legal en passant, so transpositions count.

**Cross-check every change to the counting rules** with
`crosscheck_explorer.py data/monthly/2026-03.json.gz`, using your own Lichess
token (never the production one). The explorer has no monthly data after
2026-03, so March is the reference month. On 2026-03 every cell with 1,000+
explorer games agreed within 0.63%, most exactly.

### Monthly refresh

`refresh.py` does both steps for the window ending last month, on a schedule
(`schedule\register-task.ps1`: at logon and daily at 09:00, Windows only;
`-Unregister` removes it). Most runs find the window already on `origin/main`,
or Lichess not yet published (the 3rd to the 10th), and exit at once.

When there is work, it downloads each missing month to
`%LOCALAPPDATA%\openingbook\lichess\` (resuming after a shutdown), checks the
SHA-256 and, once summarised, the game count against `counts.txt`, then combines
and commits to a local branch `data/popularity-YYYY-MM`. A Windows notification
says when it is ready, or that it failed. **It never pushes**: review the
branch, push it and open the PR yourself. While that branch holds the month's
summary it does not redo the month.

The task runs `refresh.py` from its own worktree
(`%LOCALAPPDATA%\openingbook\worktree`), reset to `origin/main` each run, so it
only runs merged code and never touches your checkout; a full run anywhere else
refuses. `python refresh.py --check` says what it would do, from any checkout.
The log is `%LOCALAPPDATA%\openingbook\refresh.log`. Register the task only once
these scripts are on `main`; `register-task.ps1` checks.

Tests: `python -I -m pytest tests -q` from this directory.

The rest of this README describes the original pipeline (`run_pipeline.py`),
which nothing runs any more and which is due to be removed.

## Original pipeline

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

### Its numbers never shipped

The all-time file that shipped until 2026-10 came from a deleted API script
(2025-07-15), not from this pipeline. This pipeline splits games on a blank line
Lichess does not use, matches FENs including move counters (missing
transpositions) and counts bullet, so its output disagrees with both.

### The caveat that reaches users

This data covers **all rated Lichess players, not master games** — the shipped
sample carries `avg_rating` around 2016. Every label, caption and column header
derived from it must say so. Calling it master data is a factual error visible
to users; it has shipped before.

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
