import { defineConfig } from '@playwright/test';

/**
 * Test dei percorsi completi su telefono (360×740) e PC (1280×800).
 * Serve la build statica (`npm run build`) servita in locale su /app.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'it-IT',
  },
  projects: [
    { name: 'telefono', use: { browserName: 'chromium', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
    { name: 'pc', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx --yes serve@14.2.4 out -l 4173',
    url: 'http://localhost:4173/app/',
    reuseExistingServer: true,
  },
});
