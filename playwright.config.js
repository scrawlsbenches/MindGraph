const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'node tests/serve.js',
    port: 3000,
    reuseExistingServer: true,
  },
});
