import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig({
  // The lint scripts pass `src` and `tests`; this keeps them to TypeScript files only.
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    // Registers the parser and plugin, then applies the recommended rule set.
    tsPlugin.configs['flat/recommended'],
    // Turns off rules that conflict with Prettier and reports Prettier diffs as errors.
    prettierRecommended,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      ...globals.browser,
      ...globals.node,
      vi: 'readonly',
      describe: 'readonly',
      it: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
    },
  },
  plugins: {
    'react-hooks': reactHooks,
  },
  rules: {
    // Only the two classic hook rules. The plugin's `recommended` preset also enables the React
    // Compiler rules, which the old config did not run.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
});
