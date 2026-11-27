// Night 10: does a line's end lead to a next lesson? For each prototype page (pages.json), play
// the end position's top 3 moves at 1400 (5%+ share) and ask whether the result is a named page,
// and whether that page (or a deeper named line through it) is itself a play-through page.
// Usage (repo root): CHESSJS=<dir> node next.js pages.json puzzles.json
const fs = require('fs'); const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const ps = require(process.cwd() + '/packages/api/src/services/position-stats-service');
const pages = JSON.parse(fs.readFileSync(process.argv[2])); const puz = JSON.parse(fs.readFileSync(process.argv[3]));
const eco = {}; for (const f of fs.readdirSync('api/data/eco')) Object.assign(eco, JSON.parse(fs.readFileSync('api/data/eco/' + f)));
const k4 = (f) => f.split(' ').slice(0, 4).join(' '); const named = new Set(Object.keys(eco).map(k4));
const pageSet = new Set(pages.map((p) => k4(p.fen))); const puzSet = new Set(Object.keys(puz).map(k4));
let anyNamed = 0, anyPage = 0, anyPuz = 0; const ex = [];
for (const p of pages) { const b = ps.bandsFor(p.fen); const r = b && b['1400']; if (!r) continue;
  const tot = r.moves.reduce((a, m) => a + m.games, 0); let n = 0, pg = 0, pz = 0;
  for (const m of r.moves.slice(0, 3)) { if (m.games / tot < 0.05) continue; const c = new Chess(p.fen); c.move(m.san); const f = k4(c.fen());
    if (named.has(f)) n++; if (pageSet.has(f)) pg++; if (puzSet.has(f)) pz++; }
  if (n) anyNamed++; if (pg) anyPage++; if (pz) anyPuz++; if (pz && ex.length < 5) ex.push(p.name); }
console.log(JSON.stringify({ pages: pages.length, anyNamed, anyPage, anyPuz, ex }));
