#!/usr/bin/env node
/**
 * Prints a review sheet for each page in a batch: the position, the text under
 * review, the move sequences that fail to replay, and the style brief's
 * overview where one exists.
 *
 *   node tools/content-review/sheet.js data/content-review/batches/2026-11-01.json [--from 1] [--to 10]
 */
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { REPO, checkMoves, loadRecords } = require('./ledger');

function brief(fen, styleTags) {
  const slug = styleTags.positions[fen];
  const file = slug && path.join(REPO, 'tools/data/style-briefs', `${slug}.json`);
  if (!file || !fs.existsSync(file)) return null;
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { slug, tier: b.tier || 'researched', overview: b.overview };
}

function main() {
  const args = process.argv.slice(2);
  const num = (name, fallback) =>
    args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
  const { pages } = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const records = loadRecords();
  const styleTags = JSON.parse(
    fs.readFileSync(path.join(REPO, 'api/data/style-tags.json'), 'utf8')
  );
  const from = num('--from', 1);
  const to = num('--to', pages.length);

  for (let i = from - 1; i < Math.min(to, pages.length); i++) {
    const { fen } = pages[i];
    const r = records[fen];
    const a = r.analysis_json;
    const text = [a.description, ...(a.common_plans || [])].join('\n');
    const problems = checkMoves(text, r.moves);
    const b = brief(fen, styleTags);
    console.log(`## ${i + 1}. ${r.name} (${r.eco})\n`);
    console.log(`${r.moves}\n${fen}\n`);
    console.log(new Chess(fen).ascii());
    console.log(`\nDescription: ${a.description}\n`);
    (a.common_plans || []).forEach((p, n) => console.log(`Plan ${n + 1}: ${p}`));
    console.log(
      `\nMoves: ${problems.length ? problems.map((p) => `${p.sequence} (${p.problem})`).join('; ') : 'all replay'}`
    );
    console.log(b ? `Brief (${b.slug}, ${b.tier}): ${b.overview}` : 'Brief: none');
    console.log('\n---\n');
  }
}

main();
