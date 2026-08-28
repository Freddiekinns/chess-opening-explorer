const fs = require('fs');
const path = require('path');

const TreeService = require('../packages/api/src/services/tree-service');

const DATA_DIR = path.join(__dirname, '..', 'api', 'data');
const ECO_DIR = path.join(DATA_DIR, 'eco');
const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'web', 'public', 'seo-lookup');

const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

// 96 shards keep each file ~160 KB. The payload carries the opening's own
// description, win rates and now its ancestor and related-opening links, so
// the middleware can put real content and real links in the HTML instead of a
// spinner. It was 64 until the links landed and pushed the largest shard to
// 322 KB; the total bytes an isolate holds are unchanged by the split.
const SHARD_COUNT = 96;

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

// Eight is what fits one readable line in the pre-render.
const MAX_RELATED = 8;

// The breadcrumb keeps the family root and the two nearest ancestors.
//
// Uncapped it is not a breadcrumb: even deduplicated by name the chains average
// 8.5 entries and run to 33, which is an unreadable row and a 454 KB shard. The
// root is the link worth having — it is where family authority accumulates —
// and the nearest two are the ones that give a reader their bearings. The rungs
// in between cost bytes and say nothing.
const MAX_ANCESTORS = 3;

/**
 * The links the pre-rendered page carries.
 *
 * `OpeningNavigator` and `OpeningTree` draw the same links after hydration.
 * Until now that was the *only* place they existed, so a crawler that did not
 * run the JS found 12,106 dead ends and the sitemap was Google's sole route
 * into the corpus.
 *
 * Siblings and children go into one list rather than two, ordered by games:
 * the row renders as a single sentence, so grouping siblings first would put a
 * line nobody plays ahead of one they do. A node with no recorded games sorts
 * last rather than first — `|| 0` is doing real work here.
 */
function buildLinks(treeContext) {
  if (!treeContext) return { ancestors: [], related: [], elided: false };

  // Deduplicated by *consecutive name*, keeping the deeper position — the same
  // rule `deduplicateAncestors` in lib/openingBook.ts applies to the breadcrumb
  // React draws, because these two have to show the same trail.
  //
  // Deduplicating by FEN instead removes almost nothing: a chain repeats names,
  // not positions, so the raw list averages 9.7 entries and the first attempt
  // at this shipped a ten-deep breadcrumb and a 485 KB shard.
  const ancestors = [];
  for (const node of treeContext.ancestors || []) {
    if (!node || !node.fen) continue;
    const name = node.name || 'Unknown Opening';
    if (ancestors.length > 0 && ancestors[ancestors.length - 1][1] === name) {
      ancestors[ancestors.length - 1] = [node.fen, name];
    } else {
      ancestors.push([node.fen, name]);
    }
  }

  const related = [...(treeContext.siblings || []), ...(treeContext.children || [])]
    .filter((node) => node && node.fen)
    .sort((a, b) => (b.games || 0) - (a.games || 0))
    .slice(0, MAX_RELATED)
    .map((node) => [node.fen, node.name || 'Unknown Opening']);

  // Root, then the two nearest. `elided` tells the middleware to draw an
  // ellipsis rather than implying the trail is complete.
  const elided = ancestors.length > MAX_ANCESTORS;
  const trail = elided ? [ancestors[0], ...ancestors.slice(-(MAX_ANCESTORS - 1))] : ancestors;

  return { ancestors: trail, related, elided };
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

/** The compact positional payload, with trailing nulls trimmed off the end. */
function buildEntry(row, links) {
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
    links.ancestors,
    links.related,
    links.elided ? 1 : null,
  ];
  // An empty array is not null, so a page with ancestors but no related lines
  // keeps slot 10 and drops slot 11 — the indices below 10 never shift.
  while (
    entry.length > 4 &&
    (entry[entry.length - 1] == null || isEmptyArray(entry[entry.length - 1]))
  ) {
    entry.pop();
  }
  return entry;
}

function generateSeoLookup() {
  const rows = readOpenings();
  const { canonicalCount, ambiguousCount } = resolveCanonicals(rows);

  const treeService = new TreeService();
  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
  for (const row of rows) {
    const links = buildLinks(treeService.getTreeContext(row.fen));
    shards[shardForFen(row.fen)][row.fen] = buildEntry(row, links);
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
  const linked = rows.filter((row) => shards[shardForFen(row.fen)][row.fen].length > 10).length;
  console.log(`  Pages carrying internal links: ${linked}`);
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

module.exports = {
  shardForFen,
  positionKey,
  resolveCanonicals,
  readOpenings,
  buildLinks,
  buildEntry,
  MAX_RELATED,
  MAX_ANCESTORS,
  SHARD_COUNT,
};
