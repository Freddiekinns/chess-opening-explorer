#!/usr/bin/env node
/**
 * Run 2: classify the subject of every corpus video.
 *
 * Asks which opening family each of the ~10,200 videos in the enrichment cache
 * is mainly about, from the 28 families plus `several_or_general` and
 * `not_opening`. Compared later with the families the matcher assigned.
 *
 * Usage: node scripts/experiments/jev-video/run2.js [--dry-run]
 * Output: tools/data/experiments/jev-run2.jsonl (resumable)
 */

const fs = require('fs');
const {
  MODEL,
  loadCorpus,
  loadFamilies,
  videoState,
  familyQuestion,
  inputVersions,
  outPath,
  readJsonl,
  runCalls,
  totalTokens,
  costUsd,
} = require('./lib');

const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = 6;

function planCalls() {
  const corpus = loadCorpus();
  const question = familyQuestion(loadFamilies());
  return Object.keys(corpus)
    .sort()
    .map((id) => ({
      key: id,
      kind: 'family',
      video_id: id,
      meta: {},
      state: videoState(corpus[id]),
      questions: { family: question },
    }));
}

function writeManifest(file) {
  if (fs.existsSync(file)) return;
  const versions = inputVersions([
    'tools/data/video_enrichment_cache.json',
    'api/data/families.json',
  ]);
  fs.writeFileSync(
    file,
    JSON.stringify(
      { run: 2, model: MODEL, ...versions, started: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );
}

async function main() {
  const calls = planCalls();
  console.log(`Planned: ${calls.length} calls`);
  if (DRY_RUN) return;

  writeManifest(outPath('jev-run2.manifest.json'));
  const file = outPath('jev-run2.jsonl');
  const failed = await runCalls(calls, file, { concurrency: CONCURRENCY });

  const records = readJsonl(file);
  const tokens = totalTokens(records);
  const dist = {};
  for (const r of records) dist[r.answers.family.choice] = (dist[r.answers.family.choice] || 0) + 1;
  console.log(`\nAnswered calls: ${records.length}/${calls.length}`);
  console.log(`Input tokens: ${tokens} ≈ $${costUsd(tokens).toFixed(4)}`);
  console.log('Answers:', dist);
  if (failed) {
    console.error(`\n${failed} calls failed; re-run to retry them.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
