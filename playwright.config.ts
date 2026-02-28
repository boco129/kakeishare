import "dotenv/config"
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // CI: env vars are set at job level, so `next start` can access them
    // Local: `next dev` loads .env automatically
    command: process.env.CI ? "pnpm start -p 3000" : "pnpm dev -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "mobile",
      testIgnore: /\.api\.spec\.ts/,
      use: {
        viewport: { width: 1024, height: 900 },
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "desktop",
      testIgnore: /\.api\.spec\.ts/,
      use: {
        viewport: { width: 1025, height: 900 },
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "unauth",
      testIgnore: /\.api\.spec\.ts/,
      use: {
        viewport: { width: 1024, height: 900 },
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "api",
      testMatch: /\.api\.spec\.ts/,
      use: {
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
})
