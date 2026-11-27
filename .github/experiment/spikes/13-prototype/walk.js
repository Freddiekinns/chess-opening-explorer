// Walk the play-through prototype at 390 px: watch (screenshot each pause), memory, puzzles.
const { chromium } = require('playwright');
const { Chess } = require(process.env.S + '/npm/node_modules/chess.js');
const P = require('/home/user/chess-opening-explorer/packages/web/src/data/playThroughPuzzles.json');
const [fen, moves, tag] = [process.argv[2], process.argv[3].split(' '), process.argv[4]];
const out = process.env.S + '/shots/' + tag + '-';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  if (process.env.LEVEL) await pg.addInitScript((l) => localStorage.setItem('openingbook:my-level', l), process.env.LEVEL);
  await pg.goto('http://localhost:3000/opening/' + encodeURIComponent(fen) + '?lab=playthrough');
  await pg.getByRole('button', { name: /Play the line/ }).click({ timeout: 20000 });
  await pg.screenshot({ path: out + '0-start.png' });
  let n = 0;
  for (;;) {
    const btn = await pg.waitForSelector('button:has-text("Continue"), button:has-text("Your turn")', { timeout: 30000 });
    n++; await pg.screenshot({ path: out + n + '-pause.png' });
    const txt = await btn.textContent(); console.log('pause', n, (await pg.locator('section').innerText()).replace(/\n/g, ' | '));
    await btn.click(); if (/Your turn/.test(txt)) break;
  }
  const sq = async (s) => pg.locator(`[data-square="${s}"]`).first().click();
  const side = (await pg.locator('section').innerText()).includes("Play White") ? 'w' : 'b';
  const g = new Chess();
  for (let i = 0; i < moves.length; i++) {
    if (g.turn() === side) {
      if (i === (side === 'w' ? 2 : 3)) { // one deliberate wrong move
        const wrong = g.moves({ verbose: true }).find((m) => m.san !== moves[i]);
        await sq(wrong.from); await sq(wrong.to); await pg.waitForTimeout(300);
        await pg.screenshot({ path: out + 'm-wrong.png' }); console.log('wrong', (await pg.locator('section').innerText()).replace(/\n/g, ' | '));
      }
      const m = new Chess(g.fen()).move(moves[i]); await sq(m.from); await sq(m.to);
    }
    g.move(moves[i]); await pg.waitForTimeout(700);
  }
  await pg.screenshot({ path: out + 'm-done.png' }); console.log('memdone', (await pg.locator('section').innerText()).replace(/\n/g, ' | '));
  const pz = (P[fen] || { puzzles: [] }).puzzles;
  await pg.locator('section button').first().click();
  for (let k = 0; k < pz.length; k++) {
    const p = pz[k]; await pg.waitForTimeout(1200);
    if (k === 0) { await pg.screenshot({ path: out + 'p-ask.png' }); console.log('ask', (await pg.locator('section').innerText()).replace(/\n/g, ' | ')); }
    for (let j = 1; j < p.moves.length; j += 2) { await sq(p.moves[j].slice(0, 2)); await sq(p.moves[j].slice(2, 4)); await pg.waitForTimeout(900); }
    if (k === 0) await pg.screenshot({ path: out + 'p-solved.png' });
    await pg.locator('section button').first().click();
  }
  await pg.waitForTimeout(400); await pg.screenshot({ path: out + 'z-done.png' }); console.log('done', (await pg.locator('section').innerText()).replace(/\n/g, ' | '));
  console.log('errors', errs); await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
