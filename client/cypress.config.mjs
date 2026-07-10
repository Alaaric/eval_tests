import { defineConfig } from "cypress";

export default defineConfig({
  // On n'utilise pas Cypress.env() -> on désactive l'option (et son avertissement).
  allowCypressEnv: false,
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx}",
    supportFile: "cypress/support/e2e.js",
    video: false,
  },
});
