#!/usr/bin/env node
/**
 * Ranks the opening pages people visited that are due a review.
 *
 *   node tools/content-review/queue.js --views data/content-review/views/2026-11-01.json [--top 50] [--write]
 *
 * The views file is an export of `/opening/…` page views (README.md, "Export
 * the views"). --write saves the ranked list as the next batch,
 * data/content-review/batches/<views file name>, for sheet.js and record.js.
 */
const fs = require('fs');
const path = require('path');
const { REPO, buildQueue, loadRecords, readLedger } = require('./ledger');

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => args[args.indexOf(name) + 1];
  if (!args.includes('--views'))
    throw new Error('usage: queue.js --views <file> [--top N] [--write]');
  const viewsFile = flag('--views');
  const top = args.includes('--top') ? Number(flag('--top')) : 50;

  const views = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const { queue, unmatched } = buildQueue({
    pages: views.pages,
    ledger: readLedger(),
    records: loadRecords(),
    today,
    top,
  });

  queue.forEach((q, i) =>
    console.log(
      `${String(i + 1).padStart(3)}  ${q.people}p ${q.views}v  ${q.reason.padEnd(10)}  ${q.eco}  ${q.name}`
    )
  );
  if (unmatched.length)
    console.log(`\n${unmatched.length} paths match no ECO record:\n  ${unmatched.join('\n  ')}`);

  if (args.includes('--write')) {
    const out = path.join(REPO, 'data/content-review/batches', path.basename(viewsFile));
    const batch = {
      views: path.relative(REPO, viewsFile).replace(/\\/g, '/'),
      created: today,
      pages: queue.map((q) => ({ ...q, verdict: null, notes: '' })),
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(batch, null, 2) + '\n');
    console.log(`\nWrote ${path.relative(REPO, out)}`);
  }
}

main();
