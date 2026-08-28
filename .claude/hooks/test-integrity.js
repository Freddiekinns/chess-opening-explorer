#!/usr/bin/env node
/**
 * PreToolUse guard: an agent fixing code must not be able to weaken the check
 * on that code.
 *
 * AGENTS.md has said "never skip, disable, or quarantine a test" since the PR
 * rules were written, but prose is advisory. This is the deterministic half.
 *
 * It is a fence, not a wall. A shell is too expressive to police completely —
 * a determined route around this exists and always will. What the fence buys
 * is that switching a test off stops being something that can happen without
 * anyone deciding to. The wall is the PR diff.
 *
 * Escape hatch, for the case where the exception is deliberate:
 *   - any tool: export ALLOW_TEST_SKIP=1 in the environment Claude Code runs
 *     in, before starting it — hooks inherit that process's environment, so
 *     there is no per-call route for Edit or Write
 *   - Bash only: prefix the command, e.g. ALLOW_TEST_SKIP=1 rm tests/x.test.js
 * Either way it belongs in the commit message.
 *
 * Contract: reads the tool call as JSON on stdin. Exit 0 allows, exit 2 blocks
 * and sends stderr back to Claude.
 */

// A path the tools address directly.
const TEST_FILE = /(^|\/)tests\/|(^|\/)__tests__\/|\.(test|spec)\.[jt]sx?$/;

// A path as it appears inside a shell command, where the target may be a bare
// directory. The trailing class is deliberately not \b: it would make
// `coverage/tests-output` a match.
const TEST_TARGET = /(^|\/|\s)(tests|__tests__)(\/|\s|$)|\.(test|spec)\.[jt]sx?(\s|$)/;

/**
 * Anchored to the start of a line so that a disabler quoted inside a string —
 * a fixture in this hook's own test file, say — is not mistaken for one being
 * introduced. `.only` counts as a disabler: it switches off every other test
 * in the file and CI still reports green.
 */
const DISABLERS = [
  {
    pattern: /^\s*(describe|it|test)\s*\.\s*(skip|only)\s*\(/m,
    name: 'describe/it/test .skip or .only',
  },
  { pattern: /^\s*(describe|it|test)\s*\.\s*skip\s*\.\s*each\b/m, name: 'a .skip.each block' },
  { pattern: /^\s*x(describe|it)\s*\(/m, name: 'xdescribe / xit' },
];

// The same tokens, unanchored, for scanning a shell command that writes a file.
const DISABLER_TOKEN = /\b(describe|it|test)\s*\.\s*(skip|only)\s*\(|\bx(describe|it)\s*\(/;

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

const ESCAPE = 'ALLOW_TEST_SKIP=1';
const HATCH =
  `Deliberate exception: prefix the command with ${ESCAPE}, or export it before ` +
  'starting Claude Code. Say so in the commit message.';

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
    if (new RegExp(`(^|\\s)${ESCAPE}(\\s|$)`).test(command)) process.exit(0);

    // Newlines end a fragment: `rm -rf dist` on one line has nothing to do
    // with `npx jest tests/…` on the next.
    for (const fragment of command.match(/\b(rm|git\s+rm|unlink|mv)\b[^&;|\n]*/g) || []) {
      if (TEST_TARGET.test(fragment)) {
        block(
          `Blocked: this command removes a test path.\n\n  ${fragment.trim()}\n\n` +
            'A test that existed before a fix, and that could not be removed during it, is ' +
            `the proof the bug is gone. If it is genuinely obsolete, say so. ${HATCH}`
        );
      }
    }

    // Catches the writing routes a fragment scan misses — sed -i, a heredoc,
    // a redirect — by asking whether one command both names a test path and
    // carries a disabler. Running a test names the path but carries no token.
    if (TEST_TARGET.test(command) && DISABLER_TOKEN.test(command)) {
      block(
        'Blocked: this command writes a disabled test into a test path.\n\n' +
          `AGENTS.md: never skip, disable, or quarantine a test. ${HATCH}`
      );
    }

    process.exit(0);
  }

  const filePath = input.file_path || '';
  if (!TEST_FILE.test(filePath)) process.exit(0);

  const added = addedText(toolName, input);
  for (const { pattern, name } of DISABLERS) {
    if (pattern.test(added)) {
      block(
        `Blocked: this edit adds ${name} to ${filePath}.\n\n` +
          'AGENTS.md: never skip, disable, or quarantine a test. If it is failing, fix the ' +
          'code, not the test. If the test itself is wrong, change what it asserts rather ' +
          `than switching it off.\n\n${HATCH}`
      );
    }
  }

  process.exit(0);
});
