// Build spike items from engine.js output: for chosen mistakes, the root and after-mistake FENs, the
// band numbers, and every move within TOL cp (default 40) of the engine's best (accepted answers), by MultiPV 5.
// Usage: CHESSJS=<dir> node items.js engine-out.json "<moves prefix>|<san>" ... > items.json
const { spawn } = require('child_process');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const H = JSON.parse(require('fs').readFileSync(process.argv[2]));
const picks = process.argv.slice(3).map((p) => p.split('|'));
const sf = spawn('/usr/games/stockfish');
let buf = '', waiter = null;
sf.stdout.on('data', (d) => { buf += d; if (waiter) waiter(); });
const until = (re) => new Promise((res) => { const chk = () => { if (re.test(buf)) { waiter = null; const o = buf; buf = ''; res(o); } }; waiter = chk; chk(); });
const send = (s) => sf.stdin.write(s + '\n');
const val = (l) => { const m = l.match(/score (cp|mate) (-?\d+)/); return m[1] === 'cp' ? +m[2] : +m[2] > 0 ? 10000 - +m[2] : -10000; };
async function good(fen, depth = 18) {
  send(`position fen ${fen}`); send(`go depth ${depth}`);
  const o = await until(/bestmove/);
  const pv = {}; for (const l of o.split('\n').filter((l) => l.includes(` depth ${depth} `) && l.includes(' multipv '))) pv[l.match(/multipv (\d)/)[1]] = { v: val(l), u: l.match(/ pv (\S+)/)[1] };
  const best = pv[1].v;
  return Object.values(pv).filter((p) => best - p.v <= +(process.env.TOL || 40)).map((p) => { const c = new Chess(fen); return c.move({ from: p.u.slice(0, 2), to: p.u.slice(2, 4), promotion: p.u[4] }).san; });
}
(async () => {
  send('uci'); await until(/uciok/); send('setoption name MultiPV value 5'); send('setoption name Threads value 2'); send('isready'); await until(/readyok/);
  const out = [];
  for (const [prefix, san] of picks) {
    const h = H.find((x) => x.moves.replace(/\s+/g, ' ').startsWith(prefix) && x.san === san && x.moves.replace(/\s+/g, ' ').trim() === prefix);
    if (!h) { process.stderr.write('missing ' + prefix + ' ' + san + '\n'); continue; }
    const c = new Chess(h.fen); c.move(san);
    out.push({ moves: h.moves.replace(/\s+/g, ' ').trim(), family: h.family, fen: h.fen, san, sh: h.sh, s: h.s, rest: h.rest, after: c.fen(), fixes: await good(h.fen), punish: await good(c.fen()), found: h.found });
  }
  console.log(JSON.stringify(out, null, 1)); sf.kill();
})();
// Night 9: items.json = fixes at TOL=80 minus the flagged move itself, punishments at TOL=40 (merged by hand).
