import babelParser from '@babel/eslint-parser';
import globals from 'globals';

const sharedRules = {
  curly: 'off',
  eqeqeq: 'error',
  'wrap-iife': ['error', 'any'],
  'no-use-before-define': ['error', { functions: false }],
  'new-cap': 'error',
  'no-caller': 'error',
  'dot-notation': 'off',
  'no-eq-null': 'error',
  'no-unused-expressions': 'off',
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'plugin/**/*.js',
      'output/**',
      'stage1/dist/**',
      'stage1/node_modules/**',
      'stage1/.stage1-public/**',
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
    rules: sharedRules,
  },
  {
    files: ['stage1/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: sharedRules,
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
    rules: sharedRules,
  },
  {
    files: ['scripts/**/*.mjs', 'stage1/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: sharedRules,
  },
];
