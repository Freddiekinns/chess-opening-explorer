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

/**
 * The first four FEN fields are the position proper; the last two are move
 * counters. Two rows agreeing on those four are the same board reached by
 * different move orders — genuinely one page under two URLs, and the only
 * duplicate content in this corpus.
 */
function positionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

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

/** Deterministic pick among rows describing the same thing. */
function preferred(group) {
  return group.reduce((best, row) => {
    if ((row.games || 0) !== (best.games || 0)) {
      return (row.games || 0) > (best.games || 0) ? row : best;
    }
    if (row.moves.length !== best.moves.length) {
      return row.moves.length < best.moves.length ? row : best;
    }
    return row.fen < best.fen ? row : best;
  });
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
 * Two things that look alike and are not.
 *
 * **A shared name is not a duplicate page.** 2,071 rows carry a name another
 * row already has, but every one of them is a different position with its own
 * moves, description and win rates: `King's Pawn Game` is both 1.e4 and
 * 1.e4 e5, and `Danish Gambit: Accepted, 4.Bc4` (11.4M games) is not the
 * `Danish Gambit: Accepted` it is named after. Canonicalising on the name
 * de-indexed 1,677 real pages carrying 6.65 billion games. What the name
 * collision actually breaks is the *title*, so those rows are flagged and the
 * middleware disambiguates them by move list — which separates all 677 shared
 * names with none left ambiguous.
 *
 * **The same board under two URLs is a duplicate.** 271 rows differ from
 * another only in the FEN's move counters. Those get a canonical.
 */
function resolveCanonicals(rows) {
  const byPosition = new Map();
  const byName = new Map();
  for (const row of rows) {
    const key = positionKey(row.fen);
    const position = byPosition.get(key);
    if (position) position.push(row);
    else byPosition.set(key, [row]);

    const named = byName.get(row.name);
    if (named) named.push(row);
    else byName.set(row.name, [row]);
  }

  let canonicalCount = 0;
  for (const group of byPosition.values()) {
    const winner = preferred(group);
    for (const row of group) {
      row.canonical = row.fen === winner.fen ? null : winner.fen;
      if (!row.canonical) canonicalCount++;
    }
  }

  let ambiguousCount = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      // Only worth disambiguating a page that is going to be indexed.
      if (row.canonical) continue;
      row.sharesName = true;
      ambiguousCount++;
    }
  }

  return { canonicalCount, ambiguousCount };
}

function generateSeoLookup() {
  const rows = readOpenings();
  const { canonicalCount, ambiguousCount } = resolveCanonicals(rows);

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
      row.sharesName ? 1 : null,
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
  console.log(`  Duplicate positions canonicalised: ${rows.length - canonicalCount}`);
  console.log(`  Titles disambiguated by move list: ${ambiguousCount}`);
  console.log(
    `  Total: ${totalKB.toFixed(1)} KB, mean ${(totalKB / SHARD_COUNT).toFixed(1)} KB, largest ${maxKB.toFixed(1)} KB`
  );

  if (maxKB > 300) {
    console.warn(`  WARNING: largest shard exceeds 300 KB — raise SHARD_COUNT`);
  }
}

if (require.main === module) {
  generateSeoLookup();
}

module.exports = { shardForFen, positionKey, resolveCanonicals, readOpenings, SHARD_COUNT };
