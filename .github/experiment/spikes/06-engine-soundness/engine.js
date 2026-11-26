// Engine check for find.js output: Stockfish eval (mover's view, centipawns) of the root's best move,
// the flagged move, and the "better" moves the panel would name. Container-only Stockfish 16 (apt).
// Usage: CHESSJS=<dir with chess.js> node engine.js hits.json <depth> > evals.json
const { spawn } = require('child_process');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const hits = JSON.parse(require('fs').readFileSync(process.argv[2]));
const depth = +(process.argv[3] || 16);
const sf = spawn('/usr/games/stockfish');
let buf = '', waiter = null;
sf.stdout.on('data', (d) => { buf += d; if (waiter) waiter(); });
const until = (re) => new Promise((res) => { const chk = () => { const m = buf.match(re); if (m) { waiter = null; const out = buf; buf = ''; res(out); } }; waiter = chk; chk(); });
const send = (s) => sf.stdin.write(s + '\n');
async function evalFen(fen, moves = []) {
  send(`position fen ${fen}${moves.length ? ' moves ' + moves.join(' ') : ''}`);
  send(`go depth ${depth}`);
  const out = await until(/bestmove (\S+)/);
  const lines = out.split('\n').filter((l) => l.includes(' score '));
  const last = lines[lines.length - 1];
  const m = last.match(/score (cp|mate) (-?\d+)/);
  const v = m[1] === 'cp' ? +m[2] : (+m[2] > 0 ? 10000 : -10000);
  return { v, best: out.match(/bestmove (\S+)/)[1] };
}
const uci = (fen, san) => { const c = new Chess(fen); const mv = c.move(san); return mv.from + mv.to + (mv.promotion || ''); };
const toSan = (fen, u) => { const c = new Chess(fen); return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; };
(async () => {
  send('uci'); await until(/uciok/);
  send('setoption name Threads value 4'); send('setoption name Hash value 256'); send('isready'); await until(/readyok/);
  const res = [];
  for (const h of hits) {
    const root = await evalFen(h.fen);
    const ev = {};
    for (const san of new Set([h.san, h.best, h.alt].filter(Boolean))) {
      const r = await evalFen(h.fen, [uci(h.fen, san)]);
      ev[san] = -r.v; // after the move it is the opponent's turn
    }
    res.push({ ...h, root: root.v, engineBest: toSan(h.fen, root.best), ev });
    process.stderr.write('.');
  }
  console.log(JSON.stringify(res));
  sf.kill();
})();
