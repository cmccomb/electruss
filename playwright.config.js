// @ts-check
const path = require('path');
const { defineConfig } = require('@playwright/test');

const fileUrl = `file://${path.join(__dirname, 'index.html')}`;

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests/ui'),
  timeout: 60000,
  use: {
    headless: true,
    baseURL: fileUrl,
    actionTimeout: 15000,
  },
  reporter: 'line',
});
