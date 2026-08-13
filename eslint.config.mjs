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
      'node_modules/**',
      'output/**',
      'pure/dist/**',
      'pure/node_modules/**',
      'pure/.pure-public/**',
    ],
  },
  {
    files: ['pure/src/**/*.js'],
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
    files: ['scripts/**/*.mjs', 'test/*.test.mjs', 'pure/**/*.mjs'],
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
