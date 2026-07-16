import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/daklak-3d-dashboard/',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
