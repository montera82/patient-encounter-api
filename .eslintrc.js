module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*', 'node_modules/**/*'],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off', // Too strict for NestJS patterns
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too strict for NestJS patterns
    '@typescript-eslint/no-explicit-any': 'warn', // Keep as warning, but don't break builds
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // General code quality rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'eqeqeq': 'error',
    'curly': 'error',
    
    // Code style (handled by Prettier but good to have as backup)
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    
    // NestJS-specific rules
    '@typescript-eslint/parameter-properties': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
  },
};
