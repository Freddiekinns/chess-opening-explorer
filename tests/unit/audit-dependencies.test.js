const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'audit-dependencies.js');

const { npmInvocation, AUDIT_ARGS } = require('../../scripts/audit-dependencies');

/**
 * The gate could not run on Windows at all.
 *
 * npm ships there as `npm.cmd`, a batch shim. Spawning a bare `npm` throws
 * ENOENT, and naming `npm.cmd` is no better — since the fix for
 * CVE-2024-27980 Node refuses to `execFile` a `.cmd` and throws EINVAL. So
 * `npm run security:audit` exited 1 before auditing anything, printing
 * "Dependency audit could not be completed", which reads exactly like a real
 * finding. CI runs on Linux, which is why it survived PR #70.
 *
 * The fix runs npm's own JS entry point with the Node binary already executing
 * this file, so no shim and no shell is involved on any platform.
 */
describe('the audit invokes npm without a shell or a shim', () => {
  const NODE = process.execPath;

  it('runs npm-cli.js with the current node binary when npm run told it where npm is', () => {
    const { command, args } = npmInvocation(
      { npm_execpath: '/somewhere/npm/bin/npm-cli.js' },
      'win32'
    );
    expect(command).toBe(NODE);
    expect(args).toEqual(['/somewhere/npm/bin/npm-cli.js', ...AUDIT_ARGS]);
  });

  it('never returns a .cmd, which node cannot execFile at all', () => {
    const { command, args } = npmInvocation({}, 'win32');
    expect(command).not.toMatch(/\.cmd$/i);
    expect(args.some((a) => /\.cmd$/i.test(a))).toBe(false);
  });

  it('never returns a bare npm on Windows, where PATH lookup finds only the shim', () => {
    const { command } = npmInvocation({}, 'win32');
    expect(command).not.toBe('npm');
  });

  it('ignores an npm_execpath that is not a JS entry point', () => {
    // npm sets this to the .cmd shim in some older setups; running that under
    // node would fail exactly the way this bug did.
    const { command, args } = npmInvocation({ npm_execpath: 'C:\\npm\\npm.cmd' }, 'win32');
    expect(args[0]).not.toMatch(/\.cmd$/i);
    expect(command).toBe(NODE);
  });

  it('always carries the audit arguments, whichever route it takes', () => {
    for (const env of [{ npm_execpath: '/x/npm-cli.js' }, {}]) {
      for (const platform of ['win32', 'linux']) {
        const { args } = npmInvocation(env, platform);
        expect(args.slice(-AUDIT_ARGS.length)).toEqual(AUDIT_ARGS);
      }
    }
  });

  /**
   * The assertion that would have caught this originally: not what the strings
   * are, but whether the process can actually be spawned here. `--version`
   * costs nothing and touches no network.
   */
  it('names something this machine can actually execute', () => {
    const { command, args } = npmInvocation();
    const version = execFileSync(command, [...args.slice(0, -AUDIT_ARGS.length), '--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('the audit script stays requirable and stays a gate', () => {
  const source = fs.readFileSync(SCRIPT, 'utf-8');
  // Comments explain why `shell: true` was rejected, so the code-level checks
  // below read the source with comments stripped rather than matching prose.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('does not run the audit merely because it was required', () => {
    // This file requires the module at the top. If main() still ran on load it
    // would shell out to npm audit and process.exit(1), taking the worker with
    // it — so reaching this line is the assertion.
    expect(typeof npmInvocation).toBe('function');
  });

  it('guards its entry point on require.main, like the other build scripts', () => {
    expect(code).toMatch(/require\.main === module/);
  });

  it('does not spawn a bare npm literal any more', () => {
    expect(code).not.toMatch(/execFileSync\(\s*'npm'/);
  });

  /**
   * `shell: true` would also resolve the shim, and is the wrong fix: the argv
   * is fixed today, but a shell turns any future interpolation into an
   * injection — in a security gate of all places.
   */
  it('does not reach for shell: true to resolve the shim', () => {
    expect(code).not.toMatch(/shell:\s*true/);
  });

  it('still fails closed rather than open — the allowlist is empty', () => {
    const { ALLOWLIST, FAIL_ON } = require('../../scripts/audit-dependencies');
    expect(Object.keys(ALLOWLIST)).toEqual([]);
    expect([...FAIL_ON].sort()).toEqual(['critical', 'high']);
  });
});
