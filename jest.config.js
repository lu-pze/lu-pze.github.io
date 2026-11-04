module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Only used by `npm run test:coverage`; tests/helpers/load_app.js instruments src/ then.
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text-summary', 'text'],
};
