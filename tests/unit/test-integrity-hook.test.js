/**
 * The hook is the enforcement half of "never skip, disable, or quarantine a
 * test". If it silently stops firing, nothing else notices — so its behaviour
 * is pinned here the same way any other guard is.
 *
 * The disabler fixtures below are the reason the hook anchors its patterns to
 * the start of a line: this file is itself a test file full of the strings it
 * blocks, and an unanchored match would lock the repo out of editing it.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOOK = path.join(__dirname, '..', '..', '.claude', 'hooks', 'test-integrity.js');

function callHook(payload, env = {}) {
  try {
    execFileSync('node', [HOOK], {
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    return { code: error.status, stderr: String(error.stderr) };
  }
}

const edit = (file_path, new_string) => ({
  tool_name: 'Edit',
  tool_input: { file_path, new_string },
});
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

describe('the hook blocks a test being switched off', () => {
  test.each([
    ['describe.skip', 'describe.skip("x", () => {})'],
    ['it.only', 'it.only("x", () => {})'],
    ['test.skip', 'test.skip("x", () => {})'],
    ['xit', 'xit("x", () => {})'],
    ['an indented skip', '  describe.skip("x", () => {})'],
    ['a skip after other lines', 'const a = 1;\ntest.skip("x", () => {})'],
  ])('%s in a test file is blocked', (_label, source) => {
    const { code, stderr } = callHook(edit('tests/unit/a.test.js', source));
    expect(code).toBe(2);
    expect(stderr).toMatch(/never skip, disable, or quarantine a test/);
  });

  test('a .tsx test under packages/web is covered too', () => {
    expect(callHook(edit('packages/web/src/lib/__tests__/a.test.tsx', 'xdescribe("x")')).code).toBe(
      2
    );
  });

  test.each([
    ['a single test file', 'rm tests/unit/a.test.js'],
    ['the whole tests directory', 'rm -rf tests'],
    ['a __tests__ directory', 'rm -r packages/web/src/lib/__tests__'],
    ['a test moved out of the tree', 'mv tests/unit/a.test.js /tmp/'],
  ])('removing %s from the shell is blocked', (_label, command) => {
    expect(callHook(bash(command)).code).toBe(2);
  });

  test('a shell command that writes a disabled test is blocked', () => {
    expect(callHook(bash("sed -i 's/it(/it.skip(/' tests/unit/a.test.js")).code).toBe(2);
  });
});

describe('the hook stays out of the way otherwise', () => {
  test.each([
    ['a normal assertion', edit('tests/unit/a.test.js', 'expect(x).toBe(1);')],
    ['a new test file', edit('tests/unit/new.test.js', 'test("x", () => expect(1).toBe(1));')],
    [
      'jest.disableAutomock, an unrelated API',
      edit('tests/unit/a.test.js', 'jest.disableAutomock();'),
    ],
    ['the same text in a non-test file', edit('packages/api/src/x.js', 'describe.skip(')],
    ['an unrelated delete', bash('rm -rf node_modules')],
    ['a directory that merely starts with "tests"', bash('rm -rf coverage/tests-output')],
    [
      'a delete on one line and a test run on the next',
      bash('rm -rf dist\nnpx jest tests/unit/x.test.js'),
    ],
    ['running the suite', bash('npx jest tests/unit/a.test.js')],
    ['a non-file tool', { tool_name: 'Read', tool_input: { file_path: 'tests/unit/a.test.js' } }],
  ])('%s is allowed', (_label, payload) => {
    expect(callHook(payload).code).toBe(0);
  });

  test('a malformed payload never blocks', () => {
    expect(callHook('not json at all').code).toBe(0);
  });

  /**
   * Regression: the hook must not block edits to its own test file. The
   * fixtures above are disabler strings, and an unanchored pattern matched
   * them — with no working escape hatch, that was unrecoverable.
   */
  test('the hook does not lock this file', () => {
    const body = fs.readFileSync(__filename, 'utf8');
    expect(callHook(edit('tests/unit/test-integrity-hook.test.js', body)).code).toBe(0);
  });
});

describe('the escape hatch', () => {
  const skipEdit = edit('tests/unit/a.test.js', 'describe.skip("x")');

  test('an inline prefix clears a Bash command', () => {
    expect(callHook(bash('rm tests/unit/a.test.js')).code).toBe(2);
    expect(callHook(bash('ALLOW_TEST_SKIP=1 rm tests/unit/a.test.js')).code).toBe(0);
  });

  /**
   * Hooks inherit the environment of the process Claude Code runs in, so this
   * is the only route open to Edit and Write — there is no per-call env.
   */
  test('the environment variable clears any tool', () => {
    expect(callHook(skipEdit).code).toBe(2);
    expect(callHook(skipEdit, { ALLOW_TEST_SKIP: '1' }).code).toBe(0);
  });
});
