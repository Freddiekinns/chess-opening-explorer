#!/usr/bin/env node
/**
 * Writes a batch's verdicts to the ledger, hashing each page's text as it
 * stands now. Run it after the batch's fixes are in api/data/eco/.
 *
 *   node tools/content-review/record.js data/content-review/batches/2026-11-01.json
 *
 * Pages whose verdict is still null are left for the next batch.
 */
const fs = require('fs');
const { recordReviews, loadRecords, readLedger, writeLedger } = require('./ledger');

function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: record.js <batch file>');
  const { pages } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const before = readLedger();
  const after = recordReviews(before, pages, loadRecords(), today);
  writeLedger(after);
  const done = pages.filter((p) => p.verdict != null).length;
  console.log(
    `Recorded ${done} of ${pages.length} pages; the ledger holds ${Object.keys(after).length}.`
  );
}

main();
