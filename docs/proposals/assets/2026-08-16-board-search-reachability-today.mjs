/**
 * Reproduces the "reachable by clicking today" figure in
 * docs/proposals/2026-08-16-board-search-prd.md §2.
 *
 *   node docs/proposals/assets/2026-08-16-board-search-reachability-today.mjs
 *
 * Uses tree-service's own move-string child map — the graph the opening detail
 * page navigates — and walks every edge from the twenty first-move roots.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
const TreeService = require(path.join(root, 'packages/api/src/services/tree-service.js'));

const service = new TreeService();
const { moveIndex, childrenMap } = service._buildIndex();

const roots = [];
for (const normalised of moveIndex.keys()) {
  if (service._getParentMovesNormalized(normalised) === null) roots.push(normalised);
}

const seen = new Set(roots);
const queue = [...roots];
while (queue.length) {
  for (const child of childrenMap.get(queue.pop()) || []) {
    const normalised = service._normalizeMoves(child.moves);
    if (seen.has(normalised)) continue;
    seen.add(normalised);
    queue.push(normalised);
  }
}

console.log(
  JSON.stringify(
    {
      namedMoveLines: moveIndex.size,
      rootsAtPly1: roots.length,
      reachableByClickingToday: seen.size,
      unreachableToday: moveIndex.size - seen.size,
    },
    null,
    1
  )
);
