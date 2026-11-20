/** Unit-Tests für src/engine und src/db (reine Logik, ohne Oberfläche). */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@data/(.*)$': '<rootDir>/data/$1',
  },
};
