import fs from 'fs';
import { asyncBufferFromFile, parquetRead } from '/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/tools/node_modules/hyparquet/src/hyparquet.js';
const want = process.argv[2]; const file = await asyncBufferFromFile('/tmp/claude-0/-home-user-chess-opening-explorer/a2cfd5f8-5aff-5981-affa-fcd1f6680f76/scratchpad/pq/p0.parquet'); const out = [];
await parquetRead({ file, columns: ['PuzzleId','FEN','Moves','Themes','OpeningTags','Rating','Popularity','NbPlays','GameId'], onComplete: (rows) => { for (const r of rows) { const [id,fen,mv,th,tags,rat,pop,nb,g] = r; if (tags && tags.includes(want) && th.includes('opening')) out.push({id,fen,moves:mv,themes:th,rating:rat,pop,nb,game:g}); } } });
out.sort((a,b)=>b.nb-a.nb); console.log(JSON.stringify(out));
