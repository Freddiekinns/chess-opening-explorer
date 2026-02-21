#!/usr/bin/env node

/**
 * Discover Popular Lichess Studies
 * Searches Lichess for popular studies (500+ likes) related to chess openings.
 * Cross-references against existing curated-studies.txt to find new ones.
 *
 * Uses the Lichess study search API with multiple opening-related search terms,
 * filters out non-opening content, and outputs a list of new discoveries.
 *
 * Usage:
 *   node tools/course-discovery/discover-popular.js --dryRun
 *   node tools/course-discovery/discover-popular.js --minLikes 1000
 *   node tools/course-discovery/discover-popular.js --append
 */

const fs = require('fs');
const path = require('path');

// --- Constants ---

const LICHESS_BASE = 'https://lichess.org';
const MIN_DELAY_MS = 1500; // Conservative rate limit for search endpoint
const RESULTS_PER_PAGE = 16;

const DEFAULT_MIN_LIKES = 500;
const DEFAULT_CURATED_FILE = path.join(__dirname, 'config', 'curated-studies.txt');
const DEFAULT_OUTPUT_FILE = path.join(__dirname, 'config', 'discovered-studies.txt');

// Search terms that broadly cover opening-related studies
const SEARCH_TERMS = [
  'opening',
  'defense',
  'defence',
  'gambit',
  'variation',
  'system',
  'attack',
  'sicilian',
  'french defense',
  'caro-kann',
  'italian game',
  'ruy lopez',
  'london system',
  "king's indian",
  "queen's gambit",
  'english opening',
  'dutch defense',
  'nimzo-indian',
  'grunfeld',
  'pirc',
  'alekhine',
  'petroff',
  'scotch game',
  'vienna game',
  'catalan',
  'benoni',
  'berlin defense',
  'scandinavian',
  'philidor',
  "king's gambit",
  'evans gambit',
  'slav defense',
  'semi-slav',
  'najdorf',
  'dragon',
  'trompowsky',
  'torre attack',
  'bird opening',
  'réti opening',
  'benko gambit',
  'modern defense',
  'grob',
  'polish opening',
  'budapest gambit',
  'chigorin',
  'tarrasch',
];

// Title keywords that indicate NON-opening content
const EXCLUDE_TITLE_PATTERNS = [
  /\bendgame/i,
  /\bend\s*game/i,
  /\bpuzzle/i,
  /\bmate\s+in\s+\d/i,
  /\bcheckmate\s+pattern/i,
  /\bcheckmate\s+tutorial/i,
  /\bimprove\s+your\s+chess/i,
  /\bchess\s+tip/i,
  /\bthinking\s+training/i,
  /\bmistake/i,
  /\bhow\s+to\s+analyze/i,
  /\bstrategy\s+guide/i,
  /\bpositional\s+play$/i,
  /\bworld\s+championship/i,
  /\bimmort(al)?\s+game/i,
  /\bbest\s+game/i,
  /\bbrilliancy/i,
  /\btournament\s+game/i,
  /\bman\s+vs\s+machine/i,
  /\bangel\s+of\s+death/i,
  /\batomic/i,
  /\b960\b/i,
  /\bfischer\s*random/i,
  /\bcrazyhouse/i,
  /\bantichess/i,
  /\bhorde/i,
  /\bracing\s+kings/i,
  /\bking\s+of\s+the\s+hill/i,
  /\bthree.check/i,
  /\bsteps?\s+to\s+improve/i,
];

// Title keywords that strongly indicate opening content (whitelist)
const INCLUDE_TITLE_PATTERNS = [
  /\bopening/i,
  /\bdefen[sc]e/i,
  /\bgambit/i,
  /\bvariation/i,
  /\bsystem\b/i,
  /\battack\b/i,
  /\brepertoire/i,
  /\be[1-4]\b/i,
  /\bd[1-4]\b/i,
  /\bc[1-4]\b/i,
  /\bnf[1-3]\b/i,
  /\bsicilian/i,
  /\bfrench\b/i,
  /\bcaro.kann/i,
  /\bitalian/i,
  /\bruy\s+lopez/i,
  /\blondon/i,
  /\bking'?s?\s+indian/i,
  /\bqueen'?s?\s+gambit/i,
  /\benglish\b/i,
  /\bdutch\b/i,
  /\bnimzo/i,
  /\bgr[uü]nfeld/i,
  /\bpirc/i,
  /\balekhine/i,
  /\bpetroff/i,
  /\bscotch/i,
  /\bvienna/i,
  /\bcatalan/i,
  /\bbenoni/i,
  /\bberlin\b/i,
  /\bscandinavian/i,
  /\bphilidor/i,
  /\bevans/i,
  /\bslav/i,
  /\bnajdorf/i,
  /\bdragon/i,
  /\btrompowsky/i,
  /\btorre/i,
  /\bbird\b/i,
  /\br[eé]ti/i,
  /\bbenko/i,
  /\bmodern\b/i,
  /\bgrob/i,
  /\bbudapest/i,
  /\bchigorin/i,
  /\btarrasch/i,
  /\bclosed\b/i,
  /\bopen\b/i,
  /\brap(id)?\s+improvement/i,
  /\btrap/i,
  /\brefut/i,
  /\bcrush/i,
  /\bbeat\b/i,
  /\bagainst\b/i,
  /\banti-/i,
  /\bpawn\s+structure/i,
  /\bmiddlegame\s+plan/i,
];

// --- Utility ---

let lastRequestTime = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await sleep(MIN_DELAY_MS - elapsed);
  }
  lastRequestTime = Date.now();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 429) {
    console.warn('  Rate limited — waiting 60s...');
    await sleep(60000);
    lastRequestTime = Date.now();
    return fetch(url, { headers: { Accept: 'application/json' } });
  }
  return response;
}

// --- Search API ---

/**
 * Search Lichess studies by query term, sorted by popular.
 * Paginates until likes drop below minLikes.
 * @param {string} query - Search term
 * @param {number} minLikes - Minimum likes threshold
 * @returns {Promise<Map<string, object>>} Map of study ID to study data
 */
async function searchStudies(query, minLikes) {
  const studies = new Map();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${LICHESS_BASE}/study/search?q=${encodedQuery}&order=popular&page=${page}`;

    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      console.warn(`  Search "${query}" page ${page}: HTTP ${response.status}`);
      break;
    }

    const data = await response.json();
    const paginator = data.paginator;

    if (!paginator || !paginator.currentPageResults?.length) {
      break;
    }

    let belowThreshold = false;
    for (const study of paginator.currentPageResults) {
      if (study.likes >= minLikes) {
        studies.set(study.id, {
          id: study.id,
          name: study.name,
          likes: study.likes,
          owner: study.owner?.name || study.owner?.id || 'unknown',
          chapters: study.chapters || [],
          topics: study.topics || [],
        });
      } else {
        belowThreshold = true;
      }
    }

    // Stop if the minimum on this page is below threshold, or no more pages
    if (belowThreshold || !paginator.nextPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return studies;
}

// --- Filtering ---

/**
 * Check if a study looks like it's opening-related based on title and topics.
 * @param {object} study
 * @returns {{ included: boolean, reason: string }}
 */
function classifyStudy(study) {
  const name = study.name || '';
  const topics = (study.topics || []).join(' ');
  const combined = `${name} ${topics}`;

  // Check exclusion patterns first
  for (const pattern of EXCLUDE_TITLE_PATTERNS) {
    if (pattern.test(name)) {
      return { included: false, reason: `excluded: "${name}" matches ${pattern}` };
    }
  }

  // Check inclusion patterns
  for (const pattern of INCLUDE_TITLE_PATTERNS) {
    if (pattern.test(combined)) {
      return { included: true, reason: 'title/topic match' };
    }
  }

  // Check topics for opening-related keywords
  const openingTopics = ['openings', 'opening theory', 'opening', 'defenses'];
  for (const topic of study.topics || []) {
    if (openingTopics.includes(topic.toLowerCase())) {
      return { included: true, reason: `topic: "${topic}"` };
    }
  }

  return { included: false, reason: 'no opening signal in title/topics' };
}

// --- Input Parsing ---

/**
 * Load existing curated study IDs from curated-studies.txt
 * @param {string} filePath
 * @returns {Set<string>}
 */
function loadExistingIds(filePath) {
  const ids = new Set();
  if (!fs.existsSync(filePath)) return ids;

  const content = fs.readFileSync(filePath, 'utf-8');
  const urlRegex = /lichess\.org\/study\/([A-Za-z0-9]+)/;
  for (const line of content.split('\n')) {
    const match = line.match(urlRegex);
    if (match) ids.add(match[1]);
  }
  return ids;
}

// --- Output ---

/**
 * Format discovered studies for appending to curated-studies.txt
 * @param {object[]} studies
 * @returns {string}
 */
function formatForCuratedFile(studies) {
  const lines = [
    '',
    '# --- Auto-discovered popular studies ---',
    `# Discovered on ${new Date().toISOString().split('T')[0]}`,
    '',
  ];
  for (const study of studies) {
    lines.push(`${study.name}`);
    lines.push(`https://lichess.org/study/${study.id}`);
  }
  return lines.join('\n');
}

// --- Main ---

async function run() {
  // Lazy-load yargs for CJS compatibility
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');

  const argv = yargs(hideBin(process.argv))
    .option('minLikes', {
      type: 'number',
      default: DEFAULT_MIN_LIKES,
      describe: 'Minimum likes threshold',
    })
    .option('dryRun', {
      type: 'boolean',
      default: false,
      describe: 'Show results without writing files',
    })
    .option('append', {
      type: 'boolean',
      default: false,
      describe: 'Append new discoveries to curated-studies.txt',
    })
    .option('curatedFile', {
      type: 'string',
      default: DEFAULT_CURATED_FILE,
      describe: 'Path to existing curated studies file',
    })
    .option('output', {
      type: 'string',
      default: DEFAULT_OUTPUT_FILE,
      describe: 'Path to write discovered studies',
    })
    .option('verbose', {
      type: 'boolean',
      default: false,
      describe: 'Show detailed output',
    })
    .help().argv;

  const minLikes = argv.minLikes;
  const verbose = argv.verbose;

  console.log(`\nDiscovering popular Lichess studies (${minLikes}+ likes)...\n`);

  // Step 1: Load existing curated study IDs
  console.log('Step 1: Loading existing curated studies...');
  const existingIds = loadExistingIds(argv.curatedFile);
  console.log(`  ${existingIds.size} studies already curated\n`);

  // Step 2: Search with multiple terms
  console.log(`Step 2: Searching Lichess (${SEARCH_TERMS.length} search terms)...`);
  const allStudies = new Map();
  let termsSearched = 0;

  for (const term of SEARCH_TERMS) {
    termsSearched++;
    process.stdout.write(`  [${termsSearched}/${SEARCH_TERMS.length}] "${term}"...`);

    try {
      const results = await searchStudies(term, minLikes);
      let newCount = 0;
      for (const [id, study] of results) {
        if (!allStudies.has(id)) {
          allStudies.set(id, study);
          newCount++;
        }
      }
      console.log(` ${results.size} found (${newCount} new, ${allStudies.size} total)`);
    } catch (error) {
      console.log(` error: ${error.message}`);
    }
  }

  console.log(`\n  Total unique studies with ${minLikes}+ likes: ${allStudies.size}\n`);

  // Step 3: Filter for opening-related content
  console.log('Step 3: Filtering for opening-related content...');
  const included = [];
  const excluded = [];
  const uncertain = [];

  for (const study of allStudies.values()) {
    const { included: isIncluded, reason } = classifyStudy(study);
    if (isIncluded) {
      included.push(study);
    } else {
      excluded.push({ ...study, reason });
    }
  }

  console.log(`  Included (opening-related): ${included.length}`);
  console.log(`  Excluded (non-opening): ${excluded.length}\n`);

  // Step 4: Cross-reference with existing curated list
  console.log('Step 4: Cross-referencing with existing curated list...');
  const newStudies = included.filter((s) => !existingIds.has(s.id));
  const alreadyCurated = included.filter((s) => existingIds.has(s.id));

  console.log(`  Already curated: ${alreadyCurated.length}`);
  console.log(`  New discoveries: ${newStudies.length}\n`);

  // Sort by likes descending
  newStudies.sort((a, b) => b.likes - a.likes);

  // Step 5: Output results
  console.log('--- New Discoveries ---');
  for (const study of newStudies) {
    console.log(
      `  ${study.likes.toString().padStart(6)} likes | ${study.owner.padEnd(20)} | ${study.name}`
    );
    if (verbose) {
      console.log(`         https://lichess.org/study/${study.id}`);
      if (study.topics.length) {
        console.log(`         topics: ${study.topics.join(', ')}`);
      }
    }
  }

  if (verbose && excluded.length > 0) {
    console.log('\n--- Excluded Studies (for review) ---');
    for (const study of excluded.slice(0, 30)) {
      console.log(
        `  ${study.likes.toString().padStart(6)} likes | ${study.name} [${study.reason}]`
      );
    }
    if (excluded.length > 30) {
      console.log(`  ... and ${excluded.length - 30} more`);
    }
  }

  // Step 6: Write output
  if (!argv.dryRun && newStudies.length > 0) {
    if (argv.append) {
      const appendText = formatForCuratedFile(newStudies);
      fs.appendFileSync(argv.curatedFile, appendText + '\n');
      console.log(`\nAppended ${newStudies.length} studies to ${argv.curatedFile}`);
    } else {
      const outputText = formatForCuratedFile(newStudies);
      fs.writeFileSync(argv.output, outputText.trim() + '\n');
      console.log(`\nWrote ${newStudies.length} studies to ${argv.output}`);
    }
  } else if (argv.dryRun) {
    console.log('\nDRY RUN — no files written');
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Search terms used: ${SEARCH_TERMS.length}`);
  console.log(`Unique studies found (${minLikes}+ likes): ${allStudies.size}`);
  console.log(`Opening-related: ${included.length}`);
  console.log(`New (not in curated list): ${newStudies.length}`);
  console.log(`Already curated: ${alreadyCurated.length}`);
  console.log(`Excluded (non-opening): ${excluded.length}`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

// Exports for testing
module.exports = {
  classifyStudy,
  loadExistingIds,
  formatForCuratedFile,
  SEARCH_TERMS,
  EXCLUDE_TITLE_PATTERNS,
  INCLUDE_TITLE_PATTERNS,
};
