// Night 11: puzzles whose board still looks like the line's end. For each popular line (pages.json),
// Lichess CC0 puzzles with the line's variation tag, rated <=1600, and score how many of the end
// position's pieces stand on the same square in the puzzle (sim), and how many moves later it starts.
// Usage: node near.mjs <scratchpad> pages.json > near.json
import { createRequire } from 'module'; import fs from 'fs';
const S = process.argv[2]; const req = createRequire(S + '/npm/'); const { Chess } = req('chess.js');
const { asyncBufferFromFile, parquetRead } = await import(S + '/npm/node_modules/hyparquet/src/hyparquet.js');
const pages = JSON.parse(fs.readFileSync(process.argv[3]));
const tagOf = (name) => name.split(',')[0].replace(/'/g, '').replace(/: /g, '_').replace(/ /g, '_');
const at = (fen) => { const m = {}; fen.split(' ')[0].split('/').forEach((r, i) => { let f = 0; for (const ch of r) { if (/\d/.test(ch)) f += +ch; else { m['abcdefgh'[f] + (8 - i)] = ch; f++; } } }); return m; };
const k4 = (f) => f.split(' ').slice(0, 4).join(' ');
// Night 11 critic: a puzzle must be reachable from the line's end. Every pawn the line moved is still
// there or further up its file, no castling right comes back, and the line's last move still stands.
const pawnsOf = (fen) => Object.entries(at(fen)).filter(([, c]) => c === 'P' || c === 'p').map(([q, c]) => c + q);
const reach = (s, fen) => { const P = at(fen);
  for (const pw of s.placed) { const w = pw[0] === 'P'; let ok = false; for (let r = +pw[2]; r >= 1 && r <= 8; r += w ? 1 : -1) if (P[pw[1] + r] === pw[0]) ok = true; if (!ok) return false; }
  for (const [q, c] of s.minors) if (P[q] === c) return false; // a developed minor is not back home
  for (const q of s.emptied) if (P[q.slice(1)] === q[0]) return false; // a pawn cannot return home
  const n = (c) => Object.values(P).filter((x) => x === c).length; if (n('P') > s.nP || n('p') > s.np) return false;
  const cr = fen.split(' ')[2]; for (const ch of cr) if (ch !== '-' && !s.castle.includes(ch)) return false;
  return P[s.last[0]] === s.last[1] || +fen.split(' ')[5] > s.move + 1; };
const spec = pages.map((p) => { const c = new Chess(); const inLine = new Set([k4(c.fen())]); let lastMv; for (const m of p.moves.split(' ')) { lastMv = c.move(m); inLine.add(k4(c.fen())); }
  const home = new Set(pawnsOf(new Chess().fen())); const placed = pawnsOf(c.fen()).filter((q) => !home.has(q));
  const endP = new Set(pawnsOf(c.fen())); const emptied = [...home].filter((q) => !endP.has(q));
  const nP = [...endP].filter((q) => q[0] === 'P').length, np = endP.size - nP;
  const E0 = at(c.fen()); const minors = [['b1', 'N'], ['g1', 'N'], ['c1', 'B'], ['f1', 'B'], ['b8', 'n'], ['g8', 'n'], ['c8', 'b'], ['f8', 'b']].filter(([q, x]) => E0[q] !== x);
  const castle = c.fen().split(' ')[2]; const last = [lastMv.to, lastMv.color === 'w' ? lastMv.piece.toUpperCase() : lastMv.piece];
  const E = at(c.fen()); const I = at(new Chess().fen()); const D = Object.entries(E).filter(([q, pc]) => I[q] !== pc); return { placed, minors, emptied, nP, np, castle, last, D, name: p.name, fen: p.fen, tag: tagOf(p.name), E, n: Object.keys(E).length, move: +c.fen().split(' ')[5], inLine, c: [] }; });
const BY = {}; for (const s of spec) (BY[s.tag] = BY[s.tag] || []).push(s);
for (const i of [0, 1, 2]) {
  const file = await asyncBufferFromFile(`${S}/pq/p${i}.parquet`);
  for (let r = 0; ; r += 250000) { let rows = [];
    await parquetRead({ file, columns: ['PuzzleId', 'FEN', 'Moves', 'Rating', 'Popularity', 'OpeningTags'], rowStart: r, rowEnd: r + 250000, onComplete: (x) => (rows = x) });
    if (!rows.length) break;
    for (const [id, fen, moves, rating, pop, tags] of rows) { if (!tags || rating > 1600) continue;
      for (const t of tags) for (const s of BY[t] || []) { if (s.inLine.has(k4(fen))) continue; const P = at(fen); let same = 0;
        for (const [sq, pc] of Object.entries(s.E)) if (P[sq] === pc) same++;
        let def = 0; for (const [sq, pc] of s.D) if (P[sq] === pc) def++;
        s.total = (s.total || 0) + 1; if (same / s.n < 0.5) continue;
        s.c.push([id, +(same / s.n).toFixed(2), +(def / s.D.length).toFixed(2), +fen.split(' ')[5] - s.move, rating, pop, fen, moves]); } }
    if (rows.length < 250000) break; }
  console.error('file', i, 'done');
}
if (process.env.OUT) { const o = {}; for (const s of spec) { const b = { white: [], black: [] };
  const seenF = new Set();
  for (const x of s.c.filter((x) => x[2] >= 0.75 && x[1] >= 0.8 && reach(s, x[6])).sort((a, b) => b[2] - a[2] || b[1] - a[1] || b[5] - a[5])) { const solver = x[6].split(' ')[1] === 'w' ? 'black' : 'white'; if (seenF.has(k4(x[6]))) continue; seenF.add(k4(x[6])); if (b[solver].length < 3) b[solver].push({ id: x[0], fen: x[6], moves: x[7].split(' '), rating: x[4] }); }
  if (b.white.length || b.black.length) o[s.fen] = b; }
  fs.writeFileSync(process.env.OUT, JSON.stringify(o)); }
for (const s of spec) { s.c.sort((a, b) => b[2] - a[2] || b[1] - a[1] || b[5] - a[5]); s.near = s.c.length; s.c = s.c.slice(0, 12); s.nD = s.D.length; delete s.D; delete s.E; delete s.inLine; }
console.log(JSON.stringify(spec));
