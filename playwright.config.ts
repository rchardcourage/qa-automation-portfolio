import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './src/tests',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Tests share one in-memory demo server and reset its state before each test,
  // so they run serially. Cross-browser coverage comes from the three projects.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node demo-app/server.js',
        url: `http://localhost:${PORT}/health`,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
