const js = require('@eslint/js');
const globals = require('globals');
const tsPlugin = require('typescript-eslint');

module.exports = [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: [
      '*.js',
      '*.config.js',
      '*.config.mts',
      '*.config.ts',
      'commitlint.config.js',
      'eslint.config.js'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        _beng$wid: 'readonly'
      }
    },
    rules: {
      'no-prototype-builtins': 'off',
      'no-unused-vars': 'off',
      'no-var': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    ignores: ['node_modules/', 'dist/', 'public/']
  }
];
