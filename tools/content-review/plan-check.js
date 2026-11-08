/**
 * Runs the plan-reference parser over every opening's Common plans and lists
 * the moves, routes and pieces that fail the check against the position.
 *
 *   node tools/content-review/plan-check.js [--views data/content-review/views/<date>.json]
 *
 * These references show as plain text on the page instead of being drawn on
 * the plans diagram, so each one is a plan to fix. The parser is the page's own
 * (packages/web/src/lib/planReferences.ts), imported here through Node's type
 * stripping so the report and the page can never disagree. Pages are sorted by
 * views when a views file is given, most viewed first.
 *
 * Writes data/content-review/plan-check-report.json and plan-check-summary.md.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { REPO, fenFromPath, loadRecords } = require('./ledger');

const PARSER = path.join(REPO, 'packages/web/src/lib/planReferences.ts');
const OUT_DIR = path.join(REPO, 'data/content-review');

function viewCounts(viewsFile) {
  const counts = new Map();
  if (!viewsFile) return counts;
  const { pages } = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
  for (const page of pages) {
    const fen = fenFromPath(page.path);
    if (fen) counts.set(fen, (counts.get(fen) || 0) + page.views);
  }
  return counts;
}

async function main() {
  const args = process.argv.slice(2);
  const viewsFile = args.includes('--views') ? args[args.indexOf('--views') + 1] : null;
  const { parsePlan } = await import(pathToFileURL(PARSER).href);

  const views = viewCounts(viewsFile);
  const records = loadRecords();
  const byKind = {};
  const byStatus = {};
  let plans = 0;
  let plansWithoutReferences = 0;
  const pages = [];

  for (const [fen, record] of Object.entries(records)) {
    const planTexts = record.analysis_json?.common_plans || [];
    const flagged = [];
    for (const plan of planTexts) {
      plans++;
      const refs = parsePlan(fen, plan).segments.filter((s) => typeof s !== 'string');
      if (refs.length === 0) plansWithoutReferences++;
      for (const ref of refs) {
        byKind[ref.kind] = (byKind[ref.kind] || 0) + 1;
        byStatus[ref.status] = (byStatus[ref.status] || 0) + 1;
        if (ref.status === 'invalid')
          flagged.push({ plan, reference: ref.text, reason: ref.reason });
      }
    }
    if (flagged.length) {
      pages.push({ fen, eco: record.eco, name: record.name, views: views.get(fen) || 0, flagged });
    }
  }

  pages.sort(
    (a, b) => b.views - a.views || a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name)
  );
  const totals = {
    openings: Object.keys(records).length,
    plans,
    plansWithoutReferences,
    referencesByKind: byKind,
    referencesByStatus: byStatus,
    pagesFlagged: pages.length,
    referencesFlagged: pages.reduce((n, p) => n + p.flagged.length, 0),
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'plan-check-report.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), views: viewsFile, totals, pages },
      null,
      2
    ) + '\n'
  );

  const lines = [
    '# Plan reference check',
    '',
    `${totals.referencesFlagged} references on ${totals.pagesFlagged} of ${totals.openings} pages fail the check and show as plain text.`,
    '',
    `- Plans: ${plans}, of which ${plansWithoutReferences} name no move, route, square or piece`,
    `- References by kind: ${JSON.stringify(byKind)}`,
    `- References by result: ${JSON.stringify(byStatus)}`,
    '',
    viewsFile
      ? `## Most viewed flagged pages (views from ${path.basename(viewsFile)})`
      : '## First flagged pages',
    '',
    ...pages
      .slice(0, 30)
      .flatMap((p) => [
        `- **${p.eco} ${p.name}** (${p.views} views)`,
        ...p.flagged.map((f) => `  - \`${f.reference}\`: ${f.reason}`),
      ]),
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'plan-check-summary.md'), lines.join('\n'));
  console.log(lines.slice(0, 7).join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
