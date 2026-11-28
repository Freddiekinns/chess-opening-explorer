// Night 11: the prototype's "off the line" file. Per page: up to 3 opponent moves off the line
// (10%+ at 1400, 500+ games, from ply 4, same family) whose most played reply is clear (45%+, 1.5x
// the next) and within 50 cp of Stockfish's best; non-trivial replies (not castling, not a capture)
// first, then in line order. `ok` = every reply within 50 cp at depth 14; `common` = other replies
// 10%+ of players choose that are in `ok`.
// Usage: WT=… node branches.js devs2.json clear-sf.json ok.json > play-through-branches.json
const fs = require('fs'); const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const [d, sf, ok] = process.argv.slice(2, 5).map((f) => JSON.parse(fs.readFileSync(f)));
const sound = new Map(sf.filter((x) => x.sound).map((x) => [x.fen, x])); const out = {};
for (const l of d) {
  const c = l.kept.filter((x) => x.clear && sound.has(x.fen) && ok[x.fen]).map((x) => {
    const m = new Chess(x.fen).move(x.replies[0][0]); const okm = ok[x.fen].ok.includes(m.san) ? ok[x.fen].ok : [m.san, ...ok[x.fen].ok];
    // Other replies 10%+ of players choose that the engine also accepts: found too.
    const common = x.replies.slice(1).filter(([san, sh]) => sh >= 0.1 && okm.includes(san)).map(([san]) => san);
    return { ply: x.ply, dev: x.dev, devShare: x.share, reply: m.san, replyShare: x.replies[0][1], common, ok: okm, trivial: m.san.startsWith('O-O') || !!m.captured }; });
  const byPly = new Map(); for (const x of c) if (!byPly.has(x.ply) || byPly.get(x.ply).devShare < x.devShare) byPly.set(x.ply, x);
  const pick = [...byPly.values()].sort((a, b) => a.trivial - b.trivial || b.devShare - a.devShare).slice(0, 3).sort((a, b) => a.ply - b.ply);
  if (pick.length) out[l.fen] = { side: l.side === 'w' ? 'white' : 'black', items: pick.map(({ trivial, ...x }) => x) };
}
console.error('pages', Object.keys(out).length, 'items', Object.values(out).reduce((a, v) => a + v.items.length, 0));
console.log(JSON.stringify(out));
