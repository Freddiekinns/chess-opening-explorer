/**
 * Course data merger
 * Merges auto-discovered Lichess studies into courses.json
 * while preserving manually curated entries
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_COURSES_PATH = path.join(
  process.cwd(),
  'packages',
  'api',
  'src',
  'data',
  'courses.json'
);

/**
 * Load existing courses from JSON file
 * @param {string} [filePath] - Path to courses.json
 * @returns {object} FEN-keyed course data, or empty object if file missing
 */
function loadExistingCourses(filePath) {
  const coursesPath = filePath || DEFAULT_COURSES_PATH;

  if (!fs.existsSync(coursesPath)) {
    return {};
  }

  const content = fs.readFileSync(coursesPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Merge auto-discovered courses into existing data
 *
 * Algorithm:
 * 1. For each FEN in existing data: keep entries where auto_discovered !== true
 * 2. Add all new auto-discovered entries from discovered
 * 3. Result: manual entries untouched, auto entries refreshed
 *
 * @param {object} existing - Current courses.json data (FEN-keyed)
 * @param {object} discovered - New auto-discovered data (FEN-keyed)
 * @returns {object} Merged courses data
 */
function mergeDiscoveries(existing, discovered) {
  const merged = {};

  // Process all existing FEN keys - keep manual entries, drop old auto entries
  for (const [fen, courses] of Object.entries(existing)) {
    const manualEntries = courses.filter((c) => c.auto_discovered !== true);
    if (manualEntries.length > 0) {
      merged[fen] = manualEntries;
    }
  }

  // Add new auto-discovered entries
  for (const [fen, courses] of Object.entries(discovered)) {
    if (!merged[fen]) {
      merged[fen] = [];
    }
    merged[fen].push(...courses);
  }

  return merged;
}

/**
 * Write merged course data to file
 * @param {string} filePath - Path to courses.json
 * @param {object} data - Merged course data
 */
function writeCourses(filePath, data) {
  const coursesPath = filePath || DEFAULT_COURSES_PATH;
  const dir = path.dirname(coursesPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(coursesPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  loadExistingCourses,
  mergeDiscoveries,
  writeCourses,
  DEFAULT_COURSES_PATH,
};
