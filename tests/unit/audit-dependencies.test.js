const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'audit-dependencies.js');

const { npmInvocation, bundledNpmCli, AUDIT_ARGS } = require('../../scripts/audit-dependencies');

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
 * Every case below injects `execPath`, `platform` and `exists`, so it asserts
 * the same thing whichever machine runs it. The first version of these tests
 * did not: they passed `platform: 'win32'` while the bundled lookup consulted
 * the host filesystem, so four of them passed on Windows and would have thrown
 * on CI.
 */
const WIN_NODE = 'C:\\Program Files\\nodejs\\node.exe';
const NIX_NODE = '/usr/local/bin/node';

/** Filesystem stub: only the listed paths exist. */
const only = (...present) => {
  const set = new Set(present);
  return (candidate) => set.has(candidate);
};

const none = () => false;

describe('npm is located the same way regardless of the host running the test', () => {
  // Literal expectations, never path.join. Composing the expected value with
  // the *host's* path module is exactly how the first version of this file
  // passed here and failed on CI: path.posix does not treat a backslash as a
  // separator, so on Linux both sides quietly agreed on a bare relative path.
  it('puts npm-cli.js beside node.exe on Windows', () => {
    expect(bundledNpmCli(WIN_NODE, 'win32')).toBe(
      'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js'
    );
  });

  it('puts npm-cli.js under ../lib on POSIX, which is where it actually lives', () => {
    // The other half of the original bug: a Windows-shaped join resolves to
    // /usr/local/bin/node_modules/... which never exists, so the fallback was
    // dead code on every Linux machine while looking perfectly healthy.
    expect(bundledNpmCli(NIX_NODE, 'linux')).toBe('/usr/local/lib/node_modules/npm/bin/npm-cli.js');
  });

  it('answers for the target platform, not the host it runs on', () => {
    // Both results are fully determined by the arguments, so this file asserts
    // the same thing on Windows, Linux and macOS.
    expect(bundledNpmCli(WIN_NODE, 'win32')).toContain('\\');
    expect(bundledNpmCli(NIX_NODE, 'linux')).not.toContain('\\');
  });
});

describe('the audit invokes npm without a shell or a shim', () => {
  it('runs npm-cli.js with the given node binary when npm run said where npm is', () => {
    const execpath = '/somewhere/npm/bin/npm-cli.js';
    const { command, args } = npmInvocation({
      env: { npm_execpath: execpath },
      platform: 'win32',
      execPath: WIN_NODE,
      exists: only(execpath),
    });
    expect(command).toBe(WIN_NODE);
    expect(args).toEqual([execpath, ...AUDIT_ARGS]);
  });

  it('falls back to the bundled npm-cli.js when npm_execpath is unset', () => {
    const bundled = bundledNpmCli(WIN_NODE, 'win32');
    const { command, args } = npmInvocation({
      env: {},
      platform: 'win32',
      execPath: WIN_NODE,
      exists: only(bundled),
    });
    expect(command).toBe(WIN_NODE);
    expect(args).toEqual([bundled, ...AUDIT_ARGS]);
  });

  it('never returns a .cmd, which node cannot execFile at all', () => {
    const bundled = bundledNpmCli(WIN_NODE, 'win32');
    const { command, args } = npmInvocation({
      env: {},
      platform: 'win32',
      execPath: WIN_NODE,
      exists: only(bundled),
    });
    expect(command).not.toMatch(/\.cmd$/i);
    expect(args.some((a) => /\.cmd$/i.test(a))).toBe(false);
  });

  it('never returns a bare npm on Windows, where PATH finds only the shim', () => {
    const bundled = bundledNpmCli(WIN_NODE, 'win32');
    const { command } = npmInvocation({
      env: {},
      platform: 'win32',
      execPath: WIN_NODE,
      exists: only(bundled),
    });
    expect(command).not.toBe('npm');
  });

  it('ignores an npm_execpath that is not npm-cli.js', () => {
    // npm sets this to the .cmd shim in some older setups, and yarn and pnpm
    // set it to their own entry point. Running any of those under node with
    // npm's arguments fails in a way that reads like a broken audit rather
    // than the wrong package manager.
    const bundled = bundledNpmCli(WIN_NODE, 'win32');
    for (const wrong of ['C:\\npm\\npm.cmd', '/usr/lib/yarn/bin/yarn.js', '/pnpm/pnpm.cjs']) {
      const { args } = npmInvocation({
        env: { npm_execpath: wrong },
        platform: 'win32',
        execPath: WIN_NODE,
        exists: only(wrong, bundled),
      });
      expect(args[0]).toBe(bundled);
    }
  });

  it('ignores an npm_execpath that no longer exists', () => {
    // A shell that outlived an npm upgrade still exports the old path. Left
    // untested, that surfaces as "Cannot find module" wearing an audit failure
    // — the exact confusion this script exists to remove.
    const stale = '/old/npm/bin/npm-cli.js';
    const bundled = bundledNpmCli(NIX_NODE, 'linux');
    const { args } = npmInvocation({
      env: { npm_execpath: stale },
      platform: 'linux',
      execPath: NIX_NODE,
      exists: only(bundled),
    });
    expect(args[0]).toBe(bundled);
  });

  it('falls back to npm on PATH on POSIX when nothing is on disk', () => {
    const { command, args } = npmInvocation({
      env: {},
      platform: 'linux',
      execPath: NIX_NODE,
      exists: none,
    });
    expect(command).toBe('npm');
    expect(args).toEqual(AUDIT_ARGS);
  });

  it('explains itself on Windows when nothing is on disk, rather than throwing ENOENT', () => {
    expect(() =>
      npmInvocation({ env: {}, platform: 'win32', execPath: WIN_NODE, exists: none })
    ).toThrow(/npm run security:audit/);
  });

  it('hands back a fresh args array, never the shared constant', () => {
    const { args } = npmInvocation({
      env: {},
      platform: 'linux',
      execPath: NIX_NODE,
      exists: none,
    });
    expect(args).not.toBe(AUDIT_ARGS);
    args.push('--mutated');
    expect(AUDIT_ARGS).toEqual(['audit', '--omit=dev', '--json']);
  });

  it('always carries the audit arguments, whichever route it takes', () => {
    const cases = [
      { env: { npm_execpath: '/x/npm-cli.js' }, platform: 'win32', execPath: WIN_NODE, exists: only('/x/npm-cli.js') }, // prettier-ignore
      { env: {}, platform: 'win32', execPath: WIN_NODE, exists: only(bundledNpmCli(WIN_NODE, 'win32')) }, // prettier-ignore
      { env: {}, platform: 'linux', execPath: NIX_NODE, exists: none },
    ];
    for (const options of cases) {
      const { args } = npmInvocation(options);
      expect(args.slice(-AUDIT_ARGS.length)).toEqual(AUDIT_ARGS);
    }
  });

  /**
   * The assertion that would have caught the original bug: not what the
   * strings are, but whether the process can actually be spawned here. Uses
   * the real environment, and `--version` so it costs nothing and touches no
   * network.
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
