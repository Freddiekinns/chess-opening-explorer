import { asyncBufferFromFile, parquetRead } from '/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/tools/node_modules/hyparquet/src/hyparquet.js';
const file = await asyncBufferFromFile('/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/pq/p0.parquet');
const fam = {}; let n = 0, opening = 0, tagged = 0;
await parquetRead({ file, columns: ['Themes', 'OpeningTags', 'Rating'], onComplete: (rows) => {
  for (const [th, tags, r] of rows) { n++; const op = th && th.includes('opening'); if (op) opening++; if (tags && tags.length) { tagged++; const f = tags[0]; fam[f] = fam[f] || [0, 0, 0]; fam[f][0]++; if (op) { fam[f][1]++; if (r <= 1600) fam[f][2]++; } } }
} });
console.log('rows', n, 'with opening tags', tagged, 'opening-phase theme', opening);
const top = Object.entries(fam).sort((a, b) => b[1][0] - a[1][0]);
console.log('distinct family tags', top.length);
for (const [f, [a, o, e]] of top.slice(0, 30)) console.log(f, a, 'opening-phase', o, 'of which rated <=1600', e);
