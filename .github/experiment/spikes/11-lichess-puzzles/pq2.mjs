import { asyncBufferFromFile, parquetRead } from '/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/tools/node_modules/hyparquet/src/hyparquet.js';
const file = await asyncBufferFromFile('/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/pq/p0.parquet');
const mv = {}; let op = 0, withVar = 0; const vars = new Set(); const ex = [];
await parquetRead({ file, columns: ['FEN', 'Moves', 'Themes', 'OpeningTags', 'Rating', 'Popularity'], onComplete: (rows) => {
  for (const [fen, moves, th, tags, r, pop] of rows) { if (!th || !th.includes('opening') || !tags) continue; op++;
    const n = +fen.split(' ')[5]; const b = n <= 8 ? '<=8' : n <= 12 ? '9-12' : n <= 15 ? '13-15' : '16+'; mv[b] = (mv[b] || 0) + 1;
    if (tags.length > 1) { withVar++; vars.add(tags[1]); }
    if (tags[0] === 'Kings_Indian_Defense' && r <= 1600 && ex.length < 4) ex.push([fen, moves, r, pop, tags.join(' '), th.join(',')]); }
} });
console.log('opening-phase tagged', op, 'move number', JSON.stringify(mv), 'with a variation tag', withVar, 'distinct variation tags', vars.size);
for (const e of ex) console.log(e.join(' | '));
