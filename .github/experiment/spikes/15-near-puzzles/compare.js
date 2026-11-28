// Night 11: how "near" are night 10's chosen puzzles, vs the near filter's top 3 (sim >= 0.8,
// moved pieces kept >= 0.75)? Usage: node compare.js old-puzzles.json near.json [names…]
const P = require(process.argv[2]); const N = require(process.argv[3]);
const at = (fen) => { const m = {}; fen.split(' ')[0].split('/').forEach((r, i) => { let f = 0; for (const ch of r) { if (/\d/.test(ch)) f += +ch; else { m['abcdefgh'[f] + (8 - i)] = ch; f++; } } }); return m; };
const sim = (e, p) => { const E = at(e), Q = at(p); let s = 0; for (const [q, c] of Object.entries(E)) if (Q[q] === c) s++; return s / Object.keys(E).length; };
const old = []; const dmOld = [];
for (const [fen, v] of Object.entries(P)) for (const side of ['white', 'black']) for (const p of v[side] || []) { old.push(sim(fen, p.fen)); dmOld.push(+p.fen.split(' ')[5] - +fen.split(' ')[5]); }
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(f * (s.length - 1))].toFixed(2); };
console.log('night 10 puzzles', old.length, 'sim median', q(old, 0.5), 'p25', q(old, 0.25), 'share >=0.8', +(old.filter((x) => x >= 0.8).length / old.length).toFixed(2), 'moves after end median', q(dmOld, 0.5));
const nw = [], dmN = []; for (const s of N) { const ok = s.c.filter((x) => x[2] >= 0.75 && x[1] >= 0.8).slice(0, 3); if (ok.length < 3) continue; for (const x of ok) { nw.push(x[1]); dmN.push(x[3]); } }
console.log('near top3', nw.length, 'sim median', q(nw, 0.5), 'moves after end median', q(dmN, 0.5), 'p10', q(dmN, 0.1), 'p90', q(dmN, 0.9));
for (const name of process.argv.slice(4)) { const s = N.find((x) => x.name === name); if (!s) continue; console.log('\n' + name, 'tagged', s.total, 'near', s.near); for (const x of s.c.slice(0, 3)) console.log(' ', x[0], 'sim', x[1], 'moved pieces kept', x[2], 'dm', x[3], 'r', x[4], x[6], x[7]); }
