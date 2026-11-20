"use strict";

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.js",
  fullyParallel: false,
  reporter: "list",
  timeout: 30000,
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : {}
  }
});
