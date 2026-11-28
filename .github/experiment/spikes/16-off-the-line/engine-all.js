// Night 11: every legal reply at each sound deviation position, Stockfish 16 depth 14, MultiPV = all.
// ok = within 50 cp of the best. Usage: WT=… node engine-all.js clear-sf.json > ok.json
const { spawn } = require('child_process'); const fs = require('fs');
const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const items = JSON.parse(fs.readFileSync(process.argv[2])).filter((x) => x.sound);
const sf = spawn('/usr/games/stockfish'); let buf = ''; let wait = null;
sf.stdout.on('data', (d) => { buf += d; if (wait && buf.includes(wait.tok)) { const b = buf; buf = ''; const w = wait; wait = null; w.res(b); } });
const ask = (cmd, tok) => new Promise((res) => { wait = { tok, res }; sf.stdin.write(cmd + '\n'); });
(async () => { await ask('uci', 'uciok'); sf.stdin.write('setoption name Threads value 4\n'); await ask('isready', 'readyok'); const out = {};
  for (const it of items) { const g = new Chess(it.fen); const n = g.moves().length; sf.stdin.write(`setoption name MultiPV value ${n}\n`);
    const o = await ask(`position fen ${it.fen}\ngo depth 14`, 'bestmove'); const pv = {};
    for (const line of o.split('\n')) { const m = line.match(/ depth 14 .*multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/); if (m) pv[m[4]] = m[2] === 'cp' ? +m[3] : (+m[3] > 0 ? 10000 : -10000); }
    const best = Math.max(...Object.values(pv)); const ok = [];
    for (const m of g.moves({ verbose: true })) { const u = m.from + m.to + (m.promotion || ''); if (pv[u] != null && best - pv[u] <= 50) ok.push(m.san); }
    out[it.fen] = { reply: it.reply, ok }; }
  console.log(JSON.stringify(out)); sf.kill(); })();
