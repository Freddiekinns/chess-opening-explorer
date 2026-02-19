---
description: Update chess opening popularity statistics from Lichess
---

# Update Popularity Statistics

This workflow updates the chess opening popularity statistics by processing new
Lichess game data.

## When to Run

- **Monthly**: To include the latest month's games
- **After major updates**: When ECO files are modified
- **On demand**: When fresh statistics are needed

## Prerequisites

1. Python 3.7+ installed
2. Dependencies installed: `pip install -r tools/analysis/requirements.txt`
3. Sufficient disk space (~50 GB for temp files)
4. Stable internet connection

## Steps

### 1. Navigate to analysis directory

```bash
cd tools/analysis
```

### 2. Run incremental update (recommended)

```bash
// turbo
python run_pipeline.py --incremental
```

This will only process new months since the last run, which is much faster than
a full re-run.

### 3. Alternative: Full re-run

If you need to completely regenerate statistics:

```bash
python run_pipeline.py
```

⚠️ **Warning**: This will process all months from 2021-07 to present and may
take 6-12 hours.

### 4. Verify output

Check that the output file was updated:

**Unix/Mac**:

```bash
// turbo
ls -lh ../../api/data/popularity_stats.json
```

**Windows**:

```bash
// turbo
dir ..\..\api\data\popularity_stats.json
```

### 5. (Optional) Analyze top openings

Generate analysis files for the top openings:

```bash
// turbo
node analyze_top_openings.js
```

This creates:

- `../../api/data/comprehensive_openings.json`
- `../../api/data/top_100_openings.json`

### 6. (Optional) Check enrichment status

Verify ECO file enrichment:

```bash
// turbo
python check_enrichment_status.py
```

## Troubleshooting

### Download Failures

If downloads fail repeatedly:

1. Check internet connection
2. Verify Lichess database is accessible: https://database.lichess.org/
3. Wait and retry - the server may be temporarily overloaded

### Out of Disk Space

1. Check available space: `df -h` (Unix) or `dir` (Windows)
2. Clean up temp files: `rm -rf temp/*.zst*`
3. Specify different work directory:
   `python run_pipeline.py --work-dir /path/with/space`

### Process Interrupted

The pipeline saves checkpoints automatically:

1. Simply re-run with `--incremental`
2. It will resume from the last completed month

## Output Files

After successful completion:

- `../../api/data/popularity_stats.json` - Full statistics
- `stats_checkpoint.json` - Checkpoint for resuming
- `logs/pipeline_*.log` - Execution logs

## Expected Duration

- **Incremental update (1 month)**: 15-30 minutes
- **Full run (all months)**: 6-12 hours

## Notes

- The pipeline processes millions of games
- Progress is shown with detailed progress bars
- All downloads are validated before processing
- Temp files are automatically cleaned up after each month
