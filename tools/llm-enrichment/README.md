# Chess Opening Enrichment Tools

Production scripts for enriching chess opening data with AI-generated content.

## Overview

This directory contains scripts to enrich chess opening data in the ECO
(Encyclopedia of Chess Openings) JSON files with AI-generated analysis,
including descriptions, strategic themes, style tags, and book recommendations.

## Scripts

### `enrich_openings_llm.js`

Enriches chess opening data with AI-generated analysis using Google Vertex AI.

**Features:**

- Batch processing with configurable size
- Automatic retry logic (3 attempts per opening)
- Progress tracking and statistics
- State persistence for resume capability
- Filtering by ECO code
- Dry-run mode for previewing changes
- Comprehensive logging options

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Google Cloud Account**: With Vertex AI API enabled and billing configured
- **API Key**: Valid Google Application Credentials with access to Vertex AI

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Cloud Credentials

Set the `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable with your
service account credentials:

```bash
# Create a .env file in the project root
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
```

> [!IMPORTANT] The Google Cloud project must have billing enabled. The script
> will fail with authentication errors if the API key is not connected to a paid
> account.

### 3. (Optional) Create Configuration File

Create a `.enrichrc.json` file in the `tools/llm-enrichment` directory:

```json
{
  "batchSize": 25,
  "logFile": "enrich.log",
  "verbose": true,
  "stateFile": "enrich-state.json"
}
```

## Usage

### Basic Usage

Enrich openings with default settings (batch size: 10):

```bash
npm run enrich
```

Or directly:

```bash
node tools/llm-enrichment/enrich_openings_llm.js
```

### With Custom Batch Size

```bash
npm run enrich -- --batchSize=25
```

Or:

```bash
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=25
```

### Dry-Run Mode

Preview which openings would be enriched without making changes:

```bash
node tools/llm-enrichment/enrich_openings_llm.js --dryRun --batchSize=10
```

### Filter by ECO Code

Enrich only specific ECO codes:

```bash
# Enrich only A00 openings
node tools/llm-enrichment/enrich_openings_llm.js --ecoCode=A00 --batchSize=20

# Enrich all A-series openings
node tools/llm-enrichment/enrich_openings_llm.js --ecoCode=A --batchSize=50
```

### Exclude ECO Codes

Skip specific ECO codes:

```bash
node tools/llm-enrichment/enrich_openings_llm.js --excludeEco=A00,B00 --batchSize=30
```

### Resume from Previous Run

Continue enrichment from where you left off:

```bash
node tools/llm-enrichment/enrich_openings_llm.js --resume --stateFile=enrich-state.json --batchSize=25
```

### With Enhanced Logging

```bash
# Log to file
node tools/llm-enrichment/enrich_openings_llm.js --logFile=enrich.log --batchSize=20

# Verbose output
node tools/llm-enrichment/enrich_openings_llm.js --verbose --batchSize=15

# Quiet mode (minimal output)
node tools/llm-enrichment/enrich_openings_llm.js --quiet --batchSize=30
```

### Using Configuration File

```bash
node tools/llm-enrichment/enrich_openings_llm.js --config=.enrichrc.json
```

Configuration files are automatically loaded from `.enrichrc.json` in the
current directory. CLI arguments override config file settings.

## Command-Line Options

| Option         | Alias | Type    | Default        | Description                              |
| -------------- | ----- | ------- | -------------- | ---------------------------------------- |
| `--batchSize`  | `-b`  | number  | 10             | Number of openings to process            |
| `--ecoCode`    | `-e`  | string  | -              | Filter by ECO code (e.g., A00, B, C50)   |
| `--excludeEco` |       | string  | -              | Exclude ECO codes (comma-separated)      |
| `--limit`      | `-l`  | number  | -              | Maximum total enrichments to perform     |
| `--dryRun`     |       | boolean | false          | Preview without making changes           |
| `--resume`     |       | boolean | false          | Resume from previous run                 |
| `--stateFile`  |       | string  | -              | Path to state file for resume capability |
| `--logFile`    |       | string  | -              | Path to log file                         |
| `--verbose`    | `-v`  | boolean | false          | Enable verbose output                    |
| `--quiet`      | `-q`  | boolean | false          | Minimal output (errors only)             |
| `--config`     | `-c`  | string  | .enrichrc.json | Path to configuration file               |
| `--help`       | `-h`  | boolean | false          | Show help information                    |

## Configuration File Format

Create a `.enrichrc.json` file:

```json
{
  "batchSize": 25,
  "ecoCode": "A",
  "excludeEco": "A00,A01",
  "limit": 100,
  "stateFile": "enrich-state.json",
  "logFile": "enrich.log",
  "verbose": true,
  "quiet": false
}
```

**Configuration Precedence:**

1. Command-line arguments (highest priority)
2. Configuration file
3. Default values (lowest priority)

## Output Files

- **ECO JSON Files**: Updated in `packages/api/src/data/eco/` (or
  `api/data/eco/`)
- **State File**: Tracks progress for resume capability (if `--stateFile` is
  specified)
- **Log File**: Detailed execution logs (if `--logFile` is specified)
- **Error Log**: Failed enrichments saved to `enrich-errors.json`

## Workflow Examples

### Initial Enrichment - Small Batch Test

Test with a small batch first:

```bash
node tools/llm-enrichment/enrich_openings_llm.js --dryRun --batchSize=5
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=5 --logFile=test.log
```

### Enrich All A-Series Openings

```bash
node tools/llm-enrichment/enrich_openings_llm.js \
  --ecoCode=A \
  --batchSize=50 \
  --stateFile=enrich-a-series.json \
  --logFile=enrich-a-series.log \
  --verbose
```

If interrupted, resume with:

```bash
node tools/llm-enrichment/enrich_openings_llm.js \
  --resume \
  --stateFile=enrich-a-series.json \
  --batchSize=50 \
  --logFile=enrich-a-series.log
```

### Complete Enrichment in Batches

Process all openings in manageable batches:

```bash
# Run multiple times until complete
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=100 --logFile=enrich.log
```

The script will automatically report when all openings are enriched.

## Troubleshooting

### "Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON"

**Solution**: Set up your `.env` file with valid Google Cloud credentials.

```bash
# In .env file
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### "Authentication error" or "Billing not enabled"

**Cause**: The Google Cloud project doesn't have billing enabled, or the API key
is invalid.

**Solution**:

1. Enable billing on your Google Cloud project
2. Ensure Vertex AI API is enabled
3. Verify your service account has the necessary permissions

### "Opening with FEN '...' not found in ECO files"

**Cause**: The FEN key doesn't exist in any ECO JSON file, possibly due to data
mismatch.

**Solution**:

1. Check if the ECO data is up to date
2. Review the error log for patterns
3. Contact support if the issue persists

### Script runs but no openings are enriched

**Cause**: All openings already have `analysis_json` data.

**Solution**: Check enrichment statistics. If all openings are already enriched,
the script will report this and exit gracefully.

### Rate limiting or API errors

**Cause**: Too many requests to the API in a short time.

**Solution**:

1. Reduce batch size
2. The script has built-in retry logic and delays
3. Check your Google Cloud quotas

## Data Structure

Each enriched opening will have an `analysis_json` field with the following
structure:

```json
{
  "description": "Detailed opening description...",
  "style_tags": ["Aggressive", "Sharp", "Tactical"],
  "tactical_tags": ["Initiative", "Sacrifice"],
  "positional_tags": ["King Safety", "Central Control"],
  "player_style_tags": ["Aggressive Player", "Tactical Player"],
  "phase_tags": ["Opening Theory", "Middlegame Plans"],
  "complexity": "Intermediate",
  "strategic_themes": ["Kingside Attack", "Fighting for Initiative"],
  "common_plans": ["White aims to...", "Black focuses on..."],
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "level": "Intermediate",
      "rationale": "Why this book is recommended...",
      "url": "https://..."
    }
  ],
  "version": "1.0",
  "last_enriched_at": "2025-11-21T08:00:00.000Z"
}
```

## Best Practices

1. **Start with dry-run**: Always preview changes before running
2. **Use small batches initially**: Test with `--batchSize=5` first
3. **Enable logging**: Use `--logFile` to track progress
4. **Use state files for large jobs**: Enable resume capability with
   `--stateFile`
5. **Monitor API usage**: Check your Google Cloud billing regularly
6. **Back up data**: The script modifies ECO JSON files directly - keep backups

## Related Scripts

- `enrich_course_data.js`: Enriches course data with AI analysis
- `integrate_course_data.js`: Integrates enriched course data
- Other scripts in this directory are unrelated to opening enrichment

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review error logs in `enrich-errors.json`
3. Enable verbose mode for detailed diagnostics: `--verbose`
