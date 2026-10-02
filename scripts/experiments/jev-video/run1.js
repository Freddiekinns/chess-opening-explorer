#!/usr/bin/env node
/**
 * Run 1: verify the matches on the site.
 *
 * For every displayed video, asks how it relates to each named opening whose
 * page shows it (wording A). A trailing move list is stripped from page names
 * ("Vienna: Frankenstein-Dracula, 11.d3"), so one answer covers every position
 * that shares a name; jev-run1.plan.json maps names back to positions.
 *
 * Usage: node scripts/experiments/jev-video/run1.js [--dry-run] [--largest N]
 *   --largest N  ask only the N calls with the most questions (a trial of the
 *                call sizes the pilot never sent); a later full run skips them
 * Output: tools/data/experiments/jev-run1.jsonl (resumable)
 */

const crypto = require('crypto');
const fs = require('fs');
const {
  MODEL,
  loadCorpus,
  loadIndex,
  loadEco,
  buildDisplayedPairs,
  videoState,
  openingLabel,
  relationQuestion,
  inputVersions,
  outPath,
  readJsonl,
  runCalls,
  totalTokens,
  costUsd,
} = require('./lib');

const DRY_RUN = process.argv.includes('--dry-run');
const LARGEST = process.argv.includes('--largest')
  ? Number(process.argv[process.argv.indexOf('--largest') + 1])
  : null;
// Keeps a call near 9k tokens, well inside the 64k request limit.
const QUESTIONS_PER_CALL = 40;
const CONCURRENCY = 6;

function planCalls() {
  const corpus = loadCorpus();
  const { openings, pairs } = buildDisplayedPairs(loadIndex(), loadEco());
  const calls = [];
  for (const id of [...pairs.keys()].sort()) {
    const names = [...pairs.get(id)].sort();
    for (let start = 0; start < names.length; start += QUESTIONS_PER_CALL) {
      const chunk = names.slice(start, start + QUESTIONS_PER_CALL);
      const questions = {};
      const meta = {};
      chunk.forEach((name, i) => {
        const opening = openings.get(name);
        questions[`q${i}`] = relationQuestion(opening);
        meta[`q${i}`] = {
          opening: name,
          label: openingLabel(opening),
          // The name itself is a move order: no video text will say it, so
          // `not_about` here measures naming granularity, not a bad match.
          named_by_moves: /\d\./.test(name),
        };
      });
      // Keyed by content, so a resume after the inputs change re-asks rather
      // than skipping a chunk that now holds different openings.
      const hash = crypto
        .createHash('sha1')
        .update(chunk.map((n) => openingLabel(openings.get(n))).join('\n'))
        .digest('hex')
        .slice(0, 12);
      calls.push({
        key: `${id}:${hash}`,
        kind: 'relation',
        video_id: id,
        meta,
        state: videoState(corpus[id]),
        questions,
      });
    }
  }
  return { calls, openings, pairs };
}

function writePlan(file, openings, pairs) {
  const plan = { openings: {}, videos: {} };
  for (const [name, o] of openings) {
    plan.openings[name] = { label: openingLabel(o), eco: o.eco, positions: o.positions };
  }
  for (const [id, names] of pairs) plan.videos[id] = [...names].sort();
  fs.writeFileSync(file, JSON.stringify(plan) + '\n');
}

async function main() {
  const { calls, openings, pairs } = planCalls();
  const questions = calls.reduce((a, c) => a + Object.keys(c.questions).length, 0);
  console.log(
    `Planned: ${calls.length} calls, ${questions} questions (video × named-opening pairs)`
  );
  if (DRY_RUN) return;

  const manifest = outPath('jev-run1.manifest.json');
  if (!fs.existsSync(manifest)) {
    const versions = inputVersions([
      'api/data/video-index.json',
      'api/data/eco',
      'tools/data/video_enrichment_cache.json',
    ]);
    fs.writeFileSync(
      manifest,
      JSON.stringify(
        {
          run: 1,
          model: MODEL,
          wording: 'A',
          questions_per_call: QUESTIONS_PER_CALL,
          ...versions,
          started: new Date().toISOString(),
        },
        null,
        2
      ) + '\n'
    );
    writePlan(outPath('jev-run1.plan.json'), openings, pairs);
  }

  const selected = LARGEST
    ? [...calls]
        .sort((a, b) => Object.keys(b.questions).length - Object.keys(a.questions).length)
        .slice(0, LARGEST)
    : calls;
  const file = outPath('jev-run1.jsonl');
  const failed = await runCalls(selected, file, { concurrency: CONCURRENCY });

  const records = readJsonl(file);
  const tokens = totalTokens(records);
  const dist = {};
  for (const r of records) {
    for (const a of Object.values(r.answers)) dist[a.choice] = (dist[a.choice] || 0) + 1;
  }
  console.log(`\nAnswered calls: ${records.length}/${calls.length}`);
  console.log(`Input tokens: ${tokens} ≈ $${costUsd(tokens).toFixed(4)}`);
  console.log('Answers:', dist);
  if (failed) {
    console.error(`\n${failed} calls failed; re-run to retry them.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
