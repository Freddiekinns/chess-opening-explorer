#!/usr/bin/env node
/**
 * Copies the tags in unsourced briefs (UNSOURCED.md) into _classify/claude.json,
 * where they stand as classifier A's answer alongside the researched briefs'.
 *
 *   node tools/style-tags/collect-unsourced.js [dir]
 *
 * The writer of an unsourced brief classifies it too: a separate Sonnet pass
 * over the same evidence would add cost but no independence, since both come
 * from the same model's knowledge. Jev, reading only the evidence, is the check.
 */
const fs = require('fs');
const path = require('path');

const BRIEFS = path.join(__dirname, '../data/style-briefs');
const dir = process.argv[2] || BRIEFS;
const out = process.argv[3] || path.join(BRIEFS, '_classify/claude.json');

const A = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
let n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const brief = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (brief.tier !== 'unsourced' || !brief.tags) continue;
  A[brief.slug] = { tier: 'unsourced', ...brief.tags };
  n++;
}
fs.writeFileSync(out, JSON.stringify(A, null, 2) + '\n');
console.log(`${n} unsourced briefs collected into ${path.relative(process.cwd(), out)}`);
