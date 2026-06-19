import { defineConfig } from "@playwright/test";

const ci = !!process.env.CI;

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 30000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
    baseURL: "http://localhost:1420",
    // Required for Chromium in GitHub Actions Linux runners:
    // — /dev/shm is limited to 64 MB, causes renderer crashes
    // — sandbox requires kernel capabilities unavailable in CI
    launchOptions: ci ? {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    } : undefined,
  },
  webServer: {
    command: "npm run dev",
    cwd: process.cwd(),
    port: 1420,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
