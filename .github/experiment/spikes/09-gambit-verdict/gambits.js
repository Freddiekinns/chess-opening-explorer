const fs = require('fs'); const { spawn } = require('child_process');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const D = 'api/data/position-stats/'; const byKey = {};
for (const f of fs.readdirSync(D)) for (const [fen, e] of Object.entries(JSON.parse(fs.readFileSync(D + f)).positions)) byKey[fen.split(' ').slice(0, 4).join(' ')] = e;
const G = [['Stafford', 'e4 e5 Nf3 Nf6 Nxe5', 'Nc6'], ['Englund', 'd4', 'e5'], ['Latvian', 'e4 e5 Nf3', 'f5'], ['Elephant', 'e4 e5 Nf3', 'd5'], ['Traxler', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', 'Bc5'], ['Halloween', 'e4 e5 Nf3 Nc6 Nc3 Nf6', 'Nxe5'], ['Jerome', 'e4 e5 Nf3 Nc6 Bc4 Bc5', 'Bxf7+'], ['Budapest', 'd4 Nf6 c4', 'e5'], ['Smith-Morra', 'e4 c5', 'd4'], ['Danish', 'e4 e5 d4 exd4', 'c3'], ['Evans', 'e4 e5 Nf3 Nc6 Bc4 Bc5', 'b4'], ['Blackmar-Diemer', 'd4 d5', 'e4'], ['Rousseau', 'e4 e5 Nf3 Nc6 Bc4', 'f5'], ['Fried Liver', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5', 'Nxf7'], ['Icelandic', 'e4 d5 exd5 Nf6 c4', 'e6'], ['Albin', 'd4 d5 c4', 'e5'], ['Scotch Gambit', 'e4 e5 Nf3 Nc6 d4 exd4', 'Bc4'], ['King\'s Gambit', 'e4 e5', 'f4'], ['Benko', 'd4 Nf6 c4 c5 d5', 'b5'], ['Wing (Sicilian)', 'e4 c5', 'b4']];
const sf = spawn('/usr/games/stockfish'); let buf = '', w = null; sf.stdout.on('data', (d) => { buf += d; if (w) w(); });
const until = (re) => new Promise((res) => { const c = () => { if (re.test(buf)) { w = null; const o = buf; buf = ''; res(o); } }; w = c; c(); });
const send = (s) => sf.stdin.write(s + '\n');
(async () => {
  send('uci'); await until(/uciok/); send('setoption name Threads value 4'); send('isready'); await until(/readyok/);
  console.log('gambit | engine (mover, cp) | share and score for the mover: u1400 | 1400 | 1800 | 2200');
  for (const [name, pre, mv] of G) {
    const c = new Chess(); for (const m of pre.split(' ')) c.move(m); const fen = c.fen(); const white = c.turn() === 'w';
    const x = c.move(mv); send(`position fen ${fen} moves ${x.from}${x.to}`); send('go depth 20');
    const o = await until(/bestmove/); const ls = o.split('\n').filter((l) => l.includes(' score ')); const m = ls[ls.length - 1].match(/score (cp|mate) (-?\d+)/); const v = -(m[1] === 'cp' ? +m[2] : Math.sign(+m[2]) * 10000);
    const e = byKey[fen.split(' ').slice(0, 4).join(' ')];
    const cells = ['u1400', '1400', '1800', '2200'].map((b) => { const bb = e && e.bands && e.bands[b]; if (!bb) return '–'; const tot = bb.moves.reduce((a, q) => a + q.g, 0); const q = bb.moves.find((q) => q.san === mv); if (!q || q.g < 50) return '–'; return `${Math.round((q.g / tot) * 100)}% ${Math.round((((white ? q.w : q.b) + q.d / 2) / q.g) * 100)}`; });
    console.log(`${name} | ${v > 0 ? '+' : ''}${v} | ${cells.join(' | ')}`);
  }
  sf.kill();
})();
