#!/usr/bin/env node

/**
 * Add Curated Studies Tool
 * Imports Lichess study URLs into courses.json with chapter-level opening matching.
 * Supports bulk import from a text file or single URL addition.
 *
 * Usage:
 *   node tools/course-discovery/add-studies.js --file config/curated-studies.txt --dryRun
 *   node tools/course-discovery/add-studies.js --url https://lichess.org/study/abc123
 *   node tools/course-discovery/add-studies.js --resume
 */

const fs = require('fs');
const path = require('path');
const { fetchStudyPGN, fetchStudyMetadata } = require('./lib/lichess-fetcher');
const {
  splitPGNIntoChapters,
  generateFENsFromPGN,
  matchFENsToOpenings,
  loadECOIndex,
} = require('./lib/pgn-matcher');
const { loadExistingCourses, writeCourses } = require('./lib/course-merger');

// --- Constants ---

const DEFAULT_INPUT_FILE = path.join(__dirname, 'config', 'curated-studies.txt');
const DEFAULT_COURSES_PATH = path.join(
  process.cwd(),
  'packages',
  'api',
  'src',
  'data',
  'courses.json'
);
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
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
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
    .option('dryRun', {
      type: 'boolean',
      default: false,
      describe: 'Print what would be written without modifying files',
    })
    .option('limit', {
      type: 'number',
      describe: 'Max studies to process',
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
    .option('replaceCurated', {
      type: 'boolean',
      default: false,
      describe: 'Clear existing curated entries before import',
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
  }

  if (argv.limit) {
    studies = studies.slice(0, argv.limit);
    logger.info(`  Limited to ${studies.length} studies`);
  }

  // Step 2: Load ECO index
  logger.info('Step 2: Loading ECO opening database...');
  const ecoIndex = loadECOIndex();
  logger.info(`  Loaded ${ecoIndex.size} opening positions`);

  // Step 3: Process studies
  logger.info('Step 3: Processing studies...');
  const discovered = {};
  const stats = {
    studiesProcessed: 0,
    studiesSkipped: 0,
    studiesFailed: 0,
    studiesNoMatch: 0,
    chaptersParsed: 0,
    chaptersMatched: 0,
    totalLikes: 0,
    errors: [],
  };

  for (let i = 0; i < studies.length; i++) {
    const { studyId, displayTitle } = studies[i];

    if (argv.resume && stateManager.isProcessed(studyId)) {
      logger.verbose(`  [${i + 1}/${studies.length}] Skipping ${studyId} (already processed)`);
      stats.studiesSkipped++;
      continue;
    }

    logger.verbose(`  [${i + 1}/${studies.length}] Processing ${studyId}${displayTitle ? ` (${displayTitle})` : ''}...`);

    try {
      // Fetch metadata (name, likes, owner)
      const metadata = await fetchStudyMetadata(studyId);
      if (!metadata) {
        logger.verbose(`    Study ${studyId} not found (404)`);
        stats.studiesFailed++;
        stateManager.markProcessed(studyId);
        stateManager.save();
        continue;
      }

      const studyName = metadata.name || displayTitle || 'Untitled';
      const likes = metadata.likes || 0;
      const author = metadata.owner || '';
      stats.totalLikes += likes;

      logger.verbose(`    "${studyName}" by ${author} (${likes} likes)`);

      // Fetch PGN
      const pgn = await fetchStudyPGN(studyId);
      if (!pgn) {
        logger.verbose(`    No PGN available for ${studyId}`);
        stats.studiesFailed++;
        stateManager.markProcessed(studyId);
        stateManager.save();
        continue;
      }

      // Split into chapters and match
      const chapters = splitPGNIntoChapters(pgn);
      let matchedAny = false;

      for (const chapter of chapters) {
        stats.chaptersParsed++;

        const fens = generateFENsFromPGN(chapter.pgn);
        if (fens.length === 0) continue;

        const match = matchFENsToOpenings(fens, ecoIndex);
        if (!match) continue;

        stats.chaptersMatched++;
        matchedAny = true;

        const entry = {
          course_title: `${studyName} - ${chapter.chapterName}`,
          author,
          platform: 'Lichess',
          source_url: chapter.chapterId
            ? `https://lichess.org/study/${studyId}/${chapter.chapterId}`
            : `https://lichess.org/study/${studyId}`,
          anchor_fens: [match.fen],
          curated: true,
          likes,
          discovered_at: new Date().toISOString(),
        };

        if (!discovered[match.fen]) {
          discovered[match.fen] = [];
        }
        discovered[match.fen].push(entry);

        logger.verbose(`      "${chapter.chapterName}" -> ${match.name} (${match.eco})`);
      }

      if (!matchedAny) {
        stats.studiesNoMatch++;
        logger.verbose(`    No chapters matched any opening for "${studyName}"`);
      }

      stats.studiesProcessed++;
      stateManager.markProcessed(studyId);
      stateManager.save();

      // Progress update every 50 studies
      if (stats.studiesProcessed % 50 === 0) {
        logger.info(`  Progress: ${stats.studiesProcessed}/${studies.length} studies, ${stats.chaptersMatched} chapters matched`);
      }
    } catch (error) {
      stats.studiesFailed++;
      stats.errors.push({ studyId, error: error.message });
      logger.error(`    Error processing ${studyId}: ${error.message}`);
      stateManager.markProcessed(studyId);
      stateManager.save();
    }
  }

  // Step 4: Merge with existing data
  logger.info('Step 4: Merging with existing courses.json...');
  const existing = loadExistingCourses(argv.output);
  const existingCount = Object.values(existing).flat().length;
  logger.info(`  Existing entries: ${existingCount} (${Object.keys(existing).length} FENs)`);

  const discoveredCount = Object.values(discovered).flat().length;
  logger.info(`  New curated entries: ${discoveredCount} across ${Object.keys(discovered).length} FENs`);

  // Build merged result
  const merged = {};

  // Keep entries from existing that should survive
  for (const [fen, courses] of Object.entries(existing)) {
    const kept = courses.filter((c) => {
      // Always drop auto_discovered entries
      if (c.auto_discovered === true) return false;
      // If --replaceCurated, also drop existing curated entries
      if (argv.replaceCurated && c.curated === true) return false;
      // Keep everything else (manual entries without either flag)
      return true;
    });
    if (kept.length > 0) {
      merged[fen] = kept;
    }
  }

  // Add new curated entries
  for (const [fen, courses] of Object.entries(discovered)) {
    if (!merged[fen]) {
      merged[fen] = [];
    }
    merged[fen].push(...courses);
  }

  const mergedCount = Object.values(merged).flat().length;

  // Step 5: Write
  if (argv.dryRun) {
    logger.info('Step 5: DRY RUN - would write the following:');
    logger.info(`  Total entries: ${mergedCount} across ${Object.keys(merged).length} FENs`);
    logger.info(`  Sample entries:`);
    const sampleFens = Object.keys(discovered).slice(0, 5);
    for (const fen of sampleFens) {
      const entries = discovered[fen];
      logger.info(`    ${fen.substring(0, 50)}... (${entries.length} entries)`);
      for (const entry of entries.slice(0, 2)) {
        logger.info(`      - ${entry.course_title} (${entry.likes} likes)`);
      }
    }
  } else {
    logger.info('Step 5: Writing courses.json...');
    writeCourses(argv.output, merged);
    logger.info(`  Written ${mergedCount} entries to ${argv.output}`);
  }

  // Step 6: Summary
  logger.info('\n--- Summary ---');
  logger.info(`Studies processed: ${stats.studiesProcessed}`);
  logger.info(`Studies skipped (resume): ${stats.studiesSkipped}`);
  logger.info(`Studies failed: ${stats.studiesFailed}`);
  logger.info(`Studies with no opening match: ${stats.studiesNoMatch}`);
  logger.info(`Chapters parsed: ${stats.chaptersParsed}`);
  logger.info(`Chapters matched to openings: ${stats.chaptersMatched}`);
  logger.info(`Unique FENs populated: ${Object.keys(discovered).length}`);
  logger.info(`Total likes across studies: ${stats.totalLikes}`);
  logger.info(`Final courses.json entries: ${mergedCount}`);

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
  Logger,
  StateManager,
  DEFAULT_INPUT_FILE,
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
