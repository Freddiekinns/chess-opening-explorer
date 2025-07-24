# Archive Inventory - Video Pipeline Cleanup

**Cleanup Date**: July 20, 2025  
**Cleanup Scope**: Complete project reorganization post-pipeline overhaul

## Archived Analysis Scripts

**Location**: `archive/analysis-scripts/`

| Script | Last Modified | Purpose | Reason for Archive |
|--------|---------------|---------|-------------------|
| `analyze_deep_dive.js` | Jul 20 10:58 | Deep pattern investigation | Superseded by comprehensive analysis |
| `analyze_families.js` | Jul 20 03:42 | ECO family analysis | Integrated into main analysis |
| `analyze_improved_results.js` | Jul 20 10:46 | Before/after comparison | Historical validation completed |
| `analyze_pipeline_performance.js` | Jul 20 10:58 | Performance metrics | Merged into comprehensive version |
| `analyze_rejections.js` | Jul 20 01:45 | Debug rejection reasons | Quality issues resolved |
| `analyze_video_pipeline.js` | Jul 20 10:46 | General pipeline analysis | Replaced by comprehensive analysis |
| `analyze_videos.js` | Jul 20 01:45 | Basic video analysis | Early development tool |

## Archived Development Scripts

**Location**: `archive/development-scripts/`

### Debug Scripts
- `debug_agadmator.js` - Agadmator-specific analysis
- `debug_family_matching.js` - ECO family conflict debugging  
- `debug_matching.js` - General matching debugging
- `debug_pipeline.js` - Pipeline flow debugging

### Test Scripts
- `test_api_results.js` - API response validation
- `test_fixed_scoring.js` - Scoring algorithm testing
- `test_improved_matcher.js` - Matcher component testing
- `test_prefilter.js` - Pre-filter validation

### Fix Scripts
- `fix_database_fens.js` - FEN format corrections
- `fix_duplicates.js` - Duplicate record cleanup
- `fix_opening_ids.js` - Opening ID standardization

### Utility Scripts
- `check_data.js` - Data integrity verification
- `check_quality.js` - Quality metric validation
- `populate_openings.js` - Opening database population
- `regenerate_api.js` - API response regeneration
- `review_creator_quality.js` - Creator performance review

### Old Pipeline Versions
- `run_new_pipeline.js` - Previous pipeline version
- `run_pipeline.js` - Legacy pipeline implementation

## Archived Data Files

**Location**: `data/archive/pre-cleanup/`

| File | Size | Description | Replacement |
|------|------|-------------|-------------|
| `video_enrichment_cache.json` | 7.3MB | Legacy video cache | `videos.sqlite` (1.7MB) |
| `enrichment_cache.json` | 537B | Old enrichment cache | Integrated into database |
| `channel_first_results.json` | 443B | Channel indexing results | Database-based tracking |

## Archived Documentation

**Location**: `docs/archive/outdated/`

- `PRD-F04-YouTube-Video-Data-Pipeline.md` - Original product requirements
- `IMPL-F04-YouTube-Video-Data-Pipeline.md` - Implementation documentation  
- `PIPELINE-OVERHAUL-PLAN-SIMPLIFIED.md` - Overhaul planning document
- `PIPELINE-OVERHAUL-COMPLETION-SUMMARY.md` - Completion summary

## Archive Rationale

### Why These Files Were Archived

1. **Completed Development Cycle**: The pipeline overhaul is complete and production-ready
2. **Quality Mission Accomplished**: NFL contamination and quality issues resolved
3. **Code Maintainability**: Reduced cognitive load for future developers
4. **Clear Current State**: Only active, production-ready components remain
5. **Historical Preservation**: All development work preserved for future reference

### What Remains Active

**Root Directory**:
- `run_new_pipeline_fixed.js` - Production pipeline
- `run_migration.js` - Database migration utility
- `analyze_comprehensive_performance.js` - Current analysis tool

**Supporting Infrastructure**:
- `tools/video-pipeline/` - Core pipeline components
- `tools/database/` - Database management utilities
- `config/` - Configuration files
- `data/videos.sqlite` - Production database

## Recovery Instructions

If any archived file needs to be restored:

```bash
# Example: Restore a specific analysis script
cp archive/analysis-scripts/analyze_deep_dive.js ./

# Example: Restore all test scripts
cp archive/development-scripts/test_*.js ./
```

## Archive Benefits

1. **Clean Workspace**: Root directory only contains active production files
2. **Clear Intent**: New developers immediately understand current architecture
3. **Preserved History**: Complete development history available for reference
4. **Focused Development**: No confusion about which scripts are current
5. **Easy Navigation**: Production vs. development artifacts clearly separated

This cleanup represents the successful completion of the video pipeline overhaul project, transitioning from development mode to production maintenance mode.
