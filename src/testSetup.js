/**
 * testSetup.js
 * ----------------------------------------------------------------------------
 * Vitest setup file. Runs once before the test suite is loaded.
 *
 * - Registers Testing Library matchers for Jest (toBeInTheDocument, etc.).
 * - Registers an afterEach cleanup hook so React Testing Library unmounts
 *   components between tests. RTL v13+ requires this to be opt-in; without it,
 *   rendered trees accumulate in the shared jsdom document and selectors find
 *   multiple matches.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Unmount every component after each test so the jsdom document is clean for
// the next test. Vitest runs test files in isolation by default, but each file
// can have many tests and RTL no longer auto-cleans on its own in v13+.
afterEach(() => {
  cleanup();
});

// Quiet down noisy React warnings during tests — keep one warning-level
// filter active in case a real issue surfaces.
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0]?.toString?.() || '';
  // Suppress the noisy "not wrapped in act(...)" warnings that show up
  // because some state updates happen outside React testing utilities.
  if (msg.includes('not wrapped in act')) return;
  originalWarn(...args);
};