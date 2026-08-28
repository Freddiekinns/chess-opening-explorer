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
const fs = require('fs');
const path = require('path');

const FAIL_ON = new Set(['high', 'critical']);

/**
 * Empty, and worth keeping that way.
 *
 * It briefly held sqlite3's native build chain (tar, node-gyp, cacache,
 * make-fetch-happen) on the grounds that none of it is deployed. That was true
 * and still a worse answer than upgrading: sqlite3 6 cleared all of it,
 * including the only critical in the tree, and the stale check above is what
 * made the point by failing the moment the upgrade landed.
 *
 * Reach for an entry only when an advisory genuinely cannot touch production
 * and no upgrade exists. Format: package name -> reason, ending in the
 * condition that removes it.
 */
const ALLOWLIST = {};

const AUDIT_ARGS = ['audit', '--omit=dev', '--json'];

/**
 * Where npm's own entry point sits relative to the node binary.
 *
 * The platforms disagree and getting it wrong is silent: Windows keeps
 * `node_modules/` beside `node.exe`, POSIX keeps it in `../lib`. A
 * Windows-shaped join simply never resolves on Linux, so the fallback below
 * looks present and does nothing.
 */
function bundledNpmCli(execPath, platform) {
  const dir = path.dirname(execPath);
  const tail = ['node_modules', 'npm', 'bin', 'npm-cli.js'];
  return platform === 'win32' ? path.join(dir, ...tail) : path.join(dir, '..', 'lib', ...tail);
}

/**
 * How to run npm without going near a shell.
 *
 * On Windows npm is `npm.cmd`, a batch shim. Spawning a bare `npm` throws
 * ENOENT, and naming `npm.cmd` explicitly is no better — since the fix for
 * CVE-2024-27980, Node refuses to `execFile` a `.cmd` at all and throws
 * EINVAL. So the gate exited 1 before auditing anything, printing "could not
 * be completed", which reads exactly like a real finding. Linux CI never saw
 * it, so it survived PR #70.
 *
 * The way out is not `shell: true` — the argv here is fixed today, but a shell
 * turns any later interpolation into an injection, and a security gate is the
 * wrong place to leave that lying around. Instead run npm's own JavaScript
 * entry point with the Node binary already executing this file. No shim, no
 * shell, identical on every platform.
 *
 * **Everything the answer depends on is a parameter.** The first version took
 * `platform` but resolved the bundled path against the real `process.execPath`
 * and the real filesystem, so asking it for Windows behaviour on Linux gave
 * neither — it threw, from a branch the host chose. Four tests passed on
 * Windows and would have gone red on CI.
 */
function npmInvocation(options = {}) {
  const {
    env = process.env,
    platform = process.platform,
    execPath = process.execPath,
    exists = fs.existsSync,
  } = options;

  // `npm run` sets npm_execpath to npm's own JS entry point, which is how CI
  // and the package script get here. Checked for existence like the path
  // below it: a stale value from a shell that outlived an npm upgrade would
  // otherwise surface as "Cannot find module" wearing an audit failure.
  //
  // The basename test rejects yarn and pnpm, which set the same variable to
  // their own entry point — running those with npm's arguments fails in a way
  // that reads like a broken audit rather than the wrong package manager.
  const fromNpm = env.npm_execpath;
  if (fromNpm && path.basename(fromNpm) === 'npm-cli.js' && exists(fromNpm)) {
    return { command: execPath, args: [fromNpm, ...AUDIT_ARGS] };
  }

  const bundled = bundledNpmCli(execPath, platform);
  if (exists(bundled)) {
    return { command: execPath, args: [bundled, ...AUDIT_ARGS] };
  }

  // Nothing left to invoke by path. A POSIX shell resolves `npm` from PATH on
  // its own; Windows cannot, so say so rather than throwing ENOENT/EINVAL and
  // letting it read as an audit finding.
  if (platform === 'win32') {
    throw new Error(
      'could not locate npm-cli.js (npm_execpath unset and none bundled beside node). ' +
        'Run this through `npm run security:audit` rather than invoking the script directly.'
    );
  }
  return { command: 'npm', args: [...AUDIT_ARGS] };
}

function runAudit() {
  const { command, args } = npmInvocation();
  // npm audit exits non-zero whenever it finds anything, so a throw here is
  // the normal path and the payload still comes back on stdout.
  try {
    return execFileSync(command, args, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

/**
 * A registry or proxy failure makes `npm audit` exit non-zero with a JSON error
 * object and no `vulnerabilities` key — the same shape, to a careless reader, as
 * a clean tree. Treating that as "nothing found" makes the gate pass at exactly
 * the moment it has checked nothing, which is the one failure mode a security
 * gate must not have. So the absence of the key is an error, never an empty
 * result: a clean audit still returns `vulnerabilities: {}` and `metadata`.
 */
function parseReport(raw) {
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new Error(`npm audit did not return JSON:\n${raw.slice(0, 500)}`);
  }

  // npm is inconsistent about where the reason lands: a registry rejection sets
  // a top-level `message` and leaves `error.summary` an empty string, so read
  // both before giving up and calling it unknown.
  if (report.error || report.message) {
    const { code, summary, detail } = report.error || {};
    const reason = summary || detail || report.message || 'unknown error';
    throw new Error(`npm audit failed${code ? ` (${code})` : ''}: ${reason}`);
  }

  if (!report.vulnerabilities || !report.metadata) {
    throw new Error(
      'npm audit returned no vulnerabilities/metadata. Treating as a failed audit, ' +
        'not a clean one.'
    );
  }

  return report;
}

function main() {
  const report = parseReport(runAudit());
  const found = report.vulnerabilities;

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

// Guarded so the module can be required without shelling out to npm audit and
// exiting the caller's process — the other build scripts here do the same.
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\nDependency audit could not be completed: ${error.message}`);
    console.error('Failing rather than passing — an audit that did not run is not a clean audit.');
    process.exit(1);
  }
}

module.exports = { npmInvocation, bundledNpmCli, parseReport, AUDIT_ARGS, ALLOWLIST, FAIL_ON };
