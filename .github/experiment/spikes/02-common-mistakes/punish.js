// For popular-but-losing moves at a band: is the position after it in the shards, and what is the punishing reply?
const fs = require('fs');
const { Chess } = require('/home/user/chess-opening-explorer/node_modules/chess.js');
const svc = require('/home/user/chess-opening-explorer/packages/api/src/services/position-stats-service.js');
const D = 'api/data/position-stats/';
const band = process.argv[2] || '1400';
const eco = {};
for (const L of 'ABCDE')
  Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const hits = [];
for (const f of fs.readdirSync(D)) {
  const s = JSON.parse(fs.readFileSync(D + f));
  for (const [fen, e] of Object.entries(s.positions)) {
    const b = e.bands && e.bands[band];
    if (!b || b.g < 2000) continue;
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
        hits.push({ fen, san: m.san, sh, s, best: best.san, bs: sc(best) });
    }
  }
}
let covered = 0,
  clear = 0;
const ex = [];
const seen = new Set();
for (const h of hits) {
  const c = new Chess(h.fen);
  c.move(h.san);
  const after = svc.bandsFor(c.fen());
  const a = after && after[band];
  if (!a || !a.moves.length) continue;
  covered++;
  const white = c.turn() === 'w';
  const tot = a.moves.reduce((x, m) => x + m.games, 0);
  const sc = (m) => ((white ? m.whitePct : m.blackPct) + m.drawPct / 2) / 100;
  const r = a.moves
    .filter((m) => m.games >= 100)
    .map((m) => ({ san: m.san, sh: m.games / tot, s: sc(m) }))
    .sort((x, y) => y.s - x.s)[0];
  const top = a.moves[0];
  const topS = sc(top);
  if (r && r.s >= +(process.argv[3] || 0.58)) {
    clear++;
    if (!seen.has(h.fen)) {
      seen.add(h.fen);
      ex.push(
        `${eco[h.fen] ? eco[h.fen].moves : h.fen} ${h.san}?  -> punish ${r.san} (${(r.sh * 100).toFixed(0)}% find it, scores ${(r.s * 100).toFixed(0)}%); most played ${top.san} ${((top.games / tot) * 100).toFixed(0)}% scores ${(topS * 100).toFixed(0)}%`
      );
    }
  }
}
console.log(
  band,
  'hits',
  hits.length,
  'after-position in shards',
  covered,
  'with a reply scoring 58%+',
  clear
);
ex.slice(0, 12).forEach((x) => console.log(' ', x));
