#!/usr/bin/env node
/**
 * Draws the blind judging set from runs 1 and 2.
 *
 *   A  100  scorer shows it, Jev accepts (main subject / covered)
 *   B  100  scorer shows it, Jev rejects (mentioned only / not about it);
 *           75 on pages named in words, 25 on pages named by moves
 *   C   50  Jev's family is not one the matcher showed the video under
 *   D   50  a displayed video Jev calls not an opening video
 *   F  ≤200 top-200 positions where dropping Jev's rejections changes the #1
 *
 * Writes two files to tools/data/experiments/:
 *   jev-judging-items.json — what the judge sees: video text and the question,
 *                            shuffled, opaque ids, no system's answer
 *   jev-judging-key.json   — stratum and both systems' answers per item;
 *                            the judge must never read it
 *
 * Usage: node scripts/experiments/jev-video/sample.js
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadCorpus,
  loadIndex,
  loadEco,
  loadFamilies,
  baseName,
  videoState,
  openingLabel,
  buildDisplayedPairs,
  outPath,
  readJsonl,
} = require('./lib');
const { sanitizeFenKey, legacySanitizeFenKey } = require(
  path.join(ROOT, 'packages', 'api', 'src', 'utils', 'fen-sanitizer')
);

const GOOD = new Set(['main_subject', 'covered']);
const TOP_PLAYED = 200;

function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

function sample(items, n, rand) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

function main() {
  const rand = seededRandom(20261003);
  const corpus = loadCorpus();
  const index = loadIndex();
  const eco = loadEco();
  const families = loadFamilies();
  const { openings, pairs } = buildDisplayedPairs(index, eco);

  // Jev's run-1 answer per (video, named opening).
  const relation = new Map();
  for (const r of readJsonl(outPath('jev-run1.jsonl'))) {
    for (const [qid, m] of Object.entries(r.meta)) {
      relation.set(`${r.video_id}|${m.opening}`, {
        ...r.answers[qid],
        named_by_moves: m.named_by_moves,
      });
    }
  }
  // Jev's run-2 family per video.
  const family = new Map();
  for (const r of readJsonl(outPath('jev-run2.jsonl'))) family.set(r.video_id, r.answers.family);

  // Site families each displayed video is shown under.
  const shownUnder = new Map();
  for (const pos of Object.values(index.positions)) {
    const fid = eco[pos.opening.id] && eco[pos.opening.id].family_id;
    for (const v of pos.videos || []) {
      if (!shownUnder.has(v.id)) shownUnder.set(v.id, new Set());
      if (fid) shownUnder.get(v.id).add(fid);
    }
  }

  const items = [];
  const key = {};
  const add = (stratum, item, answers) => {
    const id = `j${String(items.length + 1).padStart(3, '0')}`;
    items.push({ id, ...item });
    key[id] = { stratum, ...answers };
  };
  const relationItem = (videoId, name) => ({
    type: 'relation',
    video_id: videoId,
    video: videoState(corpus[videoId]),
    opening: openingLabel(openings.get(name)),
  });

  // A and B.
  const accepted = [];
  const rejectedWords = [];
  const rejectedMoves = [];
  for (const [videoId, names] of pairs) {
    for (const name of names) {
      const a = relation.get(`${videoId}|${name}`);
      if (!a) continue;
      if (GOOD.has(a.choice)) accepted.push([videoId, name, a]);
      else (a.named_by_moves ? rejectedMoves : rejectedWords).push([videoId, name, a]);
    }
  }
  const relAnswers = (a) => ({
    scorer: 'shown',
    jev: a.choice,
    jev_p_good: (a.probabilities.main_subject || 0) + (a.probabilities.covered || 0),
    jev_confidence: a.confidence,
    named_by_moves: a.named_by_moves,
  });
  for (const [v, n, a] of sample(accepted, 100, rand)) add('A', relationItem(v, n), relAnswers(a));
  for (const [v, n, a] of sample(rejectedWords, 75, rand))
    add('B', relationItem(v, n), relAnswers(a));
  for (const [v, n, a] of sample(rejectedMoves, 25, rand))
    add('B', relationItem(v, n), relAnswers(a));

  // C and D: one family question, so the judge cannot tell which stratum it is in.
  const familyItem = (videoId) => ({
    type: 'family',
    video_id: videoId,
    video: videoState(corpus[videoId]),
  });
  const otherFamily = [];
  const notOpening = [];
  for (const [videoId, under] of shownUnder) {
    const f = family.get(videoId);
    if (!f) continue;
    if (f.choice === 'not_opening') notOpening.push(videoId);
    else if (families[f.choice] && under.size && !under.has(f.choice)) otherFamily.push(videoId);
  }
  const famAnswers = (videoId) => ({
    jev: family.get(videoId).choice,
    jev_confidence: family.get(videoId).confidence,
    matcher_families: [...shownUnder.get(videoId)],
  });
  for (const v of sample(otherFamily, 50, rand)) add('C', familyItem(v), famAnswers(v));
  for (const v of sample(notOpening, 50, rand)) add('D', familyItem(v), famAnswers(v));

  // F: the #1 on top-played pages, today vs after dropping Jev's rejections.
  const popularity = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'api', 'data', 'popularity_stats.json'), 'utf8')
  ).positions;
  const ranked = Object.entries(popularity)
    .sort((a, b) => (b[1].frequency_count || 0) - (a[1].frequency_count || 0))
    .slice(0, TOP_PLAYED);
  let topCovered = 0;
  let topChanged = 0;
  let topEmptied = 0;
  for (const [fen] of ranked) {
    const pos = index.positions[sanitizeFenKey(fen)] || index.positions[legacySanitizeFenKey(fen)];
    if (!pos || !(pos.videos || []).length) continue;
    topCovered++;
    const name = baseName(pos.opening.name);
    const current = pos.videos[0];
    const kept = pos.videos.find((v) => {
      const a = relation.get(`${v.id}|${name}`);
      return a && GOOD.has(a.choice);
    });
    if (!kept) {
      topEmptied++;
      continue;
    }
    if (kept.id === current.id) continue;
    topChanged++;
    const swap = rand() < 0.5;
    const [first, second] = swap ? [kept.id, current.id] : [current.id, kept.id];
    add(
      'F',
      {
        type: 'pairwise',
        opening: openingLabel(openings.get(name)),
        video_1: { video_id: first, ...videoState(corpus[first]) },
        video_2: { video_id: second, ...videoState(corpus[second]) },
      },
      { current: current.id, jev_filtered: kept.id, current_is: swap ? 'video_2' : 'video_1' }
    );
  }

  // Shuffle so neighbouring items do not reveal a stratum, then renumber.
  const order = sample(items, items.length, rand);
  const blind = [];
  const blindKey = {};
  order.forEach((item, i) => {
    const id = `j${String(i + 1).padStart(3, '0')}`;
    blindKey[id] = key[item.id];
    blind.push({ ...item, id });
  });

  fs.writeFileSync(outPath('jev-judging-items.json'), JSON.stringify(blind, null, 1) + '\n');
  fs.writeFileSync(outPath('jev-judging-key.json'), JSON.stringify(blindKey, null, 1) + '\n');
  // Pool sizes weight each stratum's judged rate in score.js.
  fs.writeFileSync(
    outPath('jev-judging-pools.json'),
    JSON.stringify({ A: accepted.length, Bw: rejectedWords.length, Bm: rejectedMoves.length }) +
      '\n'
  );

  const count = (s) => Object.values(blindKey).filter((k) => k.stratum === s).length;
  console.log(
    `Items: ${blind.length} — A ${count('A')}, B ${count('B')}, C ${count('C')}, D ${count('D')}, F ${count('F')}`
  );
  console.log(
    `Pool sizes: accepted ${accepted.length}, rejected (words) ${rejectedWords.length}, rejected (moves) ${rejectedMoves.length}, other-family ${otherFamily.length}, not-opening ${notOpening.length}`
  );
  console.log(
    `Top ${TOP_PLAYED}: ${topCovered} covered; Jev changes the #1 on ${topChanged}, rejects every video on ${topEmptied}`
  );
}

main();
