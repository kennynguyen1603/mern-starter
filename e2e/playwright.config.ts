import { defineConfig, devices } from '@playwright/test';
import { ADMIN_URL, API_URL, PORTS, WEB_URL } from './env';

// Never reuse servers: a dev server already on the port could point at a real DB.
const server = {
  reuseExistingServer: false,
  gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  stdout: 'ignore',
  stderr: 'pipe',
} as const;

const vite = (app: 'web' | 'admin', port: number) => ({
  ...server,
  command: `pnpm --filter @mern/${app} exec vite --strictPort`,
  url: `http://localhost:${port}`,
  env: { VITE_PORT: String(port), VITE_API_URL: API_URL },
  timeout: 60_000,
});

export default defineConfig({
  testDir: './tests',
  // One shared DB/Redis that is wiped before each test → tests must run serially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      ...server,
      command: 'tsx scripts/start-stack.ts',
      url: `${API_URL}/`,
      timeout: 120_000,
    },
    vite('web', PORTS.web),
    vite('admin', PORTS.admin),
  ],
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: API_URL } },
    { name: 'web', testDir: './tests/web', use: { baseURL: WEB_URL } },
    { name: 'admin', testDir: './tests/admin', use: { baseURL: ADMIN_URL } },
  ],
});
