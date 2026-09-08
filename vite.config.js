// vite.config.js — Vite + Vitest configuration.
// We use Vitest in jsdom mode for component tests and keep Vite's defaults for the dev/build pipeline.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simulates a browser so React Testing Library can mount components.
    environment: 'jsdom',
    // Run this file once before any test file loads — registers the @testing-library matchers.
    setupFiles: ['./src/testSetup.js'],
    // CSS imports inside components don't need processing during tests.
    css: false,
    // Show the full diff on assertion errors to keep debugging fast.
    reporters: ['default'],
  },
});