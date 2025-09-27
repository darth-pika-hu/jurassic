import js from '@eslint/js';

export default [
  {
    ignores: [
      'node_modules',
      'static/img/**',
      'static/snd/**',
      'static/vid/**',
      'static/css/normalize.css',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Element: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
    },
  },
];
