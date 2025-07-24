# Tools Directory Structure

This directory contains various tools and utilities for the Chess Trainer project, organized by purpose and usage pattern.

## Directory Structure

```
tools/
├── production/           # Production-ready tools (used in package.json scripts)
├── video-pipeline/       # Video processing pipeline (F04 feature)
├── validation/          # Data validation and quality assurance tools
├── utilities/           # Helper utilities and manual tools
├── analysis/            # Data analysis and research tools
├── debug/               # Development and debugging tools
```

## Video Pipeline (`video-pipeline/`)

Production video processing system for F04 YouTube integration:

- **`run_new_pipeline_fixed.js`** - Main production video pipeline
- **`run_migration.js`** - Database migration and setup
- **`analyze_comprehensive_performance.js`** - Pipeline performance analysis
- **`video-matcher.js`** - Core video matching logic

See `README-PIPELINE.md` for complete usage documentation.

## Production Tools (`production/`)

These tools are used in automated workflows and referenced in `package.json` scripts:

- **`enrich_openings_llm.js`** - LLM enrichment pipeline for F01 feature
  - NPM script: `npm run enrich`
  - Usage: `node tools/production/enrich_openings_llm.js --batchSize=25`

- **`enrich_course_data.js`** - Course enrichment pipeline for F03 feature
  - NPM script: `npm run course:enrich`
  - Usage: `node tools/production/enrich_course_data.js --single "Opening Name"`

- **`integrate_course_data.js`** - Course data integration pipeline for F03 feature
  - NPM script: `npm run course:integrate`
  - Usage: `node tools/production/integrate_course_data.js`

- **`run-channel-first-pipeline.js`** - YouTube video data pipeline for F04 feature
  - NPM script: `npm run videos:channel-first`
  - Usage: `node tools/production/run-channel-first-pipeline.js`

- **`verify_youtube_channels.js`** - YouTube channel verification for F04 feature
  - NPM script: `npm run videos:verify-channels`
  - Usage: `node tools/production/verify_youtube_channels.js`

## Validation Tools (`validation/`)

Quality assurance and data validation tools:

- **`validate_course_data.js`** - Comprehensive course data validation
- **`validate_course_urls.js`** - URL validation for course data
- **`validate_fens.js`** - FEN string validation
- **`validate_video_data.js`** - YouTube video data validation

## Utilities (`utilities/`)

Manual tools and helper utilities:

- **`manual_url_enrichment.js`** - Interactive URL enrichment for course data
- **`research_helper.js`** - Research assistance with automated browser searches
- **`clean_corrupted_analysis.js`** - Clean corrupted analysis data

## Analysis Tools (`analysis/`)

Data analysis and research tools:

- **`analyze_lichess_popularity.py`** - Lichess popularity analysis (F02 feature)
- **`analyze_top_openings.js`** - Opening popularity analysis
- **`check_enrichment_status.py`** - LLM enrichment status checking

## Debug Tools (`debug/`)

Development and debugging utilities:

- **`debug_args.js`** - Command-line argument debugging
- **`debug_llm_response.js`** - LLM response debugging
- **`minimal_test.js`** - Minimal LLM service test
- **`simple_test.js`** - Simple environment test
- **`test_course_analysis.js`** - Course analysis testing
- **`test_llm_service.js`** - LLM service testing

## Migration Notes

**Breaking Changes**: This restructuring moves tools from the root `tools/` directory to categorized subdirectories. All references in:
- `package.json` scripts
- Test files
- Documentation
- Tool internal paths

...have been updated to use the new paths.

## Best Practices

1. **Production Tools**: Keep these stable and well-tested as they're used in CI/CD workflows
2. **Validation Tools**: Use these to ensure data quality before production deployment
3. **Utilities**: Use these for manual data curation and one-off tasks
4. **Analysis Tools**: Use these for research and data insights
5. **Debug Tools**: Use these for development and troubleshooting

## Backward Compatibility

The old flat structure has been preserved temporarily. To complete the migration:

1. Verify all automated workflows use the new paths
2. Update any deployment scripts
3. Remove the old files from the root tools directory
