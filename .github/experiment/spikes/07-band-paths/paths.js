// Idea 15: from a root, follow the most played move at each band while the shards have the position.
// Usage (repo root): CHESSJS=<dir> node paths.js "<moves from start, SAN, space separated>" [maxPly]
const fs = require('fs');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const D = 'api/data/position-stats/';
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
const eco = {};
for (const L of 'ABCDE') Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
// shards key on full FEN; match on the first four fields
const byKey = {};
for (const [fen, e] of Object.entries(pos)) byKey[fen.split(' ').slice(0, 4).join(' ')] = { fen, e };
const key = (c) => c.fen().split(' ').slice(0, 4).join(' ');
const rootMoves = process.argv[2].split(' ');
const maxPly = +(process.argv[3] || 16);
for (const band of ['u1400', '1400', '1800', '2200']) {
  const c = new Chess();
  for (const m of rootMoves) c.move(m);
  const steps = [];
  while (c.history().length < maxPly) {
    const hit = byKey[key(c)];
    const b = hit && hit.e.bands && hit.e.bands[band];
    if (!b || !b.moves.length) { steps.push('|end'); break; }
    const tot = b.moves.reduce((a, m) => a + m.g, 0);
    const top = b.moves.slice().sort((x, y) => y.g - x.g)[0];
    const white = c.turn() === 'w';
    const s = ((white ? top.w : top.b) + top.d / 2) / top.g;
    steps.push(`${top.san}(${Math.round((top.g / tot) * 100)}%,${Math.round(s * 100)})`);
    c.move(top.san);
  }
  const name = (byKey[key(c)] && eco[byKey[key(c)].fen]) ? eco[byKey[key(c)].fen].name : '';
  console.log(band.padEnd(5), steps.join(' '), '->', name);
}
