// Engine-first common mistakes from sweep.js output, joined to the shards.
// A mistake: position not already decided (|eval| <= 250), move played by 20%+ at the band, loses 100+ cp.
// Usage (repo root): CHESSJS=<dir> node mistakes.js sweep.jsonl <band> [list|json]
const fs = require('fs');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const [file, band, mode] = process.argv.slice(2);
const D = 'api/data/position-stats/';
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
const byKey = {};
for (const [fen, e] of Object.entries(pos)) byKey[fen.split(' ').slice(0, 4).join(' ')] = e;
const eco = {};
for (const L of 'ABCDE') Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = [];
for (const r of rows) {
  if (Math.abs(r.root) > 250) continue;
  const b = pos[r.fen].bands[band];
  const tot = b.moves.reduce((a, m) => a + m.g, 0);
  const white = r.fen.split(' ')[1] === 'w';
  const sc = (m) => ((white ? m.w : m.b) + m.d / 2) / m.g;
  const mean = b.moves.reduce((a, m) => a + (white ? m.w : m.b) + m.d / 2, 0) / tot;
  for (const e of r.moves) {
    const m = b.moves.find((x) => x.san === e.san);
    const sh = m.g / tot, loss = r.root - e.v;
    if (sh < 0.2 || loss < 100) continue;
    const rest = (mean * tot - sc(m) * m.g) / (tot - m.g);
    const bm = b.moves.find((x) => x.san === r.best);
    // punishment: is the position after the mistake named, and how often does the band find the engine reply?
    const c = new Chess(r.fen); c.move(e.san);
    const a = byKey[c.fen().split(' ').slice(0, 4).join(' ')];
    const ab = a && a.bands && a.bands[band];
    let found = null, foundS = null;
    if (ab && ab.g >= 50) {
      const at = ab.moves.reduce((x, y) => x + y.g, 0); const rm = ab.moves.find((x) => x.san === e.reply);
      found = rm ? rm.g / at : 0; foundS = rm && rm.g >= 30 ? ((!white ? rm.w : rm.b) + rm.d / 2) / rm.g : null;
    }
    const rec = eco[r.fen] || {};
    out.push({ fen: r.fen, family: rec.family_id || '(none)', name: rec.name, moves: rec.moves, g: b.g, san: e.san, sh, s: sc(m), rest, loss, best: r.best, bestSh: bm ? bm.g / tot : 0, bestS: bm && bm.g >= 30 ? sc(bm) : null, reply: e.reply, found, foundS, root: r.root });
  }
}
const P = (x) => (x == null ? '–' : Math.round(x * 100));
if (mode === 'json') { console.log(JSON.stringify(out)); process.exit(); }
const costs = out.filter((o) => o.rest - o.s >= 0.03);
console.log(band, 'positions', rows.length, 'mistakes', out.length, 'positions with one', new Set(out.map((o) => o.fen)).size);
console.log('  ...that also score 3+ points below the rest at this band (the mistake costs here):', costs.length);
console.log('  ...where the punishing reply is in the shards:', out.filter((o) => o.found != null).length, ' found by under 30%:', out.filter((o) => o.found != null && o.found < 0.3).length);
const fam = {}; for (const o of costs) fam[o.family] = (fam[o.family] || 0) + 1;
const famAll = {}; for (const r of Object.values(eco)) famAll[r.family_id || '(none)'] = (famAll[r.family_id || '(none)'] || 0) + 1;
const fs8 = Object.entries(fam).filter(([, n]) => n >= 8);
console.log('  by family (costs here):', Object.entries(fam).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join(', '));
console.log('  families with 8+:', fs8.length, 'covering', fs8.reduce((a, [f]) => a + famAll[f], 0), 'of', Object.keys(eco).length, 'pages');
if (mode === 'list') for (const o of out.sort((a, b) => b.g - a.g)) console.log(`${o.rest - o.s >= 0.03 ? '*' : ' '} ${o.family} | ${o.moves} | ${o.san} ${P(o.sh)}% scores ${P(o.s)} (rest ${P(o.rest)}) loses ${o.loss}cp | sf ${o.best} ${P(o.bestSh)}% scores ${P(o.bestS)} | punish ${o.reply} found ${P(o.found)}% scores ${P(o.foundS)}`);
