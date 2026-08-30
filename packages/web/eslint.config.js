import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // `--ext ts,tsx` used to keep generated JS out of the run; without it,
  // `eslint .` reaches coverage/ and reports its inline disable directives.
  { ignores: ['dist/**', 'coverage/**'] },
  {
    // Flat config has no --ext, so the file set that the lint script used to
    // pass on the command line lives here instead.
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        // lint-staged runs a single `eslint` from the repo root, where the
        // parser sees both packages/web and packages/shared as candidate roots
        // and refuses to guess. Pinning it keeps the result the same whichever
        // directory ESLint is invoked from.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      // react-hooks 7 enables the React Compiler rules through its
      // `recommended` preset. The two rules below are the ones this package
      // has always enforced; adopting the preset is tracked in #86 and is a
      // code change, not a config one.
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
