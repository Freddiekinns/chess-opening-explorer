// Night 11: walk the parts drill at 390 px on the Italian Center Attack (White).
const { chromium } = require('playwright');
const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b5/2BpP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6';
const moves = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4'.split(' ');
const out = process.env.SP + '/shots/';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:3000/opening/' + encodeURIComponent(fen) + '?lab=playthrough');
  await pg.getByRole('button', { name: /Play the line/ }).click({ timeout: 30000 });
  for (;;) { const btn = await pg.waitForSelector('button:has-text("Continue"), button:has-text("Your turn")', { timeout: 30000 });
    const t = await btn.textContent(); await btn.click(); if (/Your turn/.test(t)) break; }
  const sq = async (s) => pg.locator(`[data-square="${s}"]`).first().click();
  const txt = async () => (await pg.locator('section').innerText()).replace(/\n/g, ' | ');
  const play = async (from, to) => { await sq(from); await sq(to); await pg.waitForTimeout(800); };
  const W = moves.map((m, i) => [m, i]).filter(([, i]) => i % 2 === 0).map(([m, i]) => { const g = new Chess(); moves.slice(0, i).forEach((x) => g.move(x)); const v = g.move(m); return [v.from, v.to]; });
  await pg.waitForTimeout(500); await pg.screenshot({ path: out + '1-part1.png' }); console.log('start', await txt());
  for (const [f, t] of W.slice(0, 3)) await play(f, t);
  console.log('part2', await txt());
  await play('d2', 'd3'); await pg.screenshot({ path: out + '2-miss.png' }); console.log('miss', await txt());
  await play('c2', 'c3'); await sq('d2'); await sq('d4'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '3-part-again.png' }); console.log('again', await txt());
  await pg.waitForTimeout(2000); console.log('rewound', await txt());
  for (const [f, t] of W.slice(2, 4)) await play(f, t); await sq(W[4][0]); await sq(W[4][1]); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '4-whole-next.png' }); console.log('whole', await txt());
  await pg.waitForTimeout(1500);
  for (const [f, t] of W) await play(f, t);
  await pg.waitForTimeout(800); await pg.screenshot({ path: out + '5-done.png' }); console.log('done', await txt());
  console.log('errors', errs); await b.close();
})();
