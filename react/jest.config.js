// managed-by: golden-path v1
// Extends the @vtex/test-tools preset with a coverage threshold.
// Scope is limited to executable react/ source; declarative builders
// (store, messages, styles) are excluded from coverage requirements.
module.exports = {
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/typings/**',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      statements: 80,
    },
  },
}
