const fs = require('fs');
const path = require('path');

const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'web', 'public', 'seo-lookup');

const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

// 16 shards keep each file ~100 KB, so the edge middleware fetches a small
// shard per request instead of the full 1.7 MB lookup (P6 perf fix).
const SHARD_COUNT = 16;

/**
 * djb2 string hash — MUST stay in sync with the copy in middleware.ts.
 * Deterministic, dependency-free, and cheap enough for the edge runtime.
 */
function shardForFen(fen, shardCount = SHARD_COUNT) {
  let hash = 5381;
  for (let i = 0; i < fen.length; i++) {
    hash = ((hash << 5) + hash + fen.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) % shardCount;
}

function generateSeoLookup() {
  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
  let totalEntries = 0;

  for (const file of ECO_FILES) {
    const filePath = path.join(ECO_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${file} not found at ${filePath}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries = Object.entries(data);
    console.log(`  ${file}: ${entries.length} entries`);

    for (const [fen, entry] of entries) {
      // Use raw FEN as key; array format [name, eco, shortMoves] to minimize size
      const moves = (entry.moves || '').split(/\s+/).slice(0, 7).join(' ');
      shards[shardForFen(fen)][fen] = [entry.name || 'Unknown Opening', entry.eco || '', moves];
      totalEntries++;
    }
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalKB = 0;
  let maxKB = 0;
  shards.forEach((shard, i) => {
    const output = JSON.stringify(shard);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${i.toString(16)}.json`), output, 'utf-8');
    const kb = Buffer.byteLength(output) / 1024;
    totalKB += kb;
    maxKB = Math.max(maxKB, kb);
  });

  console.log(`\nGenerated seo-lookup shards:`);
  console.log(`  Entries: ${totalEntries} across ${SHARD_COUNT} shards`);
  console.log(`  Total: ${totalKB.toFixed(1)} KB, largest shard: ${maxKB.toFixed(1)} KB`);

  if (maxKB > 300) {
    console.warn(`  WARNING: largest shard exceeds 300 KB — raise SHARD_COUNT`);
  }
}

if (require.main === module) {
  generateSeoLookup();
}

module.exports = { shardForFen, SHARD_COUNT };
