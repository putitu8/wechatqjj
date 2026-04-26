module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'miniprogram/utils/**/*.js',
    'miniprogram/ai/**/*.js',
    'cloudfunctions/**/index.js',
    'cloudfunctions/**/*.js',
    '!**/node_modules/**'
  ]
};
