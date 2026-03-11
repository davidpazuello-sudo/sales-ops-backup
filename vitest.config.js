const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    exclude: [
      "e2e/**",
      "node_modules/**",
      ".next/**",
    ],
  },
});
