#!/usr/bin/env node
/**
 * Applies the Jev rejection filter (lib/jev-filter.js) to the consolidated
 * video index. The pipeline runs it after every consolidation; run it by hand
 * to re-filter the current index.
 *
 * Without JEV_API_KEY only cached answers act and every other video stays.
 *
 * Usage: node tools/video-pipeline/scripts/apply-jev-filter.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createJevAsk, filterVideoIndex, loadCache, saveCache } = require('../lib/jev-filter');

const ROOT = path.join(__dirname, '..', '..', '..');
const INDEX_PATH = path.join(ROOT, 'api', 'data', 'video-index.json');
const ECO_DIR = path.join(ROOT, 'api', 'data', 'eco');
const CORPUS_PATH = path.join(ROOT, 'tools', 'data', 'video_enrichment_cache.json');
const CACHE_PATH = path.join(ROOT, 'tools', 'data', 'jev-relation-cache.json');

async function applyJevFilter({
  indexPath = INDEX_PATH,
  ecoDir = ECO_DIR,
  corpusPath = CORPUS_PATH,
  cachePath = CACHE_PATH,
  apiKey = process.env.JEV_API_KEY,
} = {}) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const eco = {};
  for (const letter of 'ABCDE') {
    Object.assign(eco, JSON.parse(fs.readFileSync(path.join(ecoDir, `eco${letter}.json`), 'utf8')));
  }
  const corpus = fs.existsSync(corpusPath) ? JSON.parse(fs.readFileSync(corpusPath, 'utf8')) : {};
  const cache = loadCache(cachePath);

  if (!apiKey) console.log('   ℹ️  No JEV_API_KEY: using cached answers only.');
  const { stats } = await filterVideoIndex(index, {
    eco,
    corpus,
    cache,
    ask: apiKey ? createJevAsk(apiKey) : undefined,
  });

  // Consolidation recorded the unfiltered file's size; record this one's.
  const meta = index.metadata;
  const sizeMB = Buffer.byteLength(JSON.stringify(index, null, 2)) / (1024 * 1024);
  if (meta.consolidatedSizeMB != null) meta.consolidatedSizeMB = sizeMB.toFixed(2);
  if (meta.originalSizeMB != null)
    meta.compressionRatio = `${(meta.originalSizeMB / sizeMB).toFixed(1)}x`;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  saveCache(cachePath, cache);

  console.log(
    `   Jev: ${stats.removed} of ${stats.checked} pairs removed, ${stats.unanswered} kept unanswered; ` +
      `${stats.calls} calls, ${stats.inputTokens} input tokens.`
  );
  if (stats.stoppedEarly) console.warn(`   ⚠️  Stopped asking Jev: ${stats.stoppedEarly}`);
  return stats;
}

if (require.main === module) {
  applyJevFilter().catch((err) => {
    console.error('❌ Jev filter failed:', err);
    process.exit(1);
  });
}

module.exports = { applyJevFilter };
