const fs = require('fs');
const D = 'api/data/position-stats/';
const eco = {};
for (const L of 'ABCDE')
  Object.assign(eco, JSON.parse(fs.readFileSync(`api/data/eco/eco${L}.json`)));
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
function hitsAt(band, variant) {
  const out = [];
  for (const [fen, e] of Object.entries(pos)) {
    const b = e.bands && e.bands[band];
    if (!b || b.g < 2000) continue;
    const white = fen.split(' ')[1] === 'w';
    const tot = b.moves.reduce((a, m) => a + m.g, 0);
    const sc = (m) => ((white ? m.w : m.b) + m.d / 2) / m.g;
    const mean = b.moves.reduce((a, m) => a + (white ? m.w : m.b) + m.d / 2, 0) / tot;
    const best = b.moves
      .filter((m) => m.g >= Math.max(200, tot * 0.05))
      .sort((x, y) => sc(y) - sc(x))[0];
    for (const m of b.moves) {
      const sh = m.g / tot;
      if (sh < 0.2 || m.g < 500) continue;
      const s = sc(m);
      let ok;
      if (variant === 'orig') ok = s <= 0.44 && best && sc(best) - s >= 0.08;
      else {
        // strict: alternative = most played OTHER move with >=15% share; gap>=8 vs it, and >=5 below position mean... use mean excluding m
        const alt = b.moves
          .filter((x) => x !== m && x.g / tot >= 0.15)
          .sort((x, y) => y.g - x.g)[0];
        const restG = tot - m.g,
          rest = (mean * tot - s * m.g) / restG;
        ok = s <= 0.44 && alt && sc(alt) - s >= 0.08 && rest - s >= 0.06;
      }
      if (ok)
        out.push({ fen, san: m.san, s, sh, white, g: b.g, bestsh: best.g / tot, bests: sc(best) });
    }
  }
  return out;
}
const sc = (b, san, white) => {
  const m = b && b.moves.find((x) => x.san === san);
  if (!m || m.g < 200) return null;
  return ((white ? m.w : m.b) + m.d / 2) / m.g;
};
const o = hitsAt('1400', 'orig'),
  st = hitsAt('1400', 'strict');
console.log(
  'orig',
  o.length,
  'strict',
  st.length,
  'orig by side W/B',
  o.filter((h) => h.white).length,
  o.filter((h) => !h.white).length
);
console.log('orig: best alt share<15%:', o.filter((h) => h.bestsh < 0.15).length);
// cross-band replication: same move, gap vs best still >=8 at u1400 and 2200?
for (const B of ['u1400', '1800', '2200']) {
  let n = 0,
    rep = 0,
    below44 = 0;
  for (const h of o) {
    const b = pos[h.fen].bands[B];
    const s = sc(b, h.san, h.white);
    if (s == null) continue;
    n++;
    if (s <= 0.44) below44++;
    const tot = b.moves.reduce((a, m) => a + m.g, 0);
    const best = Math.max(
      ...b.moves
        .filter((m) => m.g >= Math.max(200, tot * 0.05))
        .map((m) => sc(b, m.san, h.white) ?? 0)
    );
    if (best - s >= 0.08) rep++;
  }
  console.log(B, 'with data', n, 'still <=44%', below44, 'gap>=8 vs best', rep);
}
// coverage on/ahead (by moves prefix, <=4 ply) for obscure pages
const ply = (s) =>
  s
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/).length;
const mset = new Map();
for (const h of o) {
  const r = eco[h.fen];
  if (r)
    mset.set(
      h.fen,
      r.moves
        .replace(/\d+\.(\.\.)?/g, ' ')
        .trim()
        .split(/\s+/)
        .join(' ')
    );
}
const pages = Object.entries(eco);
let cat = { on: 0, ahead: 0, none: 0 },
  obs = { on: 0, ahead: 0, none: 0, n: 0 };
const msList = [...mset.entries()];
for (const [fen, r] of pages) {
  const mv = r.moves
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .join(' ');
  const p = ply(r.moves);
  let c = 'none';
  if (mset.has(fen)) c = 'on';
  else if (msList.some(([f, m]) => m.startsWith(mv + ' ') && ply(m) - p <= 4)) c = 'ahead';
  cat[c]++;
  const g = pos[fen] && pos[fen].bands && pos[fen].bands['1400'];
  const gg = g ? g.g : 0;
  if (gg < 2000) {
    obs.n++;
    obs[c]++;
  }
}
console.log('all pages', cat, 'pages <2000 games at 1400', obs);
