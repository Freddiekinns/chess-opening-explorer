#!/usr/bin/env node
/**
 * Stage 1: the ~100-call pilot.
 *
 *   1. Known cases — pairs with an answer we already know, most of them taken
 *      from regressions recorded in AGENTS.md, plus name traps (Kan the player,
 *      Sveshnikov's Pirc system, Max Lange Attack vs Defense). If Jev gets
 *      these wrong, the experiment stops here.
 *   2. A random sample of displayed pairs, every question asked in two
 *      wordings in the same call, to measure how much phrasing moves Jev.
 *   3. A random sample of corpus videos for the run-2 family question.
 *
 * Usage: node scripts/experiments/jev-video/pilot.js [--dry-run]
 * Output: tools/data/experiments/jev-pilot.jsonl (resumable)
 */

const {
  loadCorpus,
  loadIndex,
  loadFamilies,
  loadEco,
  buildDisplayedPairs,
  videoState,
  relationQuestion,
  relationQuestionAlt,
  familyQuestion,
  askJev,
  outPath,
  readJsonl,
  appendJsonl,
  pool,
  costUsd,
} = require('./lib');

const DRY_RUN = process.argv.includes('--dry-run');
const RANDOM_RELATION_VIDEOS = 40;
const MAX_QUESTIONS_PER_VIDEO = 8; // per wording, so up to 16 per call
const RANDOM_FAMILY_VIDEOS = 40;
const CONCURRENCY = 4;

const GOOD = new Set(['main_subject', 'covered']);

const ACC_DRAGON = 'Sicilian Defense: Accelerated Dragon';
const KAN = 'Sicilian Defense: Kan Variation';
const PELIKAN = 'Sicilian Defense: Lasker-Pelikan Variation';
const MAX_LANGE_ATTACK = 'Italian Game: Two Knights Defense, Max Lange Attack';
const MAX_LANGE_DEFENSE = 'Vienna Game: Max Lange Defense';

// [videoId, opening, expected] — expected is `good` (main subject or covered)
// or `bad` (mentioned only or not about it). Labels are ours, from the titles.
const KNOWN_RELATIONS = [
  ['rd1eKLJ3DGQ', ACC_DRAGON, 'good'], // Hanging Pawns, The Accelerated Dragon
  ['13Y4QR_-Upc', ACC_DRAGON, 'good'], // Seirawan's lecture, once lost from the corpus
  ['Lheuxix6yj0', ACC_DRAGON, 'good'], // Accelerated Dragon Explained in 15 Minutes
  ['lryqtSMy4pY', ACC_DRAGON, 'good'], // Naroditsky speedrun, Acc. Dragon Maroczy Bind
  ['4X7vf-KZoo0', ACC_DRAGON, 'good'], // speedrun: Alapin, Glek, Acc. Dragon
  ['VGP0qWscORM', ACC_DRAGON, 'bad'], // The Alapin (c3) — AGENTS.md regression
  ['8G9jKtm8Sds', ACC_DRAGON, 'bad'], // Scheveningen Variation — AGENTS.md regression
  ['T7qzruXqPsw', ACC_DRAGON, 'bad'], // Prins Variation — AGENTS.md regression
  ['Up_bhR0McTQ', ACC_DRAGON, 'bad'], // Dragon part 2: Levenfish, Fianchetto, Classical
  ['9CxgfDX44Ug', KAN, 'good'], // Hanging Pawns, Sicilian Kan — not on the page today
  ['LC5Xw5hSHic', KAN, 'good'], // How to Play the Kan & Taimanov Sicilians
  ['tpa6DD6yQag', KAN, 'bad'], // O'Kelly Variation (2...a6) — on the page today
  ['QO8ejRrH978', KAN, 'bad'], // Chekhover Sicilian — on the page today
  ['Oj04sSCzraE', KAN, 'bad'], // Mastering the Maróczy Bind — on the page today
  ['DjJ19FkU3ZU', KAN, 'bad'], // Kan vs Capablanca: Kan the player, an endgame lesson
  ['vM5KUWXPkbo', PELIKAN, 'good'], // Sveshnikov Variation, Sicilian Defense Theory
  ['tc62U2mPyOA', PELIKAN, 'good'], // Sveshnikov Sicilian, Chess Openings Explained
  ['jLIVFDWlpcs', PELIKAN, 'bad'], // How to Sac and Attack versus the Sicilian — #1 today
  ['MURLEtPvCvY', PELIKAN, 'bad'], // Sveshnikov and Kholmov Systems — Pirc
  ['4jGu9nx_Xro', MAX_LANGE_DEFENSE, 'good'], // The Max Lange Defense · Vienna
  ['4jGu9nx_Xro', MAX_LANGE_ATTACK, 'bad'], // same video, the other Max Lange
];

// [videoId, expected family id(s)]
const KNOWN_FAMILIES = [
  ['rd1eKLJ3DGQ', ['sicilian']],
  ['kmPf2mwFK2Y', ['sicilian']],
  ['6QQ5sw-SgNw', ['vienna']],
  ['MURLEtPvCvY', ['pirc-modern']],
  ['klB7x7VTizQ', ['not_opening']], // Hikaru's Bold Gambit Against Magnus, a 46s short
  ['DjJ19FkU3ZU', ['not_opening']], // endgame lesson from Capablanca
];

// Deterministic sample so a resumed pilot asks about the same pairs.
function seededShuffle(items, seed) {
  const out = [...items];
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function planCalls() {
  const corpus = loadCorpus();
  const families = loadFamilies();
  const { openings, pairs } = buildDisplayedPairs(loadIndex(), loadEco());

  const opening = (name) => {
    const o = openings.get(name);
    if (!o) throw new Error(`Unknown opening name: ${name}`);
    return o;
  };
  const video = (id) => {
    const v = corpus[id];
    if (!v) throw new Error(`Video not in corpus: ${id}`);
    return v;
  };

  const calls = [];

  // 1. Known relations, grouped into one call per video.
  const knownByVideo = new Map();
  KNOWN_RELATIONS.forEach(([id, name, expected], i) => {
    if (!knownByVideo.has(id)) knownByVideo.set(id, []);
    knownByVideo.get(id).push({ qid: `k${i}`, name, expected });
  });
  for (const [id, items] of knownByVideo) {
    const questions = {};
    for (const it of items) {
      questions[`${it.qid}_a`] = relationQuestion(opening(it.name));
      questions[`${it.qid}_b`] = relationQuestionAlt(opening(it.name));
    }
    calls.push({
      key: `known-rel:${id}`,
      kind: 'relation',
      video_id: id,
      meta: Object.fromEntries(
        items.map((it) => [it.qid, { opening: it.name, expected: it.expected }])
      ),
      state: videoState(video(id)),
      questions,
    });
  }

  // 2. Random displayed pairs, both wordings.
  const displayed = seededShuffle([...pairs.keys()].sort(), 20261002)
    .filter((id) => corpus[id])
    .slice(0, RANDOM_RELATION_VIDEOS);
  for (const id of displayed) {
    const names = seededShuffle([...pairs.get(id)].sort(), 7).slice(0, MAX_QUESTIONS_PER_VIDEO);
    const questions = {};
    const meta = {};
    names.forEach((name, i) => {
      questions[`r${i}_a`] = relationQuestion(opening(name));
      questions[`r${i}_b`] = relationQuestionAlt(opening(name));
      meta[`r${i}`] = { opening: name };
    });
    calls.push({
      key: `rand-rel:${id}`,
      kind: 'relation',
      video_id: id,
      meta,
      state: videoState(video(id)),
      questions,
    });
  }

  // 3. Family question: known cases, then a random corpus sample.
  const famQ = familyQuestion(families);
  for (const [id, expected] of KNOWN_FAMILIES) {
    calls.push({
      key: `known-fam:${id}`,
      kind: 'family',
      video_id: id,
      meta: { expected },
      state: videoState(video(id)),
      questions: { family: famQ },
    });
  }
  const knownFamIds = new Set(KNOWN_FAMILIES.map(([id]) => id));
  const corpusSample = seededShuffle(Object.keys(corpus).sort(), 99)
    .filter((id) => !knownFamIds.has(id))
    .slice(0, RANDOM_FAMILY_VIDEOS);
  for (const id of corpusSample) {
    calls.push({
      key: `rand-fam:${id}`,
      kind: 'family',
      video_id: id,
      meta: {},
      state: videoState(video(id)),
      questions: { family: famQ },
    });
  }

  return calls;
}

function summarise(records) {
  const tokens = records.reduce((a, r) => a + ((r.usage && r.usage.input_tokens) || 0), 0);
  const latencies = records.map((r) => r.latency_ms).sort((a, b) => a - b);
  const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  console.log(`\nCalls: ${records.length}`);
  console.log(`Input tokens (Jev's usage field): ${tokens} ≈ $${costUsd(tokens).toFixed(4)}`);
  console.log(`Latency ms: p50 ${p(0.5)}, p90 ${p(0.9)}, max ${latencies.at(-1)}`);

  // Known relations, wording A and B.
  console.log('\nKnown relations (expected → A / B):');
  let rightA = 0;
  let rightB = 0;
  let total = 0;
  for (const r of records.filter((x) => x.key.startsWith('known-rel:'))) {
    for (const [qid, m] of Object.entries(r.meta)) {
      const a = r.answers[`${qid}_a`];
      const b = r.answers[`${qid}_b`];
      const okA = GOOD.has(a.choice) === (m.expected === 'good');
      const okB = GOOD.has(b.choice) === (m.expected === 'good');
      total++;
      rightA += okA;
      rightB += okB;
      console.log(
        `  ${okA ? '✓' : '✗'}${okB ? '✓' : '✗'} ${m.expected.padEnd(4)} ${r.video_id} on ${m.opening}: ` +
          `${a.choice} (${a.confidence.toFixed(2)}) / ${b.choice} (${b.confidence.toFixed(2)})`
      );
    }
  }
  console.log(`  Wording A ${rightA}/${total}, wording B ${rightB}/${total}`);

  // Wording stability on the random sample.
  let same = 0;
  let sameGroup = 0;
  let pairsN = 0;
  let absDiff = 0;
  for (const r of records.filter((x) => x.key.startsWith('rand-rel:'))) {
    for (const qid of Object.keys(r.meta)) {
      const a = r.answers[`${qid}_a`];
      const b = r.answers[`${qid}_b`];
      pairsN++;
      same += a.choice === b.choice;
      sameGroup += GOOD.has(a.choice) === GOOD.has(b.choice);
      const goodA = a.probabilities.main_subject + a.probabilities.covered;
      const goodB = b.probabilities.main_subject + b.probabilities.covered;
      absDiff += Math.abs(goodA - goodB);
    }
  }
  if (pairsN) {
    console.log(
      `\nWording stability over ${pairsN} random pairs: same answer ${((100 * same) / pairsN).toFixed(0)}%, ` +
        `same good/bad ${((100 * sameGroup) / pairsN).toFixed(0)}%, ` +
        `mean |P(good) A − B| ${(absDiff / pairsN).toFixed(2)}`
    );
  }

  // Families.
  console.log('\nKnown families:');
  for (const r of records.filter((x) => x.key.startsWith('known-fam:'))) {
    const a = r.answers.family;
    const ok = r.meta.expected.includes(a.choice);
    console.log(
      `  ${ok ? '✓' : '✗'} ${r.video_id}: ${a.choice} (${a.confidence.toFixed(2)}), expected ${r.meta.expected.join('/')}`
    );
  }
  const famDist = {};
  for (const r of records.filter((x) => x.key.startsWith('rand-fam:'))) {
    famDist[r.answers.family.choice] = (famDist[r.answers.family.choice] || 0) + 1;
  }
  console.log('Random corpus sample, family answers:', famDist);
}

async function main() {
  const calls = planCalls();
  const questions = calls.reduce((a, c) => a + Object.keys(c.questions).length, 0);
  const approxTokens = Math.round(
    JSON.stringify(calls.map((c) => [c.state, c.questions])).length / 4
  );
  console.log(
    `Planned: ${calls.length} calls, ${questions} questions, ~${approxTokens} tokens by character count`
  );
  if (DRY_RUN) return;

  const file = outPath('jev-pilot.jsonl');
  const done = new Set(readJsonl(file).map((r) => r.key));
  const todo = calls.filter((c) => !done.has(c.key));
  console.log(`Already answered: ${done.size}; calling ${todo.length}`);

  let failed = 0;
  await pool(todo, CONCURRENCY, async (call) => {
    try {
      const res = await askJev(call.state, call.questions);
      appendJsonl(file, {
        key: call.key,
        kind: call.kind,
        video_id: call.video_id,
        meta: call.meta,
        model: res.model,
        answers: res.answers,
        usage: res.usage,
        latency_ms: res.latency_ms,
        at: new Date().toISOString(),
      });
    } catch (err) {
      failed++;
      console.error(`${call.key}: ${err.message}`);
    }
  });

  summarise(readJsonl(file));
  if (failed) {
    console.error(`\n${failed} calls failed; re-run to retry them.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
