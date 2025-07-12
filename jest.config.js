module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'backend/src/**/*.js',
    'backend/routes/**/*.js',
    '!backend/src/core/logs/**',
    '!backend/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  moduleDirectories: ['node_modules', 'backend/node_modules'],
  modulePaths: ['<rootDir>', '<rootDir>/backend']
};