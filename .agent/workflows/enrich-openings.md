---
description: Run LLM enrichment pipeline for chess openings
---

This workflow enriches chess opening data with AI-generated analysis and
explanations.

## Prerequisites

- Ensure `.env` file has `GOOGLE_APPLICATION_CREDENTIALS_JSON` set
- The API key must be connected to a **paid Google Cloud account** with billing
  enabled

## Steps

### 1. Check current enrichment status

```bash
node tools/llm-enrichment/enrich_openings_llm.js --dryRun --batchSize=10
```

This shows what openings would be enriched without making changes.

// turbo

### 2. Run enrichment for a small batch (recommended first run)

```bash
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=10
```

### 3. For larger batches (after testing)

```bash
node tools/llm-enrichment/enrich_openings_llm.js --batchSize=50
```

### 4. To enrich specific ECO codes only

```bash
node tools/llm-enrichment/enrich_openings_llm.js --ecoCode=B --batchSize=25
```

(e.g., `B` for all Sicilian variations)

### 5. To resume a previous run (with state file)

```bash
node tools/llm-enrichment/enrich_openings_llm.js --resume --stateFile=enrich-state.json --batchSize=50
```

### 6. For verbose logging

```bash
node tools/llm-enrichment/enrich_openings_llm.js --verbose --logFile=enrich.log --batchSize=25
```

## Common Options

- `--batchSize=N` - Number of openings to process (1-1000)
- `--dryRun` - Preview what would be enriched without making changes
- `--ecoCode=X` - Filter by ECO code (e.g., A00, B, C50)
- `--excludeEco=X,Y` - Exclude specific ECO codes
- `--limit=N` - Maximum total enrichments to perform
- `--resume` - Resume from previous run
- `--verbose` - Enable detailed logging
- `--quiet` - Minimal output (errors only)

## Notes

- The script automatically retries failed enrichments up to 3 times
- Errors are logged to `enrich-errors.json`
- Run multiple times to process all openings (check the output for "pending
  enrichment" count)
