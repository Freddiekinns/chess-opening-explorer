// Throwaway: inject items.json plus the band's W/D/L for each move into spike.html's template.
// Usage (repo root): node build.js <band> > spike.html
const fs = require('fs');
const dir = __dirname;
const band = process.argv[2] || '1400';
const D = 'api/data/position-stats/';
const byKey = {};
for (const f of fs.readdirSync(D)) for (const [fen, e] of Object.entries(JSON.parse(fs.readFileSync(D + f)).positions)) byKey[fen.split(' ').slice(0, 4).join(' ')] = e;
const stats = (fen) => {
  const e = byKey[fen.split(' ').slice(0, 4).join(' ')]; const b = e && e.bands && e.bands[band];
  if (!b) return null; const tot = b.moves.reduce((a, m) => a + m.g, 0);
  const white = fen.split(' ')[1] === 'w';
  return Object.fromEntries(b.moves.filter((m) => m.g >= 30).map((m) => [m.san, { share: m.g / tot, win: (white ? m.w : m.b) / m.g, draw: m.d / m.g, loss: (white ? m.b : m.w) / m.g, g: m.g }]));
};
const items = JSON.parse(fs.readFileSync(dir + '/items.json')).map((i) => ({ ...i, rootStats: stats(i.fen), afterStats: stats(i.after) }));
const tpl = fs.readFileSync(dir + '/template.html', 'utf8');
process.stdout.write(tpl.replace('/*ITEMS*/[]', JSON.stringify(items)).replace('/*BAND*/', band));
