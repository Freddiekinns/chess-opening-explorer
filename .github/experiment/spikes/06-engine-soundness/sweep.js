// Engine-first sweep: every named position with N+ games at a band; Stockfish evals the root and every
// move with 15%+ share (50+ games). Worker k of K handles positions i % K == k.
// Writes one JSON line per position (so a crash keeps what is done); skips mate/stalemate positions.
// Usage (repo root): CHESSJS=<dir> node sweep.js <band> <minGames> <depth> <k> <K> > part.jsonl
const fs = require('fs');
const { spawn } = require('child_process');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const [band, minG, depth, k, K] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const D = 'api/data/position-stats/';
const pos = {};
for (const f of fs.readdirSync(D)) Object.assign(pos, JSON.parse(fs.readFileSync(D + f)).positions);
const todo = Object.entries(pos).filter(([, e]) => e.bands && e.bands[band] && e.bands[band].g >= minG).filter((_, i) => i % K === k);
const sf = spawn('/usr/games/stockfish');
let buf = '', waiter = null;
sf.stdout.on('data', (d) => { buf += d; if (waiter) waiter(); });
const until = (re) => new Promise((res) => { const chk = () => { if (re.test(buf)) { waiter = null; const o = buf; buf = ''; res(o); } }; waiter = chk; chk(); });
const send = (s) => sf.stdin.write(s + '\n');
async function ev(fen, mv) {
  send(`position fen ${fen}${mv ? ' moves ' + mv : ''}`); send(`go depth ${depth}`);
  const out = await until(/bestmove (\S+)/);
  const ls = out.split('\n').filter((l) => l.includes(' score ')); const m = ls[ls.length - 1].match(/score (cp|mate) (-?\d+)/);
  return { v: m[1] === 'cp' ? +m[2] : +m[2] > 0 ? 10000 : -10000, best: out.match(/bestmove (\S+)/)[1] };
}
(async () => {
  send('uci'); await until(/uciok/); send('setoption name Hash value 64'); send('isready'); await until(/readyok/);
  for (const [fen, e] of todo) {
    const b = e.bands[band]; const tot = b.moves.reduce((a, m) => a + m.g, 0);
    const root = await ev(fen);
    if (root.best === '(none)') continue;
    const c = new Chess(fen); const bm = c.move({ from: root.best.slice(0, 2), to: root.best.slice(2, 4), promotion: root.best[4] });
    const moves = [];
    for (const m of b.moves.filter((m) => m.g / tot >= 0.15 && m.g >= 50)) {
      const cc = new Chess(fen); const mv = cc.move(m.san);
      const r = await ev(fen, mv.from + mv.to + (mv.promotion || ''));
      moves.push({ san: m.san, v: -r.v, reply: (() => { try { return cc.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }).san; } catch { return r.best; } })() });
    }
    console.log(JSON.stringify({ fen, g: b.g, root: root.v, best: bm.san, moves }));
  }
  sf.kill();
})();
