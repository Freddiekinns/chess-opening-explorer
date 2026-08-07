const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'api', 'data');
const ECO_DIR = path.join(DATA_DIR, 'eco');
const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'web', 'public', 'seo-lookup');

const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

// 64 shards keep each file ~120 KB. The payload carries the opening's own
// description and win rates now, not just its name, so the middleware can put
// real content in the HTML instead of a spinner — see TASK009's follow-up.
const SHARD_COUNT = 64;

// A label of the form "<parent>, <move>" — "Bird: From Gambit, 2...d6" — is a
// generated variation caption. Nobody searches for it, and it duplicates the
// parent's description almost word for word, so it canonicalises to the parent.
const MOVE_SUFFIX = /,\s*\d+\s*(\.\.\.|…|\.)\s*[A-Za-z0-9+#=x-]+\s*$/;

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

/** The parent opening a "<parent>, <move>" caption belongs to, or null. */
function parentName(name) {
  if (!MOVE_SUFFIX.test(name)) return null;
  const parent = name.replace(MOVE_SUFFIX, '').trim();
  return parent && parent !== name ? parent : null;
}

function readOpenings() {
  const popularity = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'popularity_stats.json'), 'utf-8')
  ).positions;

  const rows = [];
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
      const stats = popularity[fen];
      // popularity_stats carries an entry for every position, but 16 of them
      // hold null rates and 0 games. Those must stay null rather than become 0
      // — the page omits the panel rather than drawing "White 0%".
      const games = stats && stats.games_analyzed != null ? stats.games_analyzed : null;
      rows.push({
        fen,
        name: (entry.name || 'Unknown Opening').trim(),
        eco: entry.eco || '',
        moves: (entry.moves || '').trim(),
        description: (entry.analysis_json && entry.analysis_json.description) || '',
        games: games || null,
        white: games && stats.white_win_rate != null ? stats.white_win_rate : null,
        draw: games && stats.draw_rate != null ? stats.draw_rate : null,
        black: games && stats.black_win_rate != null ? stats.black_win_rate : null,
      });
    }
  }
  return rows;
}

/**
 * One indexable page per distinct opening name. 12,377 FENs carry only 10,983
 * names — 2,071 pages sat on a name another page already had, so Google saw
 * duplicate titles and near-identical descriptions across the set. The busiest
 * position wins the name; everything else points its canonical at that URL.
 */
function resolveCanonicals(rows) {
  const byName = new Map();
  for (const row of rows) {
    const group = byName.get(row.name);
    if (group) group.push(row);
    else byName.set(row.name, [row]);
  }

  const winnerOf = new Map();
  for (const [name, group] of byName) {
    const winner = group.reduce((best, row) => {
      if ((row.games || 0) !== (best.games || 0))
        return (row.games || 0) > (best.games || 0) ? row : best;
      if (row.moves.length !== best.moves.length)
        return row.moves.length < best.moves.length ? row : best;
      return row.fen < best.fen ? row : best;
    });
    winnerOf.set(name, winner);
  }

  // Follow "<parent>, <move>" up to its parent, guarding against a cycle.
  const targetOf = (name) => {
    let current = name;
    for (let hops = 0; hops < 8; hops++) {
      const parent = parentName(current);
      if (!parent || !byName.has(parent)) break;
      current = parent;
    }
    return winnerOf.get(current);
  };

  let canonicalCount = 0;
  for (const row of rows) {
    const target = targetOf(row.name);
    row.canonical = target && target.fen !== row.fen ? target.fen : null;
    if (!row.canonical) canonicalCount++;
  }
  return canonicalCount;
}

function generateSeoLookup() {
  const rows = readOpenings();
  const canonicalCount = resolveCanonicals(rows);

  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
  for (const row of rows) {
    // Compact positional payload; trailing nulls are trimmed off the end.
    const entry = [
      row.name,
      row.eco,
      row.moves,
      row.description,
      row.games,
      row.white,
      row.draw,
      row.black,
      row.canonical,
    ];
    while (entry.length > 4 && entry[entry.length - 1] == null) entry.pop();
    shards[shardForFen(row.fen)][row.fen] = entry;
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
  console.log(`  Entries: ${rows.length} across ${SHARD_COUNT} shards`);
  console.log(`  Canonical (indexable) pages: ${canonicalCount}`);
  console.log(`  Canonicalised away: ${rows.length - canonicalCount}`);
  console.log(`  Total: ${totalKB.toFixed(1)} KB, largest shard: ${maxKB.toFixed(1)} KB`);

  if (maxKB > 300) {
    console.warn(`  WARNING: largest shard exceeds 300 KB — raise SHARD_COUNT`);
  }
}

if (require.main === module) {
  generateSeoLookup();
}

module.exports = { shardForFen, parentName, resolveCanonicals, readOpenings, SHARD_COUNT };
