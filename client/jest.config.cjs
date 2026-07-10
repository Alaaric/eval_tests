module.exports = {
  // Pas de DOM nécessaire : on ne teste que la couche service (axios).
  testEnvironment: "node",
  collectCoverageFrom: [
    "src/services/**/*.{js,jsx}",
  ],
};
