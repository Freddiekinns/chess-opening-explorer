#!/usr/bin/env node
/**
 * Stratum E: recall candidates for the top-200 positions with no video.
 *
 * Every candidate video is asked about every uncovered opening in one call.
 * Candidates are corpus videos whose run-2 family could plausibly hold those
 * openings. The site files several Queen's Pawn systems (Veresov, Chigorin)
 * under `irregular`, so Jev's family alone is too narrow a filter.
 *
 * Usage: node scripts/experiments/jev-video/recall.js [--dry-run]
 * Output: tools/data/experiments/jev-recall.jsonl (resumable)
 */

const crypto = require('crypto');
const path = require('path');
const {
  ROOT,
  loadCorpus,
  loadIndex,
  loadEco,
  baseName,
  buildDisplayedPairs,
  videoState,
  openingLabel,
  relationQuestion,
  outPath,
  readJsonl,
  runCalls,
  totalTokens,
  costUsd,
} = require('./lib');
const { sanitizeFenKey, legacySanitizeFenKey } = require(
  path.join(ROOT, 'packages', 'api', 'src', 'utils', 'fen-sanitizer')
);

const DRY_RUN = process.argv.includes('--dry-run');
const TOP_PLAYED = 200;
const CONCURRENCY = 6;
const CANDIDATE_FAMILIES = new Set([
  'queens-gambit',
  'italian',
  'irregular',
  'reti',
  'london',
  'trompowsky',
  'several_or_general',
]);

function uncoveredOpenings(index, openings) {
  const popularity = require(path.join(ROOT, 'api', 'data', 'popularity_stats.json')).positions;
  const ranked = Object.entries(popularity)
    .sort((a, b) => (b[1].frequency_count || 0) - (a[1].frequency_count || 0))
    .slice(0, TOP_PLAYED);
  const names = new Set();
  for (const [fen] of ranked) {
    const pos = index.positions[sanitizeFenKey(fen)] || index.positions[legacySanitizeFenKey(fen)];
    if (pos && !(pos.videos || []).length) names.add(baseName(pos.opening.name));
  }
  return [...names].sort().map((name) => openings.get(name));
}

async function main() {
  const corpus = loadCorpus();
  const index = loadIndex();
  const { openings } = buildDisplayedPairs(index, loadEco());
  const targets = uncoveredOpenings(index, openings);

  const family = new Map();
  for (const r of readJsonl(outPath('jev-run2.jsonl')))
    family.set(r.video_id, r.answers.family.choice);
  const candidates = [...family.keys()]
    .filter((id) => CANDIDATE_FAMILIES.has(family.get(id)))
    .sort();

  const questions = {};
  const meta = {};
  targets.forEach((o, i) => {
    questions[`q${i}`] = relationQuestion(o);
    meta[`q${i}`] = { opening: o.name, label: openingLabel(o) };
  });
  const hash = crypto
    .createHash('sha1')
    .update(targets.map(openingLabel).join('\n'))
    .digest('hex')
    .slice(0, 12);
  const calls = candidates.map((id) => ({
    key: `${id}:${hash}`,
    kind: 'recall',
    video_id: id,
    meta,
    state: videoState(corpus[id]),
    questions,
  }));

  console.log(`Uncovered openings: ${targets.length}; candidate videos: ${candidates.length}`);
  if (DRY_RUN) return;

  const file = outPath('jev-recall.jsonl');
  const failed = await runCalls(calls, file, { concurrency: CONCURRENCY });
  const records = readJsonl(file);
  const tokens = totalTokens(records);
  console.log(`\nAnswered calls: ${records.length}/${calls.length}`);
  console.log(`Input tokens: ${tokens} ≈ $${costUsd(tokens).toFixed(4)}`);

  // Per opening: how many candidates Jev calls its main subject or covered.
  for (const [qid, m] of Object.entries(meta)) {
    const hits = records.filter((r) => ['main_subject', 'covered'].includes(r.answers[qid].choice));
    const main = hits.filter((r) => r.answers[qid].choice === 'main_subject').length;
    console.log(`  ${String(hits.length).padStart(4)} (${main} main) ${m.opening}`);
  }
  if (failed) {
    console.error(`\n${failed} calls failed; re-run to retry them.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
