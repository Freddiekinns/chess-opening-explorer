/**
 * courses.json writer
 * Since study matching v2 the index is a full rebuild from the study cache on
 * every run, so the old load/merge helpers are gone — only writing remains.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_COURSES_PATH = path.join(process.cwd(), 'api', 'data', 'courses.json');

/**
 * Write course data to file (compact JSON — the index is machine-managed
 * data; pretty-printing would double the multi-MB payload).
 * @param {string} filePath - Path to courses.json
 * @param {object} data - FEN-keyed course data
 */
function writeCourses(filePath, data) {
  const coursesPath = filePath || DEFAULT_COURSES_PATH;
  const dir = path.dirname(coursesPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(coursesPath, JSON.stringify(data), 'utf8');
}

module.exports = {
  writeCourses,
  DEFAULT_COURSES_PATH,
};
