#!/usr/bin/env node
/**
 * Picks the most-played variations (by games across all their positions) and
 * writes the researcher inputs for them, in batches.
 *
 *   node tools/style-tags/select-roots.js --top 100 --batch 10 --name pilot
 *
 * Names in api/data/eco come from several sources and disagree ("Sicilian
 * Defense: Najdorf Variation" vs "Sicilian: Najdorf"), so grouping is by move
 * order, matched by board so that transpositions join. Only the standard
 * eco_tsv names define variations: a variation is "Family: first variation" of
 * such a name, and its root is the shallowest position carrying it. Every
 * position belongs to the variation of its nearest eco_tsv-named ancestor (or
 * itself). Briefs that already exist are skipped.
 *
 * Also writes _inputs/variation-map.json (FEN -> variation slug), which is how
 * a variation's tags later reach every position in it.
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const REPO = path.join(__dirname, '../..');
const DATA = path.join(REPO, 'api/data');
const BRIEFS = path.join(REPO, 'tools/data/style-briefs');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const plies = (moves) => moves.split(' ').filter((t) => !/^\d+\.$/.test(t));

function variationKey(name) {
  const [family, rest = ''] = name.split(/:\s*/);
  const first = rest.split(',')[0].trim();
  return first ? `${family}: ${first}` : family;
}

/** Placement, side to move and castling rights: what makes two positions the same. */
const boardKey = (fen) => fen.split(' ').slice(0, 3).join(' ');

/** The board after each ply of a move list; stops at the first move it cannot play. */
function replay(tokens) {
  const chess = new Chess();
  const boards = [];
  for (const san of tokens) {
    try {
      chess.move(san);
    } catch {
      break;
    }
    boards.push(boardKey(chess.fen()));
  }
  return boards;
}

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const top = Number(arg('top', 200));
  const batchSize = Number(arg('batch', 10));
  const runName = arg('name', `top${top}`);

  const pop = JSON.parse(fs.readFileSync(path.join(DATA, 'popularity_stats.json'), 'utf8'));
  const stats = pop.positions || pop;
  const all = {};
  for (const f of fs.readdirSync(path.join(DATA, 'eco')).filter((f) => f.endsWith('.json')))
    Object.assign(all, JSON.parse(fs.readFileSync(path.join(DATA, 'eco', f), 'utf8')));

  const positions = Object.entries(all).map(([fen, o]) => ({
    fen,
    ...o,
    tokens: plies(o.moves),
    games: (stats[fen] || {}).games_analyzed || 0,
  }));

  // Standard-named positions by board, and the root of each variation.
  const named = new Map();
  const roots = new Map();
  for (const p of positions) {
    if (p.src !== 'eco_tsv') continue;
    named.set(boardKey(p.fen), p);
    const key = variationKey(p.name);
    const best = roots.get(key);
    if (!best || p.tokens.length < best.tokens.length) roots.set(key, p);
  }

  // Each position's variation: its nearest standard-named ancestor or itself.
  // Ancestors are matched by board, not move text, because a position stores
  // one move order: Semi-Slav positions filed under the QGD order (…e6, …c6)
  // never pass through the Semi-Slav root's own move string.
  const members = new Map();
  for (const p of positions) {
    const boards = replay(p.tokens);
    let anc = named.get(boardKey(p.fen)) || null;
    for (let n = boards.length - 1; n >= 0 && !anc; n--) anc = named.get(boards[n]) || null;
    if (!anc) continue;
    const key = variationKey(anc.name);
    if (!members.has(key)) members.set(key, []);
    members.get(key).push(p);
    p.variation = key;
  }

  // Variations ranked by games across all their positions; hubs are skipped.
  const { hubs } = JSON.parse(fs.readFileSync(path.join(__dirname, 'hubs.json'), 'utf8'));
  const hubSet = new Set(hubs);
  const ranked = [...members]
    .map(([key, ps]) => [key, ps.reduce((s, p) => s + p.games, 0)])
    .filter(([key]) => !hubSet.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  const { shared } = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'shared-briefs.json'), 'utf8')
  );
  const existing = new Set(fs.readdirSync(BRIEFS).filter((f) => f.endsWith('.json')));
  const inputs = [];
  const reused = [];
  for (const [i, [key, totalGames]] of ranked.entries()) {
    const root = roots.get(key);
    const slug = slugify(key);
    if (shared[slug] || existing.has(`${slug}.json`)) {
      reused.push(slug);
      continue;
    }
    const sub = members.get(key).filter((p) => p.fen !== root.fen);
    const a = root.analysis_json || {};
    inputs.push({
      slug,
      rank: i + 1,
      total_games: totalGames,
      root: { name: root.name, eco: root.eco, moves: root.moves, fen: root.fen, games: root.games },
      alternative_names: Object.values(root.aliases || {}),
      subtree: {
        positions: sub.length,
        games: sub.reduce((s, p) => s + p.games, 0),
        most_played: sub
          .sort((x, y) => y.games - x.games)
          .slice(0, 12)
          .map((p) => ({ name: p.name, moves: p.moves, games: p.games })),
      },
      current: {
        description: a.description,
        common_plans: a.common_plans,
        style_tags: a.style_tags,
        complexity: a.complexity,
      },
    });
  }
  const dir = path.join(BRIEFS, '_inputs');
  fs.mkdirSync(dir, { recursive: true });
  const map = {};
  for (const p of positions) if (p.variation) map[p.fen] = slugify(p.variation);
  fs.writeFileSync(path.join(dir, 'variation-map.json'), JSON.stringify(map, null, 1) + '\n');
  const batches = Math.ceil(inputs.length / batchSize);
  for (let i = 0; i < batches; i++) {
    const file = path.join(dir, `${runName}-${String(i + 1).padStart(2, '0')}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(inputs.slice(i * batchSize, (i + 1) * batchSize), null, 2) + '\n'
    );
  }
  console.log(
    `top ${top} variations (${hubSet.size} hubs skipped): ${inputs.length} to research ` +
      `in ${batches} batches, ${reused.length} already briefed (${reused.join(', ')})`
  );
  for (const inp of inputs)
    console.log(`${String(inp.rank).padStart(3)}  ${inp.slug.padEnd(52)} ${inp.root.moves}`);
}

main();
