// Night 11: is the clear reply sound? Stockfish 16, depth 16, MultiPV 5; sound = within 50 cp of best.
const { spawn } = require('child_process'); const fs = require('fs');
const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const items = JSON.parse(fs.readFileSync(process.argv[2])); const sf = spawn('/usr/games/stockfish'); let buf = ''; let wait = null;
sf.stdout.on('data', (d) => { buf += d; if (wait && buf.includes(wait.tok)) { const b = buf; buf = ''; const w = wait; wait = null; w.res(b); } });
const ask = (cmd, tok) => new Promise((res) => { wait = { tok, res }; sf.stdin.write(cmd + '\n'); });
(async () => { await ask('uci', 'uciok'); sf.stdin.write('setoption name MultiPV value 5\nsetoption name Threads value 4\n'); await ask('isready', 'readyok');
  for (const it of items) { const out = await ask(`position fen ${it.fen}\ngo depth 16`, 'bestmove');
    const pv = {}; for (const line of out.split('\n')) { const m = line.match(/ depth 16 .*multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/); if (m) pv[m[4]] = m[2] === 'cp' ? +m[3] : (+m[3] > 0 ? 10000 : -10000); }
    const best = Math.max(...Object.values(pv)); const mv = new Chess(it.fen).move(it.reply); const u = mv.from + mv.to + (mv.promotion || '');
    it.best = best; it.replyCp = pv[u] ?? null; it.sound = it.replyCp != null && best - it.replyCp <= 50; }
  fs.writeFileSync(process.argv[3], JSON.stringify(items)); const s = items.filter((x) => x.sound).length;
  console.log(JSON.stringify({ n: items.length, sound: s, unsound: items.filter((x) => !x.sound).map((x) => [x.fen, x.reply, x.share, x.best, x.replyCp]).slice(0, 12) })); sf.kill(); })();
