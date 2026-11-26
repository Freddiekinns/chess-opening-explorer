// Idea 1: band data along a named line (each step: share of the line's move, the top alternatives,
// W/D/L), plus split flags (Revision 1's rule: top move under 60%, second over 20%) and any
// engine-confirmed common mistake at that position (spikes/06 output). Writes JSON for the spike page.
// Usage (repo root): CHESSJS=<dir> node line.js "<SAN moves>" <band> [mistakes.json ...] > line.json
const fs = require('fs');
const { Chess } = require(process.env.CHESSJS + '/node_modules/chess.js');
const [moves, band, ...mf] = process.argv.slice(2);
const D = 'api/data/position-stats/'; const byKey = {};
for (const f of fs.readdirSync(D)) for (const [fen, e] of Object.entries(JSON.parse(fs.readFileSync(D + f)).positions)) byKey[fen.split(' ').slice(0, 4).join(' ')] = e;
const k4 = (f) => f.split(' ').slice(0, 4).join(' ');
const M = {};
for (const F of mf) for (const h of JSON.parse(fs.readFileSync(F))) if (h.root - h.ev[h.san] >= 100 && h.rest - h.s >= 0.06 && h.ev[h.san] < -50) (M[k4(h.fen)] = M[k4(h.fen)] || []).push({ san: h.san, sh: h.sh, s: h.s, fix: h.engineBest, loss: h.root - h.ev[h.san] });
const c = new Chess(); const steps = [];
for (const san of moves.split(' ')) {
  const fen = c.fen(); const e = byKey[k4(fen)]; const b = e && e.bands && e.bands[band];
  let st = { san, fen };
  if (b) {
    const tot = b.moves.reduce((a, m) => a + m.g, 0); const white = c.turn() === 'w';
    const mv = b.moves.slice().sort((x, y) => y.g - x.g).map((m) => ({ san: m.san, share: m.g / tot, win: (white ? m.w : m.b) / m.g, draw: m.d / m.g, g: m.g }));
    st = { ...st, games: tot, top: mv.slice(0, 3), mine: mv.find((m) => m.san === san), split: mv[0].share < 0.6 && mv[1] && mv[1].share > 0.2, mistakes: M[k4(fen)] || [] };
  }
  steps.push(st); c.move(san);
}
const e = byKey[k4(c.fen())]; const b = e && e.bands && e.bands[band];
if (b) { const tot = b.moves.reduce((a, m) => a + m.g, 0); const white = c.turn() === 'w'; steps.push({ end: true, fen: c.fen(), games: tot, top: b.moves.slice().sort((x, y) => y.g - x.g).slice(0, 3).map((m) => ({ san: m.san, share: m.g / tot, win: (white ? m.w : m.b) / m.g, draw: m.d / m.g, g: m.g })), mistakes: M[k4(c.fen())] || [] }); }
console.log(JSON.stringify(steps));
