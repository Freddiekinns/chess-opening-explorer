#!/usr/bin/env node
/**
 * Stage 0: one call, to confirm the key works and see what `usage` reports.
 * Usage: node scripts/experiments/jev-video/smoke.js
 */

const { loadCorpus, videoState, askJev, costUsd } = require('./lib');

async function main() {
  const video = loadCorpus()['rd1eKLJ3DGQ']; // Hanging Pawns, "The Accelerated Dragon"
  const result = await askJev(videoState(video), {
    is_opening_video: {
      type: 'noul',
      instructions: 'Is this video mainly about a specific chess opening?',
    },
  });
  console.log(JSON.stringify(result, null, 2));
  const tokens = result.usage && result.usage.input_tokens;
  if (tokens != null) console.log(`\n${tokens} input tokens ≈ $${costUsd(tokens).toFixed(6)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
