// eslint.config.js — Flat-config for ESLint v9.
// Lints both .js and .jsx files using the React + React-Hooks plugins.

import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Base JS rules + browser globals.
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // React plugin
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with the new JSX transform
      'react/prop-types': 'off',         // we document props in JSDoc instead
      // React Hooks plugin — catch rule violations early.
      ...reactHooks.configs.recommended.rules,
      // Light style hygiene
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Don't lint generated / build outputs.
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];