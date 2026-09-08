/**
 * main.jsx
 * ----------------------------------------------------------------------------
 * React application mount point.
 *
 * Imports the global stylesheet, then renders the <App /> tree into the
 * #root element declared in index.html.
 *
 * In strict mode in development to surface side-effect bugs early.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './assets/styles.css';

const container = document.getElementById('root');
if (!container) {
  // Surface the failure loudly during development rather than throwing
  // a cryptic React error later.
  throw new Error('Could not find #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);