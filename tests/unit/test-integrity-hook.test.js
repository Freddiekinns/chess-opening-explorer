/**
 * The hook is the enforcement half of "never skip, disable, or quarantine a
 * test". If it silently stops firing, nothing else notices — so its behaviour
 * is pinned here the same way any other guard is.
 */
const { execFileSync } = require('child_process');
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

  test('deleting a test file from the shell is blocked', () => {
    const { code, stderr } = callHook(bash('rm tests/unit/repo-invariants.test.js'));
    expect(code).toBe(2);
    expect(stderr).toMatch(/deletes a test file/);
  });
});

describe('the hook stays out of the way otherwise', () => {
  test.each([
    ['a normal assertion', edit('tests/unit/a.test.js', 'expect(x).toBe(1);')],
    ['a new test file', edit('tests/unit/new.test.js', 'test("x", () => expect(1).toBe(1));')],
    ['the same text in a non-test file', edit('packages/api/src/x.js', 'describe.skip(')],
    ['an unrelated delete', bash('rm -rf node_modules')],
    ['a non-file tool', { tool_name: 'Read', tool_input: { file_path: 'tests/unit/a.test.js' } }],
  ])('%s is allowed', (_label, payload) => {
    expect(callHook(payload).code).toBe(0);
  });

  test('a malformed payload never blocks', () => {
    expect(callHook('not json at all').code).toBe(0);
  });

  test('ALLOW_TEST_SKIP=1 is the deliberate exception', () => {
    const payload = edit('tests/unit/a.test.js', 'describe.skip("x")');
    expect(callHook(payload).code).toBe(2);
    expect(callHook(payload, { ALLOW_TEST_SKIP: '1' }).code).toBe(0);
  });
});
