module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Only used by `npm run test:coverage`; tests/helpers/load_app.js instruments src/ then.
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text-summary', 'text'],
  // Floor just under the achieved numbers (99.89 / 99.49 / 100 / 99.88): coverage may only ratchet up.
  // The remaining gaps are dead code (see "Testing gotchas" in CLAUDE.md).
  coverageThreshold: { global: { statements: 99.5, branches: 99, functions: 100, lines: 99.5 } },
};
