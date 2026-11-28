// Night 11: walk memory → off the line → near puzzles at 390 px in the real app.
// Usage: WT=… SP=… node test-walk.js "<page fen>" "<san moves>" <tag>
const { chromium } = require('playwright'); const fs = require('fs');
const { Chess } = require(process.env.WT + '/node_modules/chess.js');
const [fen, mv, tag] = process.argv.slice(2); const moves = mv.split(' ');
const B = JSON.parse(fs.readFileSync(process.env.WT + '/packages/web/public/lab/play-through-branches.json'))[fen];
const P = JSON.parse(fs.readFileSync(process.env.WT + '/packages/web/public/lab/play-through-puzzles.json'))[fen];
const out = process.env.SP + '/shots/' + tag + '-';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:3000/opening/' + encodeURIComponent(fen) + '?lab=playthrough');
  await pg.getByRole('button', { name: /Play the line/ }).click({ timeout: 30000 });
  for (;;) { const btn = await pg.waitForSelector('button:has-text("Continue"), button:has-text("Your turn")', { timeout: 60000 });
    const t = await btn.textContent(); await btn.click(); if (/Your turn/.test(t)) break; }
  const side = (await pg.locator('section').innerText()).includes("Play White") ? 'w' : 'b';
  const sq = async (s) => pg.locator(`[data-square="${s}"]`).first().click();
  const txt = async () => (await pg.locator('section').innerText()).replace(/\n/g, ' | ');
  const g = new Chess(); await pg.waitForTimeout(700);
  for (const m of moves) { if (g.turn() === side) { const v = new Chess(g.fen()).move(m); await sq(v.from); await sq(v.to); } g.move(m); await pg.waitForTimeout(700); }
  await pg.waitForTimeout(800); console.log('memdone', await txt()); await pg.screenshot({ path: out + '1-memdone.png' });
  await pg.locator('section button').first().click();
  for (const [k, it] of (B ? B.items : []).entries()) {
    await pg.waitForTimeout(1300); console.log('branch', k, await txt()); if (k === 0) await pg.screenshot({ path: out + '2-branch-ask.png' });
    const h = new Chess(fen); // position after the deviation
    const pos = new Chess(); moves.slice(0, it.ply).forEach((x) => pos.move(x)); pos.move(it.dev);
    const rare = it.ok.find((s) => s !== it.reply && !it.common.includes(s));
    if (k === 0 && rare) { const v = new Chess(pos.fen()).move(rare); await sq(v.from); await sq(v.to); await pg.waitForTimeout(300); console.log('rare', await txt()); }
    const v = new Chess(pos.fen()).move(it.reply); await sq(v.from); await sq(v.to); await pg.waitForTimeout(400);
    console.log('found', await txt()); if (k === 0) await pg.screenshot({ path: out + '3-branch-found.png' });
    await pg.locator('section button').first().click();
  }
  const pz = P ? P[side === 'w' ? 'white' : 'black'] : [];
  for (const [k, p] of pz.entries()) { await pg.waitForTimeout(1400); if (k === 0) { await pg.screenshot({ path: out + '4-puzzle.png' }); console.log('puzzle', await txt()); }
    for (let j = 1; j < p.moves.length; j += 2) { await sq(p.moves[j].slice(0, 2)); await sq(p.moves[j].slice(2, 4)); await pg.waitForTimeout(800); }
    await pg.locator('section button').first().click(); }
  await pg.waitForTimeout(500); console.log('done', await txt()); await pg.screenshot({ path: out + '5-done.png' });
  console.log('errors', errs); await b.close();
})();
