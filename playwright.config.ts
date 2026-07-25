import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm run dev -- --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
      timeout: 120_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "visual",
      testDir: "./tests/visual",
      timeout: 60_000,
      snapshotPathTemplate:
        "tests/visual/{testFileName}-snapshots/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1080, height: 1080 },
        deviceScaleFactor: 1,
      },
      expect: {
        timeout: 15_000,
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.001,
        },
      },
    },
  ],
});
