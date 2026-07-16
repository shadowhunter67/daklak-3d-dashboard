import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
process.env.E2E_PRODUCTION = 'true';

export default defineConfig({
  ...baseConfig,
  webServer: {
    command: `${npmCommand} run preview -- --host 127.0.0.1 --port 4173`,
    url: 'http://127.0.0.1:4173/daklak-3d-dashboard/',
    reuseExistingServer: false,
  },
});
