#!/usr/bin/env node
/**
 * Scores the blind judge's answers against the key.
 *
 * Strata A and B are samples of very different pool sizes, so site-wide
 * figures weight each stratum's judged rate by its pool:
 *   A   pairs Jev accepts
 *   Bw  pairs Jev rejects, page named in words
 *   Bm  pairs Jev rejects, page named by moves
 *
 * Usage: node scripts/experiments/jev-video/score.js
 *   reads tools/data/experiments/judge-batch-*.answers.jsonl and
 *   jev-judging-key.json; prints the decision criteria from the proposal.
 */

const fs = require('fs');
const { outPath, readJsonl } = require('./lib');

const GOOD = new Set(['main_subject', 'covered']);
const BAD = new Set(['mentioned_only', 'not_about']);

function loadAnswers() {
  const dir = outPath('');
  const answers = {};
  for (const f of fs.readdirSync(dir).filter((n) => /^judge-batch-\d+\.answers\.jsonl$/.test(n))) {
    for (const r of readJsonl(outPath(f))) answers[r.id] = r;
  }
  return answers;
}

const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');

/** Probability a random judged-good pair outscores a random judged-bad one. */
function auc(good, bad) {
  let wins = 0;
  for (const g of good) for (const b of bad) wins += g > b ? 1 : g === b ? 0.5 : 0;
  return wins / (good.length * bad.length);
}

function main() {
  const key = JSON.parse(fs.readFileSync(outPath('jev-judging-key.json'), 'utf8'));
  const answers = loadAnswers();
  const pools = JSON.parse(fs.readFileSync(outPath('jev-judging-pools.json'), 'utf8'));
  const ids = Object.keys(key);
  const missing = ids.filter((id) => !answers[id]);
  console.log(
    `Judged ${ids.length - missing.length}/${ids.length}${missing.length ? ` — missing ${missing.join(', ')}` : ''}`
  );

  // ── Relation strata ─────────────────────────────────────────────
  const groups = { A: [], Bw: [], Bm: [] };
  let cantTell = 0;
  for (const id of ids) {
    const k = key[id];
    const a = answers[id];
    if (!a || !['A', 'B'].includes(k.stratum)) continue;
    if (a.answer === 'cant_tell') {
      cantTell++;
      continue;
    }
    const g = k.stratum === 'A' ? 'A' : k.named_by_moves ? 'Bm' : 'Bw';
    groups[g].push({ id, judgeGood: GOOD.has(a.answer), judge: a.answer, ...k });
  }
  const rate = (g) => groups[g].filter((x) => x.judgeGood).length / groups[g].length;
  console.log(`\nRelation items excluded as can't tell: ${cantTell}`);
  for (const g of ['A', 'Bw', 'Bm']) {
    const n = groups[g].length;
    const good = groups[g].filter((x) => x.judgeGood).length;
    console.log(`  ${g.padEnd(2)} n=${n}: judge says good ${pct(good, n)} (pool ${pools[g]})`);
  }

  const goodA = rate('A') * pools.A;
  const goodBw = rate('Bw') * pools.Bw;
  const goodBm = rate('Bm') * pools.Bm;
  const rejected = pools.Bw + pools.Bm;
  const rejectedGood = goodBw + goodBm;
  const allGood = goodA + rejectedGood;
  const total = pools.A + rejected;

  console.log('\nDecision criteria (pool-weighted estimates):');
  console.log(
    `  1. Jev's rejections are real bad matches: ${pct(rejected - rejectedGood, rejected)} ` +
      `(words ${pct(1 - rate('Bw'), 1)}, moves ${pct(1 - rate('Bm'), 1)}) — need ≥70%`
  );
  console.log(`  2. Good matches Jev wrongly rejects: ${pct(rejectedGood, allGood)} — need ≤5%`);

  const relJudged = [...groups.A, ...groups.Bw, ...groups.Bm];
  const pGood = relJudged.filter((x) => x.judgeGood).map((x) => x.jev_p_good);
  const pBad = relJudged.filter((x) => !x.judgeGood).map((x) => x.jev_p_good);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(
    `  3. Separation: mean P(good) judged-good ${mean(pGood).toFixed(2)} vs judged-bad ${mean(pBad).toFixed(2)}; ` +
      `AUC ${auc(pGood, pBad).toFixed(2)} (unweighted sample)`
  );

  console.log('\nSite-wide precision of displayed pairs (judge = truth):');
  console.log(
    `  Scorer today:          ${pct(allGood, total)} of ${total} video × named-opening pairs`
  );
  console.log(`  After Jev post-filter: ${pct(goodA, pools.A)} of ${pools.A} pairs kept`);

  // ── Family strata ───────────────────────────────────────────────
  for (const s of ['C', 'D']) {
    const items = ids.filter(
      (id) => key[id].stratum === s && answers[id] && answers[id].answer !== 'cant_tell'
    );
    const jev = items.filter((id) => answers[id].answer === key[id].jev).length;
    const matcher = items.filter((id) =>
      key[id].matcher_families.includes(answers[id].answer)
    ).length;
    const other = items.length - jev - matcher;
    console.log(
      `\nStratum ${s} (n=${items.length}): judge agrees with Jev ${pct(jev, items.length)}, ` +
        `with a matcher family ${pct(matcher, items.length)}, neither ${pct(other, items.length)}`
    );
  }

  // ── Pairwise #1 on top-played pages ─────────────────────────────
  const f = ids.filter(
    (id) => key[id].stratum === 'F' && answers[id] && answers[id].answer !== 'cant_tell'
  );
  let jevWins = 0;
  let currentWins = 0;
  let ties = 0;
  for (const id of f) {
    const a = answers[id].answer;
    if (a === 'equal') ties++;
    else if (a === key[id].current_is) currentWins++;
    else jevWins++;
  }
  console.log(
    `\nStratum F (n=${f.length} top-200 pages where Jev changes the #1): ` +
      `Jev's #1 better ${jevWins}, today's #1 better ${currentWins}, equal ${ties}`
  );

  // ── Recall for uncovered top-200 openings ───────────────────────
  const recallKeyPath = outPath('jev-judging-key-recall.json');
  if (fs.existsSync(recallKeyPath)) {
    const rk = JSON.parse(fs.readFileSync(recallKeyPath, 'utf8'));
    const judged = Object.keys(rk).filter(
      (id) => answers[id] && answers[id].answer !== 'cant_tell'
    );
    const good = judged.filter((id) => GOOD.has(answers[id].answer));
    const openings = new Set(Object.values(rk).map((k) => k.opening));
    const filled = new Set(good.map((id) => rk[id].opening));
    console.log(
      `\nStratum E (n=${judged.length} Jev recall candidates): judge says good ${pct(good.length, judged.length)}; ` +
        `${filled.size}/${openings.size} uncovered openings get at least one judged-good video`
    );
  }
}

main();
