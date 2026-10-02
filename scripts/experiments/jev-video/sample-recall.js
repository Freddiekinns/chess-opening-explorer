#!/usr/bin/env node
/**
 * Stratum E: draws up to 50 of Jev's recall candidates for the uncovered
 * top-200 openings, at most 3 per opening, `main_subject` before `covered`.
 *
 * Writes judge-batch-4.json (blind) and jev-judging-key-recall.json.
 * Usage: node scripts/experiments/jev-video/sample-recall.js
 */

const fs = require('fs');
const { loadCorpus, videoState, outPath, readJsonl } = require('./lib');

const PER_OPENING = 3;
const TOTAL = 50;

function main() {
  const corpus = loadCorpus();
  const records = readJsonl(outPath('jev-recall.jsonl'));
  const meta = records[0].meta;

  const picked = [];
  for (const [qid, m] of Object.entries(meta)) {
    const hits = records
      .map((r) => ({ r, a: r.answers[qid] }))
      .filter(({ a }) => a.choice === 'main_subject' || a.choice === 'covered')
      .sort(
        (x, y) => (y.a.probabilities.main_subject || 0) - (x.a.probabilities.main_subject || 0)
      );
    for (const { r, a } of hits.slice(0, PER_OPENING)) picked.push({ video_id: r.video_id, m, a });
  }

  const items = [];
  const key = {};
  picked.slice(0, TOTAL).forEach(({ video_id, m, a }, i) => {
    const id = `e${String(i + 1).padStart(2, '0')}`;
    items.push({
      id,
      type: 'relation',
      video_id,
      video: videoState(corpus[video_id]),
      opening: m.label,
    });
    key[id] = { stratum: 'E', opening: m.opening, jev: a.choice, jev_confidence: a.confidence };
  });

  fs.writeFileSync(outPath('judge-batch-4.json'), JSON.stringify(items, null, 1) + '\n');
  fs.writeFileSync(outPath('jev-judging-key-recall.json'), JSON.stringify(key, null, 1) + '\n');
  console.log(`Stratum E: ${items.length} items from ${Object.keys(meta).length} openings`);
}

main();
