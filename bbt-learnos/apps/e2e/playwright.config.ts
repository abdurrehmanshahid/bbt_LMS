import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];
const useOptions = {
  baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',
  ...(executablePath ? { launchOptions: { executablePath } } : {}),
  trace: 'on-first-retry' as const,
};

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: Number(process.env['E2E_WORKERS'] ?? '1'),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: useOptions,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
