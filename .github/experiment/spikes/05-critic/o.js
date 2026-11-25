const fs = require('fs');
const D = 'api/data/position-stats/';
const eco = {};
for (const L of 'ABCDE')
  Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
// relaxed: position>=300 band games, move share>=20% & >=100 games, score<=44, alt (>=15% share, most played other) >=10 better
let n = 0,
  hit = 0;
const strict = new Set();
for (const [fen, r] of Object.entries(eco)) {
  const b = pos[fen] && pos[fen].bands && pos[fen].bands['1400'];
  if (!b || b.g >= 2000) continue;
  if (b.g < 300) continue;
  n++;
  const white = fen.split(' ')[1] === 'w';
  const tot = b.moves.reduce((a, m) => a + m.g, 0);
  const sc = (m) => ((white ? m.w : m.b) + m.d / 2) / m.g;
  for (const m of b.moves) {
    if (m.g / tot < 0.2 || m.g < 100) continue;
    const alt = b.moves.filter((x) => x !== m && x.g / tot >= 0.15).sort((x, y) => y.g - x.g)[0];
    if (sc(m) <= 0.44 && alt && sc(alt) - sc(m) >= 0.1) {
      hit++;
      break;
    }
  }
}
console.log('obscure pages with 300-1999 band games', n, 'with own relaxed mistake', hit);
let none = 0;
for (const [fen] of Object.entries(eco)) {
  const b = pos[fen] && pos[fen].bands && pos[fen].bands['1400'];
  if (!b || b.g < 300) none++;
}
console.log('pages <300 band games or null', none);
