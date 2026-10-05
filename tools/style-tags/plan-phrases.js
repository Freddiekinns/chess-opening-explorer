#!/usr/bin/env node
/**
 * Counts the plan_phrases the briefs collected, as raw material for the closed
 * plans list in docs/style-taxonomy.md. Phrases are lower-cased and stripped of
 * punctuation; the count is how many variations use each one.
 *
 *   node tools/style-tags/plan-phrases.js [--min 2]
 */
const fs = require('fs');
const path = require('path');

const BRIEFS = path.join(__dirname, '../data/style-briefs');
const i = process.argv.indexOf('--min');
const min = i > -1 ? Number(process.argv[i + 1]) : 2;

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ….-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const counts = new Map();
let briefs = 0;
for (const f of fs.readdirSync(BRIEFS).filter((f) => f.endsWith('.json'))) {
  const brief = JSON.parse(fs.readFileSync(path.join(BRIEFS, f), 'utf8'));
  briefs++;
  for (const phrase of new Set((brief.plan_phrases || []).map(norm))) {
    if (!counts.has(phrase)) counts.set(phrase, []);
    counts.get(phrase).push(brief.slug);
  }
}

const rows = [...counts]
  .filter(([, s]) => s.length >= min)
  .sort((a, b) => b[1].length - a[1].length);
console.log(
  `${briefs} briefs, ${counts.size} distinct phrases, ${rows.length} used by >= ${min}\n`
);
for (const [phrase, slugs] of rows) console.log(`${String(slugs.length).padStart(3)}  ${phrase}`);
