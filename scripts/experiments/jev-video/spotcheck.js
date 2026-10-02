#!/usr/bin/env node
/**
 * Builds the owner's blind spot-check page: 20 items from the judging set
 * (6 from A, 6 from B, 4 from E, 4 from F), with no system's answer shown.
 * Verdicts are saved by the published page to its `db` (collection
 * `spotcheck`, one document per item id) for score comparison.
 *
 * Usage: node scripts/experiments/jev-video/spotcheck.js
 * Output: tools/data/experiments/jev-spotcheck.html, jev-spotcheck-ids.json
 */

const fs = require('fs');
const path = require('path');
const { outPath } = require('./lib');

function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

function pick(list, n, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

const readJson = (name) => JSON.parse(fs.readFileSync(outPath(name), 'utf8'));

function main() {
  const rand = seededRandom(424242);
  const items = readJson('jev-judging-items.json');
  const key = readJson('jev-judging-key.json');
  const recall = readJson('judge-batch-4.json');

  const byStratum = (s) => items.filter((it) => key[it.id].stratum === s);
  const chosen = [
    ...pick(byStratum('A'), 6, rand),
    ...pick(byStratum('B'), 6, rand),
    ...pick(recall, 4, rand),
    ...pick(byStratum('F'), 4, rand),
  ];
  const order = pick(chosen, chosen.length, rand);

  const slim = (v, id) => ({
    id,
    title: v.title,
    channel: v.channel,
    minutes: v.duration_minutes,
    description: (v.description || '').slice(0, 1200),
  });
  const data = order.map((it) =>
    it.type === 'pairwise'
      ? {
          id: it.id,
          type: 'pairwise',
          opening: it.opening,
          videos: [slim(it.video_1, it.video_1.video_id), slim(it.video_2, it.video_2.video_id)],
        }
      : { id: it.id, type: 'relation', opening: it.opening, video: slim(it.video, it.video_id) }
  );

  const template = fs.readFileSync(path.join(__dirname, 'spotcheck.template.html'), 'utf8');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  fs.writeFileSync(outPath('jev-spotcheck.html'), template.replace('/*ITEMS*/[]', json));
  fs.writeFileSync(
    outPath('jev-spotcheck-ids.json'),
    JSON.stringify(order.map((it) => it.id)) + '\n'
  );
  console.log(`Spot-check: ${data.length} items`);
}

main();
