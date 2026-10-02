#!/usr/bin/env node
/**
 * Seeds the pipeline's Jev answer cache (tools/data/jev-relation-cache.json)
 * from run 1's answers, so the first filtered index costs nothing.
 *
 * Usage: node scripts/experiments/jev-video/seed-cache.js
 * Reads tools/data/experiments/jev-run1.jsonl (gitignored; rebuild with run1.js).
 */

const path = require('path');
const { ROOT, outPath, readJsonl } = require('./lib');
const {
  MODEL,
  labelHash,
  loadCache,
  saveCache,
} = require('../../../tools/video-pipeline/lib/jev-filter');

const CACHE_PATH = path.join(ROOT, 'tools', 'data', 'jev-relation-cache.json');

function main() {
  const cache = loadCache(CACHE_PATH);
  let added = 0;
  for (const r of readJsonl(outPath('jev-run1.jsonl'))) {
    if (r.model !== MODEL) throw new Error(`Answer from ${r.model}, cache is ${MODEL}`);
    for (const [qid, m] of Object.entries(r.meta)) {
      const a = r.answers[qid];
      const p = (a.probabilities.main_subject || 0) + (a.probabilities.covered || 0);
      cache.entries[`${r.video_id}|${m.opening}`] = {
        c: a.choice,
        p: Math.round(p * 100) / 100,
        l: labelHash(m.label),
      };
      added++;
    }
  }
  saveCache(CACHE_PATH, cache);
  console.log(`Seeded ${added} answers into ${path.relative(ROOT, CACHE_PATH)}`);
}

main();
