const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  use: { baseURL: 'http://127.0.0.1:8123', viewport: { width: 1600, height: 1000 } },
  // Plain static server: the app has no build step.
  webServer: {
    command: 'python3 -m http.server 8123 --bind 127.0.0.1 > /dev/null 2>&1',
    url: 'http://127.0.0.1:8123/index.html',
    reuseExistingServer: true,
  },
});
