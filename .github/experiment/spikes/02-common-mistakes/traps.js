// Idea 8: positions where, at a band, a popular move (>=20%) scores badly for its mover
const fs = require('fs');
const D = 'api/data/position-stats/';
const eco = {};
for (const L of 'ABCDE')
  Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const band = process.argv[2] || '1400';
let total = 0;
const hits = [];
for (const f of fs.readdirSync(D)) {
  const s = JSON.parse(fs.readFileSync(D + f));
  for (const [fen, e] of Object.entries(s.positions)) {
    const b = e.bands && e.bands[band];
    if (!b || b.g < 2000) continue;
    total++;
    const white = fen.split(' ')[1] === 'w';
    const tot = b.moves.reduce((a, m) => a + m.g, 0);
    const sc = (m) => ((white ? m.w : m.b) + m.d / 2) / m.g;
    const best = b.moves
      .filter((m) => m.g >= Math.max(200, tot * 0.05))
      .sort((x, y) => sc(y) - sc(x))[0];
    for (const m of b.moves) {
      const sh = m.g / tot;
      if (sh < 0.2 || m.g < 500) continue;
      const s = sc(m);
      if (s <= 0.44 && best && sc(best) - s >= 0.08)
        hits.push({
          fen,
          name: eco[fen] && eco[fen].name,
          moves: eco[fen] && eco[fen].moves,
          san: m.san,
          sh,
          s,
          best: best.san,
          bs: sc(best),
          bsh: best.g / tot,
          g: b.g,
        });
    }
  }
}
console.log(
  band,
  'positions with 2000+ games:',
  total,
  'popular-but-losing moves:',
  hits.length,
  'distinct positions:',
  new Set(hits.map((h) => h.fen)).size
);
hits.sort((a, b) => b.g - a.g);
for (const h of hits.slice(0, 14))
  console.log(
    `${h.g} | ${h.moves} | ${h.san} ${(h.sh * 100).toFixed(0)}% scores ${(h.s * 100).toFixed(0)}% vs ${h.best} ${(h.bsh * 100).toFixed(0)}% scores ${(h.bs * 100).toFixed(0)}% | ${h.name}`
  );
