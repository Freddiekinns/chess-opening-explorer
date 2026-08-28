#!/usr/bin/env node
/**
 * PreToolUse guard: an agent fixing code must not be able to weaken the check
 * on that code.
 *
 * AGENTS.md has said "never skip, disable, or quarantine a test" since the PR
 * rules were written, but prose is advisory. This is the deterministic half:
 * it blocks an edit that introduces a disabling marker into a test file, and a
 * shell command that deletes one. Writing new tests, editing assertions and
 * deleting a test you have decided is genuinely obsolete all still work — the
 * last one via the escape hatch below, which makes it a visible act rather
 * than a silent one.
 *
 * Escape hatch: ALLOW_TEST_SKIP=1 in the environment.
 *
 * Contract: reads the tool call as JSON on stdin. Exit 0 allows, exit 2 blocks
 * and sends stderr back to Claude.
 */

const TEST_PATH = /(^|\/)tests\/|\.(test|spec)\.[jt]sx?$/;

// `.only` is a quarantine wearing a different hat: it disables every other
// test in the file, and CI reports the file as green.
const DISABLERS = [
  {
    pattern: /\b(describe|it|test)\s*\.\s*(skip|only)\s*\(/,
    name: 'describe/it/test .skip or .only',
  },
  { pattern: /\bx(describe|it)\s*\(/, name: 'xdescribe / xit' },
  { pattern: /\bjest\s*\.\s*(skip|disableAutomock)\s*\(/, name: 'jest.skip' },
  { pattern: /\btest\s*\.\s*skip\s*\.\s*each\b/, name: 'test.skip.each' },
];

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function addedText(toolName, input) {
  if (toolName === 'Write') return input.content || '';
  if (toolName === 'Edit') return input.new_string || '';
  if (toolName === 'MultiEdit')
    return (input.edits || []).map((e) => e.new_string || '').join('\n');
  return '';
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  if (process.env.ALLOW_TEST_SKIP === '1') process.exit(0);

  let call;
  try {
    call = JSON.parse(raw);
  } catch {
    process.exit(0); // Never block on a payload we cannot read.
  }

  const toolName = call.tool_name || '';
  const input = call.tool_input || {};

  if (toolName === 'Bash') {
    const command = input.command || '';
    // Only the destructive verbs. `git rm`, `rm -rf node_modules` and friends
    // are matched on the path, not the verb, so unrelated deletes pass.
    const deletesATest = /\b(rm|git\s+rm|unlink)\b[^&;|]*/g;
    for (const fragment of command.match(deletesATest) || []) {
      if (TEST_PATH.test(fragment)) {
        block(
          `Blocked: this command deletes a test file.\n\n  ${fragment.trim()}\n\n` +
            'A test that existed before a fix, and that could not be removed during it, is ' +
            'the proof the bug is gone. If the test is genuinely obsolete, say so in the ' +
            'commit message and re-run with ALLOW_TEST_SKIP=1.'
        );
      }
    }
    process.exit(0);
  }

  const filePath = input.file_path || '';
  if (!TEST_PATH.test(filePath)) process.exit(0);

  const added = addedText(toolName, input);
  for (const { pattern, name } of DISABLERS) {
    if (pattern.test(added)) {
      block(
        `Blocked: this edit adds ${name} to ${filePath}.\n\n` +
          'AGENTS.md: never skip, disable, or quarantine a test. If it is failing, fix the ' +
          'code, not the test. If the test itself is wrong, change what it asserts rather ' +
          'than switching it off. Deliberate exception: ALLOW_TEST_SKIP=1.'
      );
    }
  }

  process.exit(0);
});
