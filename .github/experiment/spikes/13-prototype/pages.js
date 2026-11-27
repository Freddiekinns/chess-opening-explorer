// Night 10: which pages would get puzzles in the prototype? Named positions of 6+ ply whose end
// has 5,000+ games at 1400 and whose name has a variation (Lichess tags stop at family + variation).
// Usage (repo root): node pages.js > pages.json
const fs = require('fs'); const ps = require(process.cwd() + '/packages/api/src/services/position-stats-service');
const out = [];
for (const f of fs.readdirSync('api/data/eco')) for (const [fen, o] of Object.entries(JSON.parse(fs.readFileSync('api/data/eco/' + f)))) {
  const plies = (o.moves || '').replace(/\d+\./g, '').split(/\s+/).filter(Boolean);
  if (plies.length < 6 || !o.name || !o.name.includes(':')) continue;
  const b = ps.bandsFor(fen); const g = b && b['1400'] ? b['1400'].totalGames : 0;
  if (g >= 5000) out.push({ fen, name: o.name, moves: plies.join(' '), g });
}
out.sort((a, b) => b.g - a.g); console.log(JSON.stringify(out));
