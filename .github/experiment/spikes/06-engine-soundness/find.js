// Idea 8/17: collect popular-but-losing moves (night 8's loose and strict rules) at a band,
// with the alternative a "better move" panel would show. Writes JSON for engine.js.
// Usage (repo root): node find.js <band> [minPositionGames=2000] [minMoveGames=500] > hits.json
const fs = require('fs');
const D = 'api/data/position-stats/';
const eco = {};
for (const L of 'ABCDE') Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
const band = process.argv[2] || '1400';
const minG = +(process.argv[3] || 2000), minM = +(process.argv[4] || 500);
const out = [];
for (const [fen, e] of Object.entries(pos)) {
  const b = e.bands && e.bands[band];
  if (!b || b.g < minG) continue;
  const white = fen.split(' ')[1] === 'w';
  const tot = b.moves.reduce((a, m) => a + m.g, 0);
  const sc = (m) => ((white ? m.w : m.b) + m.d / 2) / m.g;
  const mean = b.moves.reduce((a, m) => a + (white ? m.w : m.b) + m.d / 2, 0) / tot;
  const best = b.moves.filter((m) => m.g >= Math.max(minM * 0.4, tot * 0.05)).sort((x, y) => sc(y) - sc(x))[0];
  for (const m of b.moves) {
    const sh = m.g / tot;
    if (sh < 0.2 || m.g < minM) continue;
    const s = sc(m);
    const loose = s <= 0.44 && best && best !== m && sc(best) - s >= 0.08;
    const alt = b.moves.filter((x) => x !== m && x.g / tot >= 0.15).sort((x, y) => y.g - x.g)[0];
    const rest = (mean * tot - s * m.g) / (tot - m.g);
    const strict = s <= 0.44 && alt && sc(alt) - s >= 0.08 && rest - s >= 0.06;
    if (!loose && !strict) continue;
    const r = eco[fen] || {};
    out.push({
      fen, name: r.name, moves: r.moves, family: r.family_id || '(none)', g: b.g,
      san: m.san, sh, s, loose, strict,
      best: best && best.san, bestSh: best && best.g / tot, bestS: best && sc(best),
      alt: alt && alt.san, altSh: alt && alt.g / tot, altS: alt && sc(alt),
    });
  }
}
console.log(JSON.stringify(out));
