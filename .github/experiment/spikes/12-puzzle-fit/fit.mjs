// Night 10: do a variation tag's Lichess puzzles come from games that kept the page's line?
// For each line: its Lichess variation tag and SAN moves. A puzzle is "contradicted" if a pawn the
// line moved is back on its home square (pawns never return: the game left the line); "exact" if
// every pawn the line moved off its home square still stands where the line put it.
// Usage: node fit.mjs <scratchpad> > out.json   (reads <scratchpad>/pz/p{0,1,2}.parquet)
import { createRequire } from 'module';
const S = process.argv[2]; const req = createRequire(S + '/npm/');
const { Chess } = req('chess.js');
const { asyncBufferFromFile, parquetRead } = await import(S + '/npm/node_modules/hyparquet/src/hyparquet.js');
const LINES = {
  center_attack: ['Italian_Game_Classical_Variation', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4'],
  kid_orthodox: ['Kings_Indian_Defense_Orthodox_Variation', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5'],
  london: ['Queens_Pawn_Game_London_System', 'd4 d5 Bf4'],
  najdorf: ['Sicilian_Defense_Najdorf_Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  caro_advance: ['Caro-Kann_Defense_Advance_Variation', 'e4 c6 d4 d5 e5'],
  caro_adv_botvinnik: ['Caro-Kann_Defense_Advance_Variation', 'e4 c6 d4 d5 e5 c5'],
  kid_fianchetto: ['Kings_Indian_Defense_Fianchetto_Variation', 'd4 Nf6 c4 g6 Nf3 Bg7 g3'],
  frankenstein: ['Vienna_Game_Frankenstein-Dracula_Variation', 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6'],
};
const pawns = (fen) => { const s = new Set(); const rows = fen.split(' ')[0].split('/');
  rows.forEach((r, i) => { let f = 0; for (const ch of r) { if (/\d/.test(ch)) f += +ch; else { if (ch === 'P' || ch === 'p') s.add(ch + 'abcdefgh'[f] + (8 - i)); f++; } } }); return s; };
// A placed pawn is kept if it still stands there or a pawn of its colour stands further up its file.
const kept = (p, P) => { const w = p[0] === 'P'; const r = +p[2]; for (let q = r; q >= 1 && q <= 8; q += w ? 1 : -1) if (P.has(p[0] + p[1] + q)) return true; return false; };
const home = pawns(new Chess().fen());
const spec = {};
for (const [k, [tag, mv]] of Object.entries(LINES)) { const c = new Chess(); for (const m of mv.split(' ')) c.move(m);
  const end = pawns(c.fen()); spec[k] = { tag, left: [...home].filter((p) => !end.has(p)), placed: [...end].filter((p) => !home.has(p)), out: [] }; }
const TC = {};
const tags = new Set(Object.values(spec).map((s) => s.tag));
for (const i of [0, 1, 2]) {
  const file = await asyncBufferFromFile(`${S}/pz/p${i}.parquet`);
  await parquetRead({ file, columns: ['PuzzleId', 'FEN', 'Moves', 'Themes', 'OpeningTags', 'Rating', 'NbPlays'], onComplete: (rows) => {
    for (const [id, fen, moves, th, ot, rating, plays] of rows) { if (!ot || !th || !th.includes('opening')) continue;
      const t = Array.isArray(ot) ? ot : String(ot).split(' '); for (const x of t) if (/Caro|Vienna|Kings_Indian/.test(x)) TC[x] = (TC[x] || 0) + 1; if (!t.some((x) => tags.has(x))) continue; const P = pawns(fen);
      for (const s of Object.values(spec)) if (t.includes(s.tag)) s.out.push({ id, fen, moves, rating, plays, themes: th,
        contra: s.left.some((p) => P.has(p)), exact: s.placed.every((p) => P.has(p)), kept: s.placed.filter((p) => kept(p, P)).length }); } } });
}
const res = {};
for (const [k, s] of Object.entries(spec)) { const low = s.out.filter((p) => p.rating <= 1600);
  res[k] = { tag: s.tag, placed: s.placed, all: s.out.length, le1600: low.length, notContra: low.filter((p) => !p.contra).length, exact: low.filter((p) => p.exact && !p.contra).length, keptAll: low.filter((p) => !p.contra && p.kept === s.placed.length).length, moveNo: Object.entries(low.reduce((a, p) => { const n = +p.fen.split(' ')[5]; const b = n <= 8 ? '<=8' : n <= 12 ? '9-12' : n <= 16 ? '13-16' : '17+'; a[b] = (a[b] || 0) + 1; return a; }, {})), fit: low.filter((p) => !p.contra && p.kept >= s.placed.length - 1).length,
    top: low.filter((p) => !p.contra && p.kept >= s.placed.length - 1).sort((a, b) => b.plays - a.plays).slice(0, 12).map(({ id, fen, moves, rating, plays, themes }) => ({ id, fen, moves, rating, plays, themes })) }; }
res._tags = Object.entries(TC).sort((a, b) => b[1] - a[1]).slice(0, 60);
console.log(JSON.stringify(res, null, 1));
