#!/usr/bin/env node

/**
 * Course Discovery Pipeline
 * Fetches Lichess studies from known educators, matches chapters to openings
 * by FEN, and merges results into courses.json
 *
 * Usage:
 *   node tools/course-discovery/index.js --dryRun --limit=1
 *   node tools/course-discovery/index.js --author=Fins --verbose
 *   node tools/course-discovery/index.js --resume
 */

const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const { fetchStudyList, fetchStudyPGN } = require('./lib/lichess-fetcher');
const {
  splitPGNIntoChapters,
  generateFENsFromPGN,
  matchFENsToOpenings,
  loadECOIndex,
} = require('./lib/pgn-matcher');
const { loadExistingCourses, mergeDiscoveries, writeCourses } = require('./lib/course-merger');

// --- Logger (adapted from tools/llm-enrichment/enrich_openings_llm.js) ---

class Logger {
  constructor(options = {}) {
    this.isVerbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.logFile = options.logFile || null;

    if (this.logFile) {
      fs.writeFileSync(this.logFile, '', 'utf8');
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.logFile) {
      fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
    }

    if (this.quiet && level !== 'error') return;

    if (level === 'error') {
      console.error(message);
    } else if (level === 'verbose' && this.isVerbose) {
      console.log(message);
    } else if (level === 'info') {
      console.log(message);
    }
  }

  info(message) {
    this.log(message, 'info');
  }
  verbose(message) {
    this.log(message, 'verbose');
  }
  error(message) {
    this.log(message, 'error');
  }
}

// --- StateManager (adapted from tools/llm-enrichment/enrich_openings_llm.js) ---

class StateManager {
  constructor(stateFile) {
    this.stateFile = stateFile;
    this.state = this.load();
  }

  load() {
    if (!this.stateFile || !fs.existsSync(this.stateFile)) {
      return { processedAuthors: [], lastRun: null };
    }

    try {
      const data = fs.readFileSync(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { processedAuthors: [], lastRun: null };
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

  isProcessed(username) {
    return this.state.processedAuthors.includes(username);
  }

  markProcessed(username) {
    if (!this.state.processedAuthors.includes(username)) {
      this.state.processedAuthors.push(username);
    }
  }
}

// --- Pipeline ---

async function run() {
  const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .option('dryRun', {
      type: 'boolean',
      default: false,
      describe: 'Print what would be written without modifying files',
    })
    .option('limit', {
      type: 'number',
      describe: 'Max authors to process',
    })
    .option('author', {
      type: 'string',
      describe: 'Process a single author only',
    })
    .option('verbose', {
      type: 'boolean',
      default: false,
      describe: 'Detailed logging',
    })
    .option('quiet', {
      type: 'boolean',
      default: false,
      describe: 'Minimal output',
    })
    .option('resume', {
      type: 'boolean',
      default: false,
      describe: 'Skip already-processed authors',
    })
    .option('stateFile', {
      type: 'string',
      default: path.join(__dirname, '.state.json'),
      describe: 'Path to state file for resume',
    })
    .help().argv;

  const logger = new Logger({ verbose: argv.verbose, quiet: argv.quiet });
  const stateManager = argv.resume ? new StateManager(argv.stateFile) : new StateManager(null);

  // Step 1: Load config
  logger.info('Step 1: Loading author config...');
  const configPath = path.join(__dirname, 'config', 'authors.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  let authors = config.authors;
  if (argv.author) {
    authors = authors.filter((a) => a.username.toLowerCase() === argv.author.toLowerCase());
    if (authors.length === 0) {
      logger.error(
        `Author "${argv.author}" not found in config. Available: ${config.authors.map((a) => a.username).join(', ')}`
      );
      process.exit(1);
    }
  }
  if (argv.limit) {
    authors = authors.slice(0, argv.limit);
  }
  logger.info(`  Authors to process: ${authors.map((a) => a.username).join(', ')}`);

  // Step 2: Load ECO index
  logger.info('Step 2: Loading ECO opening database...');
  const ecoIndex = loadECOIndex();
  logger.info(`  Loaded ${ecoIndex.size} opening positions`);

  // Step 3: Load existing courses
  logger.info('Step 3: Loading existing courses.json...');
  const coursesPath = path.join(process.cwd(), 'packages', 'api', 'src', 'data', 'courses.json');
  const existing = loadExistingCourses(coursesPath);
  const existingCount = Object.values(existing).flat().length;
  logger.info(`  Existing entries: ${existingCount} (${Object.keys(existing).length} FENs)`);

  // Step 4: Process authors
  logger.info('Step 4: Discovering studies from Lichess authors...');
  const discovered = {};
  const stats = {
    authorsProcessed: 0,
    authorsSkipped: 0,
    studiesFetched: 0,
    chaptersParsed: 0,
    chaptersMatched: 0,
    errors: [],
  };

  for (const author of authors) {
    const { username, note } = author;

    if (argv.resume && stateManager.isProcessed(username)) {
      logger.verbose(`  Skipping ${username} (already processed)`);
      stats.authorsSkipped++;
      continue;
    }

    logger.info(`  Processing: ${username}${note ? ` (${note})` : ''}`);

    try {
      const studies = await fetchStudyList(username);
      logger.verbose(`    Found ${studies.length} studies`);

      for (const study of studies) {
        try {
          const pgn = await fetchStudyPGN(study.id);
          if (!pgn) {
            logger.verbose(`    Skipping study ${study.id} (no PGN)`);
            continue;
          }

          stats.studiesFetched++;
          const chapters = splitPGNIntoChapters(pgn);
          logger.verbose(`    Study "${study.name}": ${chapters.length} chapters`);

          for (const chapter of chapters) {
            stats.chaptersParsed++;
            const fens = generateFENsFromPGN(chapter.pgn);
            if (fens.length === 0) continue;

            const match = matchFENsToOpenings(fens, ecoIndex);
            if (!match) continue;

            stats.chaptersMatched++;
            const entry = {
              course_title: `${study.name} - ${chapter.chapterName}`,
              author: username,
              platform: 'Lichess',
              source_url: chapter.chapterId
                ? `https://lichess.org/study/${study.id}/${chapter.chapterId}`
                : `https://lichess.org/study/${study.id}`,
              anchor_fens: [match.fen],
              auto_discovered: true,
              discovered_at: new Date().toISOString(),
            };

            if (!discovered[match.fen]) {
              discovered[match.fen] = [];
            }
            discovered[match.fen].push(entry);

            logger.verbose(
              `      Matched: "${chapter.chapterName}" -> ${match.name} (${match.eco})`
            );
          }
        } catch (error) {
          stats.errors.push({ study: study.id, error: error.message });
          logger.verbose(`    Error processing study ${study.id}: ${error.message}`);
        }
      }

      stats.authorsProcessed++;
      stateManager.markProcessed(username);
      stateManager.save();
    } catch (error) {
      stats.errors.push({ author: username, error: error.message });
      logger.error(`  Error processing ${username}: ${error.message}`);
    }
  }

  // Step 5: Merge
  logger.info('Step 5: Merging discoveries...');
  const discoveredCount = Object.values(discovered).flat().length;
  logger.info(
    `  Discovered ${discoveredCount} entries across ${Object.keys(discovered).length} FENs`
  );

  const merged = mergeDiscoveries(existing, discovered);
  const mergedCount = Object.values(merged).flat().length;

  // Step 6: Write
  if (argv.dryRun) {
    logger.info('Step 6: DRY RUN - would write the following:');
    logger.info(`  Total entries: ${mergedCount} across ${Object.keys(merged).length} FENs`);
    logger.info(`  New auto-discovered: ${discoveredCount}`);
    logger.info(`  Sample entries:`);
    const sampleFens = Object.keys(discovered).slice(0, 3);
    for (const fen of sampleFens) {
      const entries = discovered[fen];
      logger.info(`    ${fen.substring(0, 40)}... (${entries.length} entries)`);
      for (const entry of entries.slice(0, 2)) {
        logger.info(`      - ${entry.course_title}`);
      }
    }
  } else {
    logger.info('Step 6: Writing courses.json...');
    writeCourses(coursesPath, merged);
    logger.info(`  Written ${mergedCount} entries to ${coursesPath}`);
  }

  // Step 7: Summary
  logger.info('\n--- Summary ---');
  logger.info(`Authors processed: ${stats.authorsProcessed}`);
  logger.info(`Authors skipped (resume): ${stats.authorsSkipped}`);
  logger.info(`Studies fetched: ${stats.studiesFetched}`);
  logger.info(`Chapters parsed: ${stats.chaptersParsed}`);
  logger.info(`Chapters matched to openings: ${stats.chaptersMatched}`);
  logger.info(`Total entries in courses.json: ${mergedCount}`);
  if (stats.errors.length > 0) {
    logger.info(`Errors: ${stats.errors.length}`);
    for (const err of stats.errors) {
      logger.verbose(`  ${JSON.stringify(err)}`);
    }
  }
}

run().catch((error) => {
  console.error('Pipeline failed:', error.message);
  process.exit(1);
});
