/**
 * Local cache of raw study metadata + PGN, one JSON per study, so matching
 * can rerun offline with zero Lichess API calls (the videos.sqlite lesson).
 * Directory is gitignored — it is a rematch convenience, not shipped data.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'study-cache');

function cachePath(cacheDir, studyId) {
  return path.join(cacheDir, `${studyId}.json`);
}

function saveStudy(cacheDir, study) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath(cacheDir, study.studyId), JSON.stringify(study, null, 2), 'utf8');
}

function loadStudy(cacheDir, studyId) {
  const file = cachePath(cacheDir, studyId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasStudy(cacheDir, studyId) {
  return fs.existsSync(cachePath(cacheDir, studyId));
}

function loadAllStudies(cacheDir) {
  if (!fs.existsSync(cacheDir)) return [];
  return fs
    .readdirSync(cacheDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(cacheDir, f), 'utf8')));
}

module.exports = { saveStudy, loadStudy, hasStudy, loadAllStudies, DEFAULT_CACHE_DIR };
