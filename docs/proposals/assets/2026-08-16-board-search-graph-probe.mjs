/**
 * Reproduces every position-graph figure quoted in
 * docs/proposals/2026-08-16-board-search-prd.md §2.
 *
 *   node docs/proposals/assets/2026-08-16-board-search-graph-probe.mjs
 *
 * Builds the opening graph keyed on the *position* (first four FEN fields)
 * rather than on the move string, by replaying all 12,377 ECO lines.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.join(root, 'api', 'data');

const eco = {};
for (const f of ['A', 'B', 'C', 'D', 'E']) {
  Object.assign(
    eco,
    JSON.parse(fs.readFileSync(path.join(dataDir, 'eco', `eco${f}.json`), 'utf8'))
  );
}
const pop = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'popularity_stats.json'), 'utf8')
).positions;

/** The position key: board, side to move, castling, en passant — no counters. */
const pk = (fen) => fen.split(' ').slice(0, 4).join(' ');

// Named boards. Where several FENs address one board (271 rows differ only in
// move counters), the busiest one wins — the same rule the canonicals use.
const named = new Map();
for (const [fen, entry] of Object.entries(eco)) {
  const key = pk(fen);
  const games = pop[fen]?.games_analyzed ?? 0;
  const prev = named.get(key);
  if (!prev || games > prev.games) named.set(key, { fen, name: entry.name, games });
}

// Replay every line, recording an edge for every ply — not just the last one,
// so intermediate boards carry their continuations too.
const children = new Map(); // position -> Map(san -> position)
const boards = new Set();
let replayed = 0;
let fenAgrees = 0;
for (const [fen, entry] of Object.entries(eco)) {
  const sans = (entry.moves || '')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const game = new Chess();
  let prev = pk(game.fen());
  boards.add(prev);
  for (const san of sans) {
    game.move(san); // throws on an illegal line — none do
    const cur = pk(game.fen());
    boards.add(cur);
    if (!children.has(prev)) children.set(prev, new Map());
    children.get(prev).set(san, cur);
    prev = cur;
  }
  replayed++;
  if (pk(game.fen()) === pk(fen)) fenAgrees++;
}

let edges = 0;
for (const moves of children.values()) edges += moves.size;

const parents = new Map();
for (const [parent, moves] of children) {
  for (const child of moves.values()) {
    if (!parents.has(child)) parents.set(child, new Set());
    parents.get(child).add(parent);
  }
}

const START = pk(new Chess().fen());
/** Named boards reachable from the start, optionally refusing unnamed steps. */
const walk = (namedOnly) => {
  const seen = new Set([START]);
  const queue = [START];
  while (queue.length) {
    for (const child of children.get(queue.pop())?.values() ?? []) {
      if (namedOnly && !named.has(child)) continue;
      if (seen.has(child)) continue;
      seen.add(child);
      queue.push(child);
    }
  }
  return [...seen].filter((board) => named.has(board)).length;
};

let namedLeaves = 0;
for (const board of named.keys()) if (!children.get(board)?.size) namedLeaves++;

let namedWithNoNamedParent = 0;
for (const board of named.keys()) {
  const ps = parents.get(board);
  if (ps && ![...ps].some((p) => named.has(p))) namedWithNoNamedParent++;
}

let boardsWithMultipleNamedParents = 0;
for (const [board, ps] of parents) {
  if (named.has(board) && [...ps].filter((p) => named.has(p)).length > 1) {
    boardsWithMultipleNamedParents++;
  }
}

const counts = [...children.values()].map((m) => m.size).sort((a, b) => a - b);
const quantile = (q) => counts[Math.floor(counts.length * q)];

console.log(
  JSON.stringify(
    {
      ecoRows: Object.keys(eco).length,
      linesThatReplay: replayed,
      replayedBoardsMatchingStoredFen: fenAgrees,
      namedBoards: named.size,
      boardsInGraph: boards.size,
      connectorBoards: boards.size - named.size,
      edges,
      positionsWithContinuations: children.size,
      namedOnlyWalkReaches: walk(true),
      fullWalkReaches: walk(false),
      namedWithNoNamedParent,
      boardsWithMultipleNamedParents,
      namedLeaves,
      continuationsP50: quantile(0.5),
      continuationsP90: quantile(0.9),
      continuationsMax: counts[counts.length - 1],
    },
    null,
    1
  )
);
