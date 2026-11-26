// Puzzle check: in the position after each mistake, is the punishing reply unique?
// MultiPV 2 at a fixed depth; gap = best minus second best (cp, punisher's view).
// Also checks the "fix" side: at the root, gap between the best move and the mistake is already known.
// Usage: CHESSJS=<dir> node unique.js engine-out.json <depth> > unique.json
const { spawn } = require('child_process');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const H = JSON.parse(require('fs').readFileSync(process.argv[2])).filter((h) => h.root - h.ev[h.san] >= 100 && h.rest - h.s >= 0.03);
const depth = +(process.argv[3] || 18);
const sf = spawn('/usr/games/stockfish');
let buf = '', waiter = null;
sf.stdout.on('data', (d) => { buf += d; if (waiter) waiter(); });
const until = (re) => new Promise((res) => { const chk = () => { if (re.test(buf)) { waiter = null; const o = buf; buf = ''; res(o); } }; waiter = chk; chk(); });
const send = (s) => sf.stdin.write(s + '\n');
const val = (l) => { const m = l.match(/score (cp|mate) (-?\d+)/); return m[1] === 'cp' ? +m[2] : +m[2] > 0 ? 10000 - +m[2] : -10000; };
(async () => {
  send('uci'); await until(/uciok/); send('setoption name MultiPV value 2'); send('setoption name Threads value 2'); send('isready'); await until(/readyok/);
  const out = [];
  for (const h of H) {
    const c = new Chess(h.fen); c.move(h.san); const fen = c.fen();
    send(`position fen ${fen}`); send(`go depth ${depth}`);
    const o = await until(/bestmove/);
    const ls = o.split('\n').filter((l) => l.includes(` depth ${depth} `) && l.includes(' multipv '));
    const pv = {}; for (const l of ls) pv[l.match(/multipv (\d)/)[1]] = { v: val(l), mv: l.match(/ pv (\S+)/)[1] };
    const san = (u) => { const cc = new Chess(fen); try { return cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return u; } };
    out.push({ moves: h.moves, san: h.san, family: h.family, best: pv[1] && san(pv[1].mv), v1: pv[1] && pv[1].v, second: pv[2] && san(pv[2].mv), v2: pv[2] && pv[2].v, gap: pv[1] && pv[2] ? pv[1].v - pv[2].v : null });
  }
  console.log(JSON.stringify(out)); sf.kill();
})();
