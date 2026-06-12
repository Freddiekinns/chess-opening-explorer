#!/usr/bin/env node

/**
 * Audit: Common Plans provenance and content checks
 *
 * The detail page's "Common plans" panel is served by
 * GET /api/openings/eco-analysis/:code, which returns the analysis of the
 * FIRST record in merged-object iteration order matching the ECO code
 * (see eco-service.js getECOAnalysis). This script models that serving logic
 * against the real data files and reports:
 *
 *   Tier 0 (provenance): how many opening pages are served plans that belong
 *     to a different record than the page's own FEN. After the fix (plans
 *     keyed by FEN), this number must be 0 by construction — re-run this
 *     script to verify.
 *
 *   Tier 1 (content lint): for each record's OWN plans, flag text that
 *     mentions a different opening family's name. This is a triage signal,
 *     not a verdict — "transpose into a Sicilian" is legitimate advice.
 *
 * Usage:
 *   node scripts/audit-common-plans.js                 # console summary
 *   node scripts/audit-common-plans.js --json out.json # full report
 *   node scripts/audit-common-plans.js --top 25        # widen bucket table
 */

const fs = require('fs');
const path = require('path');

const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

function parseArgs(argv) {
  const args = { json: null, top: 15, examples: 10 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--json') args.json = argv[++i];
    else if (argv[i] === '--top') args.top = Number(argv[++i]) || args.top;
    else if (argv[i] === '--examples') args.examples = Number(argv[++i]) || args.examples;
  }
  return args;
}

// Merge files exactly like eco-service.loadECOData so iteration order matches
// what the API serves.
function loadMergedEcoData() {
  const merged = {};
  for (const filename of ECO_FILES) {
    const filePath = path.join(ECO_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing ECO file: ${filePath}. Run 'npm run eco:import' first.`);
      process.exit(1);
    }
    Object.assign(merged, JSON.parse(fs.readFileSync(filePath, 'utf8')));
  }
  return merged;
}

function getAnalysis(opening) {
  if (!opening.analysis_json) return null;
  if (typeof opening.analysis_json === 'string') {
    try {
      return JSON.parse(opening.analysis_json);
    } catch {
      return null;
    }
  }
  return opening.analysis_json;
}

const familyOf = (name) => (name || '').split(':')[0].trim();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const args = parseArgs(process.argv);
  const ecoData = loadMergedEcoData();
  const entries = Object.entries(ecoData);

  // --- Model the current serving logic: first enriched record per ECO code ---
  const served = {};
  for (const [fen, o] of entries) {
    if (o.eco && getAnalysis(o) && !served[o.eco]) {
      served[o.eco] = { fen, name: o.name, moves: o.moves };
    }
  }

  // What Option B would serve instead: the bucket's shortest line (family root)
  const canonical = {};
  for (const [fen, o] of entries) {
    if (!o.eco || !getAnalysis(o)) continue;
    const len = (o.moves || '').length;
    if (!canonical[o.eco] || len < canonical[o.eco].len) {
      canonical[o.eco] = { fen, name: o.name, moves: o.moves, len };
    }
  }

  // --- Tier 0: provenance ---
  let total = 0;
  let withOwnPlans = 0;
  let provenanceMismatch = 0;
  let familyMismatch = 0;
  const bucketDamage = {}; // eco -> { servedName, pages, familyMismatchPages }
  const examples = [];

  for (const [fen, o] of entries) {
    if (!o.eco) continue;
    total++;
    const analysis = getAnalysis(o);
    if (analysis && Array.isArray(analysis.common_plans) && analysis.common_plans.length > 0) {
      withOwnPlans++;
    }
    const s = served[o.eco];
    if (!s) continue;

    bucketDamage[o.eco] = bucketDamage[o.eco] || {
      servedName: s.name,
      canonicalName: canonical[o.eco] ? canonical[o.eco].name : null,
      pages: 0,
      familyMismatchPages: 0,
    };
    bucketDamage[o.eco].pages++;

    if (s.fen !== fen) {
      provenanceMismatch++;
      if (familyOf(s.name) !== familyOf(o.name)) {
        familyMismatch++;
        bucketDamage[o.eco].familyMismatchPages++;
        if (examples.length < args.examples) {
          examples.push({
            eco: o.eco,
            page: o.name,
            pageMoves: o.moves,
            servedPlansFrom: s.name,
            servedMoves: s.moves,
          });
        }
      }
    }
  }

  // --- Tier 1: foreign-family-name mentions in a record's OWN plans ---
  const familyNames = new Set();
  for (const [, o] of entries) {
    const fam = familyOf(o.name);
    // Multi-word names only; single words ("Polish") are too noisy to match on
    if (fam && fam.includes(' ')) familyNames.add(fam);
  }
  const alternation = [...familyNames].map(escapeRegex).join('|');
  const familyMentionRe = new RegExp(`\\b(${alternation})\\b`, 'gi');

  const lintFlags = [];
  for (const [fen, o] of entries) {
    const analysis = getAnalysis(o);
    if (!analysis || !Array.isArray(analysis.common_plans)) continue;
    const ownFamily = familyOf(o.name).toLowerCase();
    const text = analysis.common_plans.join(' ');
    const mentioned = new Set();
    let m;
    familyMentionRe.lastIndex = 0;
    while ((m = familyMentionRe.exec(text)) !== null) {
      const hit = m[1];
      if (hit.toLowerCase() !== ownFamily) mentioned.add(hit);
    }
    if (mentioned.size > 0) {
      lintFlags.push({ eco: o.eco, fen, name: o.name, mentions: [...mentioned] });
    }
  }

  // --- Report ---
  const worstBuckets = Object.entries(bucketDamage)
    .filter(([, b]) => b.familyMismatchPages > 0)
    .sort((a, b) => b[1].familyMismatchPages - a[1].familyMismatchPages)
    .slice(0, args.top);

  const pct = (n) => ((100 * n) / total).toFixed(1) + '%';

  console.log('Common Plans audit');
  console.log('==================');
  console.log(`Openings (pages):                    ${total}`);
  console.log(`  with their own plans in data:      ${withOwnPlans} (${pct(withOwnPlans)})`);
  console.log(`ECO buckets serving plans:           ${Object.keys(served).length}`);
  console.log('');
  console.log('Tier 0 — provenance (current /eco-analysis serving logic):');
  console.log(
    `  pages served another record's plans: ${provenanceMismatch} (${pct(provenanceMismatch)})`
  );
  console.log(`  ...from a different opening family:  ${familyMismatch} (${pct(familyMismatch)})`);
  console.log('');
  console.log(`Worst buckets (top ${args.top} by family-mismatched pages):`);
  for (const [eco, b] of worstBuckets) {
    console.log(
      `  ${eco}  ${String(b.familyMismatchPages).padStart(4)} pages get plans from "${b.servedName}"` +
        (b.canonicalName && b.canonicalName !== b.servedName
          ? ` (bucket root: "${b.canonicalName}")`
          : '')
    );
  }
  console.log('');
  console.log('Sample mismatches:');
  for (const e of examples) {
    console.log(`  [${e.eco}] page "${e.page}" (${e.pageMoves})`);
    console.log(`        shows plans for "${e.servedPlansFrom}" (${e.servedMoves})`);
  }
  console.log('');
  console.log('Tier 1 — own plans mentioning another family name (triage signal only):');
  console.log(`  flagged records: ${lintFlags.length} (${pct(lintFlags.length)})`);

  if (args.json) {
    const report = {
      generated_at: new Date().toISOString(),
      totals: {
        openings: total,
        with_own_plans: withOwnPlans,
        eco_buckets: Object.keys(served).length,
        provenance_mismatch: provenanceMismatch,
        family_mismatch: familyMismatch,
        lint_flagged: lintFlags.length,
      },
      buckets: bucketDamage,
      examples,
      lint_flags: lintFlags,
    };
    fs.writeFileSync(args.json, JSON.stringify(report, null, 2));
    console.log(`\nFull report written to ${args.json}`);
  }
}

main();
