const L = require('./w1400.json');
const q = (a, p) => {
  a = [...a].sort((x, y) => x - y);
  return a[Math.floor(p * (a.length - 1))];
};
const pct = (x) => (x * 100).toFixed(1) + '%';
const rows = { raw: [], cond4: [], ceil: [], ratio: [], cond4ceil: [] };
for (const l of L) {
  let best = null;
  for (const side of [0, 1]) {
    // learner side 0=white -> opp steps are odd ply (black)
    let r = 1,
      rc = 1,
      ceil = 1,
      cc = 1;
    for (const s of l.steps) {
      const opp = (s.ply % 2 === 0) === (side === 0);
      if (!opp || s.unknown) continue;
      r *= s.share || 0;
      ceil *= s.topSh;
      if (s.ply > 4) {
        rc *= s.share || 0;
        cc *= s.topSh;
      }
    }
    if (!best || r > best.r) best = { r, rc, ceil, cc };
  }
  rows.raw.push(best.r);
  rows.cond4.push(best.rc);
  rows.ceil.push(best.ceil);
  rows.cond4ceil.push(best.cc);
  rows.ratio.push(best.r / best.ceil);
}
for (const k in rows)
  console.log(
    k,
    [0.1, 0.25, 0.5, 0.75, 0.9]
      .map((p) => (k === 'ratio' ? q(rows[k], p).toFixed(2) : pct(q(rows[k], p))))
      .join(' ')
  );
