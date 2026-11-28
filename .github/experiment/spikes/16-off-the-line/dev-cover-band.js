// Night 11: "your opponent deviates" — for each popular line, the opponent's alternatives at 1400
// (10%+ share, 500+ games) inside the line, and whether the shards hold the position after them
// (so the learner's reply has data). Usage (repo root): WT=… node dev-cover.js pages.json > out.json
const BAND = process.env.BAND || '1400'; const fs = require('fs'); const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const ps = require(process.cwd() + '/packages/api/src/services/position-stats-service');
const pages = JSON.parse(fs.readFileSync(process.argv[2]));
// The prototype's defaultSide: the name's last telling word.
const side = (n) => { let s = 'w'; for (const m of n.matchAll(/(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g)) s = m[1] ? 'b' : 'w'; return s; };
const out = []; let lines = 0, with1 = 0, with2 = 0, devs = 0, covered = 0, clear = 0;
for (const p of pages) {
  const mv = p.moves.split(' '); const me = side(p.name); const g = new Chess(); const items = [];
  for (let i = 0; i < mv.length; i++) {
    if (g.turn() !== me) {
      const r = ps.bandsFor(g.fen())?.[BAND];
      if (r) { const tot = r.totalGames;
        for (const m of r.moves) { if (m.san === mv[i] || m.games < 500 || m.games / tot < 0.1) continue;
          devs++; const c = new Chess(g.fen()); c.move(m.san); const rr = ps.bandsFor(c.fen())?.[BAND];
          const it = { ply: i, dev: m.san, share: +(m.games / tot).toFixed(2), fen: c.fen() };
          if (rr && rr.totalGames >= 300) { covered++; const t = rr.moves.slice().sort((a, b) => b.games - a.games);
            it.replies = t.slice(0, 3).map((x) => [x.san, +(x.games / rr.totalGames).toFixed(2)]);
            it.clear = t[0].games / rr.totalGames >= 0.45 && (!t[1] || t[0].games >= 1.5 * t[1].games); if (it.clear) clear++; }
          items.push(it); } } }
    g.move(mv[i]);
  }
  lines++; const ok = items.filter((x) => x.replies); if (ok.length) with1++; if (ok.length >= 2) with2++;
  out.push({ name: p.name, fen: p.fen, side: me, items });
}
console.error(JSON.stringify({ lines, devs, covered, clear, linesWith1: with1, linesWith2: with2 }));
console.log(JSON.stringify(out));
