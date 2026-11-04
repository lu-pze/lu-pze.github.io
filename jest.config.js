module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Only used by `npm run test:coverage`; tests/helpers/load_app.js instruments src/ then.
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text-summary', 'text'],
  // Floor just under the achieved numbers (99.98 / 99.84 / 100 / 99.98): coverage may only ratchet up.
  // The remaining gaps are listed under "Testing gotchas" in CLAUDE.md.
  coverageThreshold: { global: { statements: 99.9, branches: 99.7, functions: 100, lines: 99.9 } },
};
