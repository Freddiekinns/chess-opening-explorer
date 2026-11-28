// Night 11: the prototype's "off the line" file. Per page: up to 3 opponent moves off the line
// (10%+ at 1400, 500+ games, from ply 4, same family) whose most played reply is clear (45%+, 1.5x
// the next) and within 50 cp of Stockfish's best; non-trivial replies (not castling, not a capture)
// first, then in line order. `ok` = every reply within 50 cp at depth 14; `common` = other replies
// 10%+ of players choose that are in `ok`.
// Usage: WT=… node branches.js devs2.json clear-sf.json ok.json pages.json cp.json > play-through-branches.json
const fs = require('fs'); const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const [d, sf, ok] = process.argv.slice(2, 5).map((f) => JSON.parse(fs.readFileSync(f)));
// Position before the opponent's move at ply x.ply, and the learner's own line moves.
const d0 = (l, x) => { const g = new Chess(); for (const m of l.line.slice(0, x.ply)) g.move(m); return g.fen(); };
const lineOf = new Map(JSON.parse(fs.readFileSync(process.argv[5])).map((p) => [p.fen, p.moves.split(' ')]));
// Per-move centipawn loss from engine-cp.js (depth 14): `top` = within 15 cp of the best.
const cpOf = process.argv[6] ? JSON.parse(fs.readFileSync(process.argv[6])) : {};
const sound = new Map(sf.filter((x) => x.sound).map((x) => [x.fen, x])); const out = {};
for (const l of d) {
  l.line = lineOf.get(l.fen); l.moves = l.line.filter((_, i) => (i % 2 === 0) === (l.side === 'w'));
  const c = l.kept.filter((x) => x.clear && sound.has(x.fen) && ok[x.fen]).map((x) => {
    const m = new Chess(x.fen).move(x.replies[0][0]); const okm = ok[x.fen].ok.includes(m.san) ? ok[x.fen].ok : [m.san, ...ok[x.fen].ok];
    // Other replies 10%+ of players choose that the engine also accepts: found too.
    const common = x.replies.slice(1).filter(([san, sh]) => sh >= 0.1 && okm.includes(san)).map(([san]) => san);
    const top = Object.entries(cpOf[x.fen]?.cp || {}).filter(([, l]) => l <= 15).map(([san]) => san);
    return { ply: x.ply, dev: x.dev, devShare: x.share, reply: m.san, replyShare: x.replies[0][1], common, top, ok: okm, trivial: m.san.startsWith('O-O') || !!m.captured }; });
  // Night 11 critic: drop the easy ones. One acceptable move, 90%+ agreement, a reply the learner
  // already plays in the line, castling, or a recapture on the square the opponent just took.
  const mine = new Set(l.moves || []);
  const hard = c.filter((x) => { const g = new Chess(d0(l, x)); const dv = g.move(x.dev); const m = g.move(x.reply);
    return x.ok.length > 1 && x.replyShare < 0.9 && !mine.has(x.reply) && !m.san.startsWith('O-O') && !(m.captured && m.to === dv.to); });
  c.length = 0; c.push(...hard);
  const byPly = new Map(); for (const x of c) if (!byPly.has(x.ply) || byPly.get(x.ply).devShare < x.devShare) byPly.set(x.ply, x);
  const pick = [...byPly.values()].sort((a, b) => a.trivial - b.trivial || b.devShare - a.devShare).slice(0, 3).sort((a, b) => a.ply - b.ply);
  if (pick.length) out[l.fen] = { side: l.side === 'w' ? 'white' : 'black', items: pick.map(({ trivial, ...x }) => x) };
}
console.error('pages', Object.keys(out).length, 'items', Object.values(out).reduce((a, v) => a + v.items.length, 0));
console.log(JSON.stringify(out));
