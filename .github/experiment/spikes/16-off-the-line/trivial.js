// Night 11: how many sound clear replies are trivial (castling, recapture on the deviation's square)?
// And lines covered by idea 21 (1+ sound clear deviation) or idea 22 (3+ near puzzles), and both.
const fs = require('fs'); const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const sf = JSON.parse(fs.readFileSync(process.argv[2])); const d = JSON.parse(fs.readFileSync(process.argv[3])); const N = JSON.parse(fs.readFileSync(process.argv[4]));
const sound = new Map(sf.filter((x) => x.sound).map((x) => [x.fen, x]));
let castle = 0, recap = 0, other = 0; const ex = [];
for (const x of sound.values()) { const g = new Chess(x.fen); const hist = g.history(); const m = g.move(x.reply);
  if (m.san.startsWith('O-O')) castle++; else if (m.captured) recap++; else { other++; if (ex.length < 400) ex.push(x.reply); } }
const devLines = new Set(), devLines2 = new Set(), nonTriv = new Set();
for (const l of d) { const ok = l.kept.filter((x) => x.clear && sound.has(x.fen)); if (ok.length) devLines.add(l.fen); if (ok.length >= 2) devLines2.add(l.fen);
  if (ok.some((x) => { const m = new Chess(x.fen).move(sound.get(x.fen).reply); return !m.san.startsWith('O-O') && !m.captured; })) nonTriv.add(l.fen); }
const near = new Set(N.filter((s) => s.c.filter((x) => x[2] >= 0.75 && x[1] >= 0.8).length >= 3).map((s) => s.fen));
const union = new Set([...devLines, ...near]); const both = [...devLines].filter((f) => near.has(f)).length;
const tally = {}; for (const r of ex) tally[r] = (tally[r] || 0) + 1;
console.log(JSON.stringify({ soundPositions: sound.size, castle, capture: recap, other, linesDev: devLines.size, linesDev2: devLines2.size, linesNonTrivialDev: nonTriv.size, linesNear: near.size, union: union.size, both, of: d.length, commonOtherReplies: Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 15) }));
