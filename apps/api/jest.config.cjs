/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleNameMapper: {
    '^@/config/redis/redis\\.js$': '<rootDir>/tests/mocks/redis.ts',
    '^@/services/email\\.service\\.js$':
      '<rootDir>/tests/mocks/email.service.ts',
    '^(@/utils|\\.)/logger\\.js$': '<rootDir>/tests/mocks/logger.ts',
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@mern/shared$': '<rootDir>/../../packages/shared/index.ts',
  },
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts',
  testTimeout: 30000,
};
