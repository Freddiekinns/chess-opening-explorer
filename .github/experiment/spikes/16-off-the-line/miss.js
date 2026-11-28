// Night 11, idea 26: when the learner misses, is their likely wrong move a common one at 1400?
// Per learner ply in popular lines: the most played move other than the line's, its share, and
// the line move's share. Usage (repo root): WT=… node miss.js pages.json
const fs = require('fs'); const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const ps = require(process.cwd() + '/packages/api/src/services/position-stats-service');
const pages = JSON.parse(fs.readFileSync(process.argv[2]));
const side = (n) => { let s = 'w'; for (const m of n.matchAll(/(Defen[cs]e|Declined|Accepted|Countergambit|Counterattack)|(Gambit|Attack|System|Opening)/g)) s = m[1] ? 'b' : 'w'; return s; };
let plies = 0, data = 0, alt10 = 0, alt20 = 0, lineMinor = 0; const seen = new Set();
for (const p of pages) { const mv = p.moves.split(' '); const g = new Chess(); const me = side(p.name);
  for (let i = 0; i < mv.length; i++) { if (g.turn() === me && !seen.has(g.fen())) { seen.add(g.fen()); plies++;
      const r = ps.bandsFor(g.fen())?.['1400']; if (r && r.totalGames >= 500) { data++; const t = r.totalGames;
        const line = r.moves.find((m) => m.san === mv[i]); const alt = r.moves.filter((m) => m.san !== mv[i]).sort((a, b) => b.games - a.games)[0];
        if (alt && alt.games / t >= 0.1) alt10++; if (alt && alt.games / t >= 0.2) alt20++; if (alt && line && alt.games > line.games) lineMinor++; } }
    g.move(mv[i]); } }
console.log(JSON.stringify({ distinctLearnerPositions: plies, withData: data, commonAlt10: alt10, commonAlt20: alt20, altMorePlayedThanLine: lineMinor }));
