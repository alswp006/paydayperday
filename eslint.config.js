export default [
  { ignores: ['dist/', 'node_modules/', 'e2e/', 'src/**/*.ts', 'src/**/*.tsx', '*.config.ts'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {},
  },
];
