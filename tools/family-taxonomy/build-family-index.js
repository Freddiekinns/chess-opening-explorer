// tools/family-taxonomy/build-family-index.js
'use strict';

const fs = require('fs');
const path = require('path');
const { createResolver } = require('./resolve-family');

const ROOT = path.resolve(__dirname, '..', '..');
const ECO_DIR = path.join(ROOT, 'api', 'data', 'eco');
const FAMILIES_PATH = path.join(ROOT, 'data', 'families.json');
const OVERRIDES_PATH = path.join(ROOT, 'data', 'family-overrides.json');
const REPORT_PATH = path.join(ROOT, 'api', 'data', 'family-coverage-report.json');
const COVERAGE_THRESHOLD = 0.02;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function run({ failOnLowCoverage = true } = {}) {
  const families = loadJson(FAMILIES_PATH);
  const overrides = fs.existsSync(OVERRIDES_PATH) ? loadJson(OVERRIDES_PATH) : { overrides: [] };
  const resolve = createResolver(families, overrides);

  const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
  let total = 0;
  let uncategorised = 0;
  const uncategorisedSamples = [];
  const familyCounts = {};

  for (const file of ecoFiles) {
    const filePath = path.join(ECO_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[family-index] skip missing ${file}`);
      continue;
    }
    const data = loadJson(filePath);
    let touched = 0;
    for (const fen of Object.keys(data)) {
      const opening = data[fen];
      const familyId = resolve({ eco: opening.eco, name: opening.name });
      opening.family_id = familyId;
      opening.family_display_name =
        familyId === 'uncategorised' ? null : families[familyId].display_name;
      total += 1;
      familyCounts[familyId] = (familyCounts[familyId] || 0) + 1;
      if (familyId === 'uncategorised') {
        uncategorised += 1;
        if (uncategorisedSamples.length < 50) {
          uncategorisedSamples.push({ eco: opening.eco, name: opening.name });
        }
      }
      touched += 1;
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[family-index] ${file}: enriched ${touched} entries`);
  }

  const coverage = total === 0 ? 1 : 1 - uncategorised / total;
  const report = {
    generated_at: new Date().toISOString(),
    total,
    uncategorised,
    coverage,
    threshold: 1 - COVERAGE_THRESHOLD,
    family_counts: familyCounts,
    uncategorised_samples: uncategorisedSamples,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(
    `[family-index] coverage ${(coverage * 100).toFixed(2)}% (uncategorised ${uncategorised}/${total})`
  );

  if (failOnLowCoverage && uncategorised / total > COVERAGE_THRESHOLD) {
    console.error(
      `[family-index] FAIL: uncategorised ${((100 * uncategorised) / total).toFixed(2)}% exceeds ${COVERAGE_THRESHOLD * 100}% threshold. Add overrides in data/family-overrides.json.`
    );
    process.exit(1);
  }

  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run };
