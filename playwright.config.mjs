import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launchOptions = chromiumExecutablePath
  ? { executablePath: chromiumExecutablePath }
  : undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    ...(launchOptions ? { launchOptions } : {}),
  },
  webServer: {
    command: 'node scripts/static-server.mjs 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
