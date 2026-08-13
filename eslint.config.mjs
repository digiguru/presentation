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
    files: ['pure/src/**/*.js', 'scripts/**/*.mjs', 'test/*.test.mjs', 'pure/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: sharedRules,
  },
];
