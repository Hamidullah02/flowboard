import { defineConfig, devices } from '@playwright/test';

/*
 * A separate Playwright config for the demo recorder.
 *
 * The recorder lives outside `tests/e2e/` so the normal e2e suite stays
 * green and CI never runs it. This config points Playwright at that folder,
 * on the desktop profile only, so the recorded frames are the desktop layout
 * at CSS resolution.
 */

const PORT = 4174;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/recording',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
