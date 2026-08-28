#!/usr/bin/env node
/**
 * Dependency advisory gate.
 *
 * Wraps `npm audit --omit=dev` and fails only on high and critical findings
 * that are not explicitly allowlisted below.
 *
 * Two decisions are worth explaining, because both look like weakening the
 * check and neither is.
 *
 * `--omit=dev`: vitest, vite and esbuild advisories describe a dev server
 * listening on a laptop. They are real, they are also unreachable from
 * anything we deploy, and a gate that fires on them trains the override.
 * Dependabot still opens PRs for dev dependencies; this gate just does not
 * block a merge on them.
 *
 * The allowlist: every entry needs a reason and the condition that removes it.
 * An allowlist that accumulates silently is the same failure as no gate, so a
 * stale entry — one whose advisories have gone — is reported and fails the run
 * too, which is what forces the cleanup.
 *
 * Keyed by package name rather than advisory id deliberately. The allowlisted
 * packages earn their place by being unreachable from production, not by the
 * specific advisory, and node-tar alone accrues new GHSA ids faster than
 * anyone would keep a list current.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const FAIL_ON = new Set(['high', 'critical']);

/**
 * `sqlite3` is a root production dependency, so `--omit=dev` still reports it
 * and its entire native-build toolchain. Nothing in that chain is deployed:
 * the only consumer is the video pipeline's local SQLite database, which runs
 * on a laptop and in the pipeline workflow. Clearing it means sqlite3 6, a
 * semver-major with a native rebuild — worth doing, on its own schedule.
 *
 * See docs/reviews/2026-08-28-dependency-security-scanning.md.
 */
const SQLITE_BUILD_CHAIN_REASON =
  'sqlite3 native build toolchain; used only by tools/, never deployed. Clears with sqlite3@6.';

const ALLOWLIST = {
  sqlite3: SQLITE_BUILD_CHAIN_REASON,
  tar: SQLITE_BUILD_CHAIN_REASON,
  'node-gyp': SQLITE_BUILD_CHAIN_REASON,
  cacache: SQLITE_BUILD_CHAIN_REASON,
  'make-fetch-happen': SQLITE_BUILD_CHAIN_REASON,
};

function runAudit() {
  // npm audit exits non-zero whenever it finds anything, so a throw here is
  // the normal path and the payload still comes back on stdout.
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

function main() {
  const report = JSON.parse(runAudit());
  const found = report.vulnerabilities || {};

  const blocking = [];
  const allowed = [];

  for (const [name, entry] of Object.entries(found)) {
    if (!FAIL_ON.has(entry.severity)) continue;
    if (Object.prototype.hasOwnProperty.call(ALLOWLIST, name)) {
      allowed.push({ name, severity: entry.severity });
    } else {
      blocking.push({ name, severity: entry.severity, via: entry.via });
    }
  }

  const stale = Object.keys(ALLOWLIST).filter(
    (name) => !found[name] || !FAIL_ON.has(found[name].severity)
  );

  const counts = (report.metadata && report.metadata.vulnerabilities) || {};
  console.log(
    `Production dependency audit: ${counts.critical || 0} critical, ` +
      `${counts.high || 0} high, ${counts.moderate || 0} moderate, ${counts.low || 0} low.`
  );

  if (allowed.length) {
    console.log('\nAllowlisted (not blocking):');
    for (const { name, severity } of allowed) {
      console.log(`  - ${name} (${severity}): ${ALLOWLIST[name]}`);
    }
  }

  if (stale.length) {
    console.error('\nStale allowlist entries — these no longer have a high or critical advisory.');
    console.error('Remove them from scripts/audit-dependencies.js:');
    for (const name of stale) console.error(`  - ${name}`);
  }

  if (blocking.length) {
    console.error('\nBlocking advisories:');
    for (const { name, severity, via } of blocking) {
      const titles = (via || [])
        .filter((v) => typeof v === 'object' && v.title)
        .map((v) => v.title);
      console.error(`  - ${name} (${severity})`);
      for (const title of [...new Set(titles)].slice(0, 4)) {
        console.error(`      ${title}`);
      }
    }
    console.error(
      '\nFix with `npm audit fix`, or — if the advisory genuinely cannot reach production —\n' +
        'add it to the allowlist in scripts/audit-dependencies.js with a reason and the\n' +
        'condition that removes it.'
    );
  }

  if (blocking.length || stale.length) process.exit(1);

  console.log('\nNo blocking advisories.');
}

main();
