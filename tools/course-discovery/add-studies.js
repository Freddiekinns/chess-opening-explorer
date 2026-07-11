#!/usr/bin/env node

/**
 * Add Curated Studies Tool (study matching v2)
 *
 * Fetches Lichess studies into a local cache (tools/data/study-cache/), then
 * rebuilds api/data/courses.json from the whole cache with the multi-anchor
 * scored matcher. Because raw PGN+metadata are cached, `--fromCache`
 * (npm run course:rematch) re-scores everything offline with zero API calls.
 *
 * Usage:
 *   node tools/course-discovery/add-studies.js                    # fetch curated list + rebuild
 *   node tools/course-discovery/add-studies.js --includeDiscovered # also fetch discovered-studies.txt
 *   node tools/course-discovery/add-studies.js --fromCache        # offline rebuild only
 *   node tools/course-discovery/add-studies.js --url https://lichess.org/study/abc123
 */

const fs = require('fs');
const path = require('path');
const { fetchStudyPGN, fetchStudyMetadata } = require('./lib/lichess-fetcher');
const { loadECOIndex } = require('./lib/pgn-matcher');
const { writeCourses } = require('./lib/course-merger');
const { loadMatchConfig, buildCoursesIndex } = require('./lib/study-matcher');
const { saveStudy, loadAllStudies, hasStudy, DEFAULT_CACHE_DIR } = require('./lib/study-cache');

// --- Constants ---

const DEFAULT_INPUT_FILE = path.join(__dirname, 'config', 'curated-studies.txt');
const DISCOVERED_INPUT_FILE = path.join(__dirname, 'config', 'discovered-studies.txt');
const DEFAULT_COURSES_PATH = path.join(process.cwd(), 'api', 'data', 'courses.json');
const DEFAULT_STATE_FILE = path.join(__dirname, '.add-studies-state.json');

const STUDY_URL_REGEX = /lichess\.org\/study\/([A-Za-z0-9]+)/;

// --- Logger ---

class Logger {
  constructor(options = {}) {
    this.isVerbose = options.verbose || false;
  }

  info(message) {
    console.log(message);
  }

  verbose(message) {
    if (this.isVerbose) {
      console.log(message);
    }
  }

  error(message) {
    console.error(message);
  }
}

// --- StateManager ---

class StateManager {
  constructor(stateFile) {
    this.stateFile = stateFile;
    this.state = this.load();
  }

  load() {
    if (!this.stateFile || !fs.existsSync(this.stateFile)) {
      return { processedStudies: [], lastRun: null };
    }
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch {
      return { processedStudies: [], lastRun: null };
    }
  }

  save() {
    if (!this.stateFile) return;
    try {
      this.state.lastRun = new Date().toISOString();
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving state: ${error.message}`);
    }
  }

  isProcessed(studyId) {
    return this.state.processedStudies.includes(studyId);
  }

  markProcessed(studyId) {
    if (!this.state.processedStudies.includes(studyId)) {
      this.state.processedStudies.push(studyId);
    }
  }
}

// --- Input Parsing ---

/**
 * Parse a curated studies text file into study entries
 * Format: alternating title/URL lines, with comment lines starting with #
 *
 * @param {string} filePath - Path to the text file
 * @returns {Array<{displayTitle: string, studyId: string}>}
 */
function parseInputFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return parseInputText(content);
}

/**
 * Parse curated studies text content into study entries
 * @param {string} content - Text content with title/URL pairs
 * @returns {Array<{displayTitle: string, studyId: string}>}
 */
function parseInputText(content) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries = [];
  const seenIds = new Set();

  let pendingTitle = null;

  for (const line of lines) {
    // Skip comment lines
    if (line.startsWith('#')) {
      continue;
    }

    const urlMatch = line.match(STUDY_URL_REGEX);
    if (urlMatch) {
      const studyId = urlMatch[1];
      if (!seenIds.has(studyId)) {
        seenIds.add(studyId);
        entries.push({
          displayTitle: pendingTitle || '',
          studyId,
        });
      }
      pendingTitle = null;
    } else {
      // Non-URL, non-comment line is treated as a title for the next URL
      pendingTitle = line;
    }
  }

  return entries;
}

/**
 * Extract a study ID from a Lichess study URL
 * @param {string} url - Lichess study URL
 * @returns {string|null}
 */
function extractStudyId(url) {
  const match = url.match(STUDY_URL_REGEX);
  return match ? match[1] : null;
}

// --- Index building ---

/**
 * Build the v2 courses index from every study in the cache.
 * @param {string} [cacheDir]
 * @param {object} [config]
 * @returns {object} FEN-keyed schema-v2 index
 */
function buildIndexFromCache(cacheDir = DEFAULT_CACHE_DIR, config = loadMatchConfig()) {
  const ecoIndex = loadECOIndex();
  const studies = loadAllStudies(cacheDir);
  return buildCoursesIndex(studies, ecoIndex, config);
}

// --- Pipeline ---

async function run() {
  // Lazy-load yargs to avoid ESM issues when importing this module for testing
  const yargs = require('yargs/yargs');

  const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .option('file', {
      type: 'string',
      describe: 'Path to text file with study URLs',
      default: DEFAULT_INPUT_FILE,
    })
    .option('url', {
      type: 'string',
      describe: 'Single Lichess study URL to add',
    })
    .option('fromCache', {
      type: 'boolean',
      default: false,
      describe: 'Skip all fetching; rebuild courses.json from the local cache only',
    })
    .option('includeDiscovered', {
      type: 'boolean',
      default: false,
      describe: 'Also fetch studies listed in config/discovered-studies.txt',
    })
    .option('refetch', {
      type: 'boolean',
      default: false,
      describe: 'Re-fetch studies that are already in the cache',
    })
    .option('cacheDir', {
      type: 'string',
      default: DEFAULT_CACHE_DIR,
      describe: 'Directory for the raw study cache',
    })
    .option('dryRun', {
      type: 'boolean',
      default: false,
      describe: 'Print what would be written without modifying courses.json',
    })
    .option('limit', {
      type: 'number',
      describe: 'Max studies to fetch',
    })
    .option('verbose', {
      type: 'boolean',
      default: false,
      describe: 'Detailed logging',
    })
    .option('resume', {
      type: 'boolean',
      default: false,
      describe: 'Skip already-processed studies (uses state file)',
    })
    .option('stateFile', {
      type: 'string',
      default: DEFAULT_STATE_FILE,
      describe: 'Path to state file for resume',
    })
    .option('output', {
      type: 'string',
      default: DEFAULT_COURSES_PATH,
      describe: 'Path to courses.json output',
    })
    .help().argv;

  const logger = new Logger({ verbose: argv.verbose });
  const stateManager = argv.resume ? new StateManager(argv.stateFile) : new StateManager(null);

  const stats = {
    studiesFetched: 0,
    studiesSkippedCache: 0,
    studiesSkippedResume: 0,
    studiesFailed: 0,
    errors: [],
  };

  if (!argv.fromCache) {
    // Step 1: Parse input
    logger.info('Step 1: Parsing input...');
    let studies;

    if (argv.url) {
      const studyId = extractStudyId(argv.url);
      if (!studyId) {
        logger.error(`Invalid Lichess study URL: ${argv.url}`);
        process.exit(1);
      }
      studies = [{ displayTitle: '', studyId }];
      logger.info(`  Single study: ${studyId}`);
    } else {
      const inputPath = path.isAbsolute(argv.file) ? argv.file : path.resolve(argv.file);
      studies = parseInputFile(inputPath);
      logger.info(`  Parsed ${studies.length} unique studies from ${argv.file}`);

      if (argv.includeDiscovered && fs.existsSync(DISCOVERED_INPUT_FILE)) {
        const discovered = parseInputFile(DISCOVERED_INPUT_FILE);
        const seen = new Set(studies.map((s) => s.studyId));
        const extra = discovered.filter((s) => !seen.has(s.studyId));
        studies = studies.concat(extra);
        logger.info(`  Added ${extra.length} studies from discovered-studies.txt`);
      }
    }

    if (argv.limit) {
      studies = studies.slice(0, argv.limit);
      logger.info(`  Limited to ${studies.length} studies`);
    }

    // Step 2: Fetch into cache
    logger.info('Step 2: Fetching studies into the cache...');

    for (let i = 0; i < studies.length; i++) {
      const { studyId, displayTitle } = studies[i];

      if (argv.resume && stateManager.isProcessed(studyId)) {
        logger.verbose(`  [${i + 1}/${studies.length}] Skipping ${studyId} (already processed)`);
        stats.studiesSkippedResume++;
        continue;
      }

      if (!argv.refetch && hasStudy(argv.cacheDir, studyId)) {
        logger.verbose(`  [${i + 1}/${studies.length}] Skipping ${studyId} (cached)`);
        stats.studiesSkippedCache++;
        stateManager.markProcessed(studyId);
        continue;
      }

      logger.verbose(
        `  [${i + 1}/${studies.length}] Fetching ${studyId}${displayTitle ? ` (${displayTitle})` : ''}...`
      );

      try {
        const metadata = await fetchStudyMetadata(studyId);
        if (!metadata) {
          logger.verbose(`    Study ${studyId} not found (404)`);
          stats.studiesFailed++;
          stateManager.markProcessed(studyId);
          stateManager.save();
          continue;
        }

        const pgn = await fetchStudyPGN(studyId);
        if (!pgn) {
          logger.verbose(`    No PGN available for ${studyId}`);
          stats.studiesFailed++;
          stateManager.markProcessed(studyId);
          stateManager.save();
          continue;
        }

        saveStudy(argv.cacheDir, {
          studyId,
          name: metadata.name || displayTitle || 'Untitled',
          author: metadata.owner || '',
          likes: metadata.likes || 0,
          pgn,
          fetched_at: new Date().toISOString(),
          source: 'curated',
        });

        stats.studiesFetched++;
        stateManager.markProcessed(studyId);
        stateManager.save();

        if (stats.studiesFetched % 50 === 0) {
          logger.info(`  Progress: ${i + 1}/${studies.length} studies handled`);
        }
      } catch (error) {
        stats.studiesFailed++;
        stats.errors.push({ studyId, error: error.message });
        logger.error(`    Error fetching ${studyId}: ${error.message}`);
        stateManager.markProcessed(studyId);
        stateManager.save();
      }
    }
  } else {
    logger.info('Step 1-2: Skipping fetch (--fromCache)');
  }

  // Step 3: Rebuild the index from the whole cache
  logger.info('Step 3: Matching cached studies against the ECO database...');
  const cachedStudies = loadAllStudies(argv.cacheDir);
  logger.info(`  Cache contains ${cachedStudies.length} studies`);

  const config = loadMatchConfig();
  const index = buildIndexFromCache(argv.cacheDir, config);
  const entryCount = Object.values(index).flat().length;

  // Step 4: Write
  if (argv.dryRun) {
    logger.info('Step 4: DRY RUN - would write the following:');
    logger.info(`  Total entries: ${entryCount} across ${Object.keys(index).length} FENs`);
    const sampleFens = Object.keys(index).slice(0, 5);
    for (const fen of sampleFens) {
      const entries = index[fen];
      logger.info(`    ${fen.substring(0, 50)}... (${entries.length} entries)`);
      for (const entry of entries.slice(0, 2)) {
        logger.info(
          `      - ${entry.study_title} [${entry.match.reason} ${entry.match.score}] (${entry.likes} likes)`
        );
      }
    }
  } else {
    logger.info('Step 4: Writing courses.json...');
    writeCourses(argv.output, index);
    logger.info(`  Written ${entryCount} entries to ${argv.output}`);
  }

  // Step 5: Summary
  logger.info('\n--- Summary ---');
  logger.info(`Studies fetched: ${stats.studiesFetched}`);
  logger.info(`Studies skipped (cache hit): ${stats.studiesSkippedCache}`);
  logger.info(`Studies skipped (resume): ${stats.studiesSkippedResume}`);
  logger.info(`Studies failed: ${stats.studiesFailed}`);
  logger.info(`Studies in cache: ${cachedStudies.length}`);
  logger.info(`Pages populated: ${Object.keys(index).length}`);
  logger.info(`Entries written: ${entryCount}`);

  if (stats.errors.length > 0) {
    logger.info(`\nErrors: ${stats.errors.length}`);
    for (const err of stats.errors) {
      logger.info(`  ${err.studyId}: ${err.error}`);
    }
  }
}

// Export for testing
module.exports = {
  parseInputFile,
  parseInputText,
  extractStudyId,
  buildIndexFromCache,
  Logger,
  StateManager,
  DEFAULT_INPUT_FILE,
  DISCOVERED_INPUT_FILE,
  DEFAULT_COURSES_PATH,
  STUDY_URL_REGEX,
};

// Run if executed directly
if (require.main === module) {
  run().catch((error) => {
    console.error('Import failed:', error.message);
    process.exit(1);
  });
}
