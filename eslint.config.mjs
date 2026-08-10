import babelParser from '@babel/eslint-parser';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'plugin/**/*.js',
      'output/**',
    ],
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          parserOpts: {
            allowImportExportEverywhere: true,
          },
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        module: 'readonly',
        define: 'readonly',
        exports: 'readonly',
        unescape: 'readonly',
      },
    },
    rules: {
      curly: 'off',
      eqeqeq: 'error',
      'wrap-iife': ['error', 'any'],
      'no-use-before-define': ['error', { functions: false }],
      'new-cap': 'error',
      'no-caller': 'error',
      'dot-notation': 'off',
      'no-eq-null': 'error',
      'no-unused-expressions': 'off',
    },
  },
  {
    files: ['gulpfile.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      curly: 'off',
      eqeqeq: 'error',
      'wrap-iife': ['error', 'any'],
      'no-use-before-define': ['error', { functions: false }],
      'new-cap': 'error',
      'no-caller': 'error',
      'dot-notation': 'off',
      'no-eq-null': 'error',
      'no-unused-expressions': 'off',
    },
  },
];
