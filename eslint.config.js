import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['static/js/dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
];
