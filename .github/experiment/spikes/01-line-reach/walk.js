const { Chess } = require('/home/user/chess-opening-explorer/node_modules/chess.js');
const svc = require('/home/user/chess-opening-explorer/packages/api/src/services/position-stats-service.js');
const fs = require('fs');
const D = '/home/user/chess-opening-explorer/api/data/';
const pop = JSON.parse(fs.readFileSync(D + 'popularity_stats.json'));
const P = pop.positions || pop;
const recs = [];
for (const L of 'ABCDE') {
  const d = JSON.parse(fs.readFileSync(D + `eco/eco${L}.json`));
  for (const [fen, r] of Object.entries(d)) recs.push({ fen, ...r, analysis_json: undefined });
}
const band = process.argv[2] || '1400';
const out = [];
for (const r of recs) {
  const sans = r.moves
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/);
  if (sans.length < 9) continue;
  const ps = P[r.fen];
  const games = ps && (ps.games_analyzed || ps.total_games || 0);
  if (!games || games < 5000) continue;
  const c = new Chess();
  const steps = [];
  let reach = 1,
    ok = true;
  for (let i = 0; i < sans.length; i++) {
    const fen = c.fen();
    const b = svc.bandsFor(fen);
    const e = b && b[band];
    if (!e || !e.totalGames || !e.moves.length) {
      try {
        c.move(sans[i]);
      } catch (x) {
        ok = false;
        break;
      }
      steps.push({ ply: i + 1, san: sans[i], unknown: true });
      continue;
    }
    const tot = e.moves.reduce((a, m) => a + m.games, 0);
    const ms = e.moves.map((m) => ({
      san: m.san,
      sh: m.games / tot,
      w: m.whitePct,
      d: m.drawPct,
      b: m.blackPct,
    }));
    let mv;
    try {
      mv = c.move(sans[i]);
    } catch (x) {
      ok = false;
      break;
    }
    const me = ms.find((m) => m.san === mv.san) || { sh: 0 };
    const split = ms[0].sh < 0.6 && ms[1] && ms[1].sh > 0.2;
    steps.push({
      ply: i + 1,
      san: mv.san,
      share: me.sh,
      top: ms[0].san,
      topSh: ms[0].sh,
      second: ms[1] && ms[1].san,
      secSh: ms[1] && ms[1].sh,
      split,
      games: e.totalGames,
      score: me.sh ? (i % 2 === 0 ? me.w + me.d / 2 : me.b + me.d / 2) : null,
    });
    reach *= me.sh || 0;
  }
  if (!ok) continue;
  out.push({ name: r.name, eco: r.eco, moves: r.moves, ply: sans.length, games, reach, steps });
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log('lines', out.length);
