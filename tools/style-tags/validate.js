#!/usr/bin/env node
/**
 * Checks a style classification against the procedural tests in
 * docs/proposals/2026-10-02-opening-style-classification.md.
 *
 *   node tools/style-tags/validate.js [--a claude.json] [--b jev.json] [--judge judge.json] [--verbose]
 *
 * Files are read from tools/data/style-briefs/_classify/; final.js decides the
 * final answer per axis. Reports:
 *   - anchors: every anchor in docs/style-taxonomy.md that has been classified
 *   - agreement between A and B, per axis
 *   - selectivity: no shown value may hold more than ~40% of games
 *   - draw rate by character: Sharp must draw less than Solid
 *   - material at the root against gambit
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../..');
const { AXES, anchors } = require('./taxonomy');
const { SHOWN, load, finalAnswers } = require('./final');

const SELECTIVITY_CAP = 0.4;
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const valueOf = {
  a: (entry) => entry && entry.value,
  b: (entry) => entry && entry.choice,
};

function material(fen) {
  const worth = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let score = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = worth[ch.toLowerCase()];
    if (v) score += ch === ch.toUpperCase() ? v : -v;
  }
  return score;
}

function main() {
  const A = load(arg('a', 'claude.json'));
  const B = load(arg('b', 'jev.json'));
  const J = load(arg('judge', 'judge.json'));
  const { final, byRule } = finalAnswers({ A, B, J });
  const slugs = Object.keys(final);

  const data = path.join(REPO, 'api/data');
  const pop = JSON.parse(fs.readFileSync(path.join(data, 'popularity_stats.json'), 'utf8'));
  const stats = pop.positions || pop;
  const map = JSON.parse(
    fs.readFileSync(path.join(REPO, 'tools/data/style-briefs/_inputs/variation-map.json'), 'utf8')
  );
  const { shared } = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'shared-briefs.json'), 'utf8')
  );
  const games = {};
  const draws = {};
  for (const [fen, v] of Object.entries(map)) {
    const slug = shared[v] || v;
    const s = stats[fen];
    if (!s || !s.games_analyzed) continue;
    games[slug] = (games[slug] || 0) + s.games_analyzed;
    if (s.draw_rate != null) draws[slug] = (draws[slug] || 0) + s.draw_rate * s.games_analyzed;
  }

  let failures = 0;
  console.log(`${slugs.length} variations classified\n`);

  console.log('Anchors');
  for (const an of anchors()) {
    if (!final[an.slug]) continue;
    const got = final[an.slug][an.axis];
    const ok = got === an.value;
    if (!ok) failures++;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${an.axis}=${an.value}  ${an.name}${ok ? '' : `  (got ${got})`}`
    );
  }

  console.log('\nAgreement, A vs B');
  for (const axis of AXES) {
    let both = 0;
    let agree = 0;
    for (const slug of slugs) {
      const a = valueOf.a(A[slug] && A[slug][axis]);
      const b = valueOf.b(B[slug] && B[slug].answers && B[slug].answers[axis]);
      if (!a || !b) continue;
      both++;
      if (a === b) agree++;
    }
    console.log(`  ${axis.padEnd(10)} ${agree}/${both}`);
  }
  const unresolved = slugs.flatMap((s) =>
    AXES.filter((x) => final[s][x] == null).map((x) => `${s}.${x}`)
  );
  console.log(`  settled by the middle-value rule (A stands): ${byRule.length}`);
  if (process.argv.includes('--verbose')) for (const r of byRule) console.log(`    ${r}`);
  console.log(`  unresolved (for the judge): ${unresolved.length}`);
  for (const u of unresolved) console.log(`    ${u}`);

  console.log('\nSelectivity, share of games among classified variations');
  const total = slugs.reduce((s, slug) => s + (games[slug] || 0), 0);
  for (const axis of AXES) {
    const by = {};
    for (const slug of slugs) {
      const v = final[slug][axis];
      if (v) by[v] = (by[v] || 0) + (games[slug] || 0);
    }
    const parts = Object.entries(by)
      .sort((x, y) => y[1] - x[1])
      .map(([v, g]) => {
        const share = g / total;
        const over = SHOWN[axis].includes(v) && share > SELECTIVITY_CAP;
        if (over) failures++;
        return `${v} ${(share * 100).toFixed(0)}%${over ? ' OVER' : ''}`;
      });
    console.log(`  ${axis.padEnd(10)} ${parts.join(' · ')}`);
  }

  console.log('\nPlans, share of games (shown: first two)');
  const byPlan = {};
  let noPlans = 0;
  for (const slug of slugs) {
    if (!final[slug].plans.length) noPlans++;
    for (const p of final[slug].plans) byPlan[p] = (byPlan[p] || 0) + (games[slug] || 0);
  }
  for (const [p, g] of Object.entries(byPlan).sort((x, y) => y[1] - x[1])) {
    const over = g / total > SELECTIVITY_CAP;
    if (over) failures++;
    console.log(`  ${p.padEnd(24)} ${((g / total) * 100).toFixed(0)}%${over ? ' OVER' : ''}`);
  }
  console.log(`  variations with no plan: ${noPlans}`);

  console.log('\nDraw rate by character (games-weighted)');
  const rate = {};
  for (const slug of slugs) {
    const v = final[slug].character;
    if (!v || !games[slug] || draws[slug] == null) continue;
    rate[v] = rate[v] || { d: 0, g: 0 };
    rate[v].d += draws[slug];
    rate[v].g += games[slug];
  }
  for (const [v, r] of Object.entries(rate))
    console.log(`  ${v.padEnd(10)} ${((r.d / r.g) * 100).toFixed(1)}%`);
  if (rate.sharp && rate.solid && rate.sharp.d / rate.sharp.g >= rate.solid.d / rate.solid.g) {
    failures++;
    console.log('  FAIL Sharp draws at least as often as Solid');
  }

  console.log('\nMaterial at the root against gambit');
  const briefs = path.join(REPO, 'tools/data/style-briefs');
  for (const slug of slugs) {
    const file = path.join(briefs, `${slug}.json`);
    if (!fs.existsSync(file)) continue;
    const m = material(JSON.parse(fs.readFileSync(file, 'utf8')).root.fen);
    const g = final[slug].gambit;
    const expect = g === 'white' ? m < 0 : g === 'black' ? m > 0 : m === 0;
    if (!expect) console.log(`  check  ${slug}: gambit=${g}, material ${m > 0 ? '+' : ''}${m}`);
  }

  // Jev reads an unsourced brief's own evidence, so when the writer judged a
  // rare gambit branch as the main line both classifiers agree on it. A gambit
  // the name does not mention goes to the judge, once.
  console.log('\nUnsourced gambits the name does not mention (for the judge)');
  for (const slug of slugs) {
    if (!A[slug] || A[slug].tier !== 'unsourced' || final[slug].gambit === 'none') continue;
    if (J[slug] && J[slug].gambit) continue;
    const brief = JSON.parse(fs.readFileSync(path.join(briefs, `${slug}.json`), 'utf8'));
    if (!/gambit/i.test(brief.root.name))
      console.log(`  check  ${slug}: gambit=${final[slug].gambit}`);
  }

  console.log(`\n${failures ? `${failures} failure(s)` : 'All checks pass'}`);
  process.exitCode = failures ? 1 : 0;
}

main();
