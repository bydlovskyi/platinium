import { defineConfig, devices } from '@playwright/test'

// Locally the suite builds the mock-enabled bundle and serves it with `vite preview`. In CI it runs against
// the Docker image (`E2E_BASE_URL`), so the path every reviewer takes first is the one that is tested.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'retain-on-failure'
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
      command: 'npm run preview:mocks',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
})
