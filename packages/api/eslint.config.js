const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Formatting is owned by Prettier (.prettierrc); ESLint only enforces
      // code-quality rules here to avoid conflicting with the formatter.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'error',
      // Both are new to `eslint:recommended` in ESLint 10 and both find real
      // things, but fixing them is a code change rather than a config one, so
      // they land as warnings first — the way no-console already does here.
      // preserve-caught-error fires 19 times, mostly in youtube-service.js.
      // no-useless-assignment fires twice, both in search-service.js, which
      // AGENTS.md gates behind the search-ranking skill.
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
];
