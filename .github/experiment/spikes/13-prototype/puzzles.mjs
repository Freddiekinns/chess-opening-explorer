// Night 10: the prototype's puzzle file. For each page (name + SAN moves), take Lichess CC0
// opening-phase puzzles rated <=1600 with the page's two-level variation tag whose pawns keep
// the line's placed pawns (spikes/12 keptAll, no pawn back home), most played first, top 3.
// Usage: node puzzles.mjs <scratchpad> [pages.json from pages.js] > playThroughPuzzles.json
// With pages.json, pages with fewer than 3 fitting puzzles are left out.
import { createRequire } from 'module';
import fs from 'fs';
const S = process.argv[2]; const req = createRequire(S + '/npm/');
const { Chess } = req('chess.js');
const { asyncBufferFromFile, parquetRead } = await import(S + '/npm/node_modules/hyparquet/src/hyparquet.js');
const PAGES = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])).map((p) => [p.name, p.moves]) : [
  ['Italian Game: Classical Variation, Center Attack', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4'],
  ['Caro-Kann Defense: Advance Variation', 'e4 c6 d4 d5 e5'],
  ['Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ["Queen's Pawn Game: Accelerated London System", 'd4 d5 Bf4'],
];
const tagOf = (name) => name.split(',')[0].replace(/'/g, '').replace(/: /g, '_').replace(/ /g, '_');
const pawns = (fen) => { const s = new Set(); fen.split(' ')[0].split('/').forEach((r, i) => { let f = 0; for (const ch of r) { if (/\d/.test(ch)) f += +ch; else { if (ch === 'P' || ch === 'p') s.add(ch + 'abcdefgh'[f] + (8 - i)); f++; } } }); return s; };
const kept = (p, P) => { const w = p[0] === 'P'; for (let q = +p[2]; q >= 1 && q <= 8; q += w ? 1 : -1) if (P.has(p[0] + p[1] + q)) return true; return false; };
const home = pawns(new Chess().fen());
const spec = PAGES.map(([name, mv]) => { const c = new Chess(); for (const m of mv.split(' ')) c.move(m); const end = pawns(c.fen());
  return { name, fen: c.fen(), tag: tagOf(name), left: [...home].filter((p) => !end.has(p)), placed: [...end].filter((p) => !home.has(p)), out: [] }; });
const BY = {}; for (const s of spec) (BY[s.tag] = BY[s.tag] || []).push(s);
for (const i of [0, 1, 2]) {
  const file = await asyncBufferFromFile(`${S}/pz/p${i}.parquet`);
  await parquetRead({ file, columns: ['PuzzleId', 'FEN', 'Moves', 'Themes', 'OpeningTags', 'Rating', 'NbPlays'], onComplete: (rows) => {
    for (const [id, fen, moves, th, ot, rating, plays] of rows) { if (!ot || !th || !th.includes('opening') || rating > 1600) continue;
      const t = Array.isArray(ot) ? ot : String(ot).split(' ');
      for (const tg of t) for (const s of BY[tg] || []) { const P = pawns(fen);
        if (s.left.some((p) => P.has(p)) || !s.placed.every((p) => kept(p, P))) continue;
        s.out.push({ id, fen, moves: String(moves).split(' '), rating, plays, themes: Array.isArray(th) ? th : String(th).split(' ') }); } } } });
}
const res = {};
for (const s of spec) if (!process.argv[3] || s.out.length >= 3) res[s.fen] = { name: s.name, tag: s.tag, candidates: s.out.length,
  puzzles: s.out.sort((a, b) => b.plays - a.plays).slice(0, 3).map(({ id, fen, moves, rating }) => ({ id, fen, moves, rating })) };
console.log(JSON.stringify(res, null, 1));
