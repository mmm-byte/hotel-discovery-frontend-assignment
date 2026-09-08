/**
 * App.test.jsx
 * ----------------------------------------------------------------------------
 * Lightweight smoke tests for the App shell.
 *
 * What this covers:
 *   - Renders the FilterDashboard by default (no selection).
 *   - Shows the brand name in the header.
 *   - Clicking a hotel navigates to the detail view (high-level integration).
 *   - The back button returns to the dashboard.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App shell', () => {
  it('renders the dashboard by default with the brand', () => {
    render(<App />);
    expect(screen.getByText('Staylume')).toBeInTheDocument();
    // The dashboard's filter bar should be present
    expect(screen.getByText('Find your stay')).toBeInTheDocument();
    // The detail view should NOT be present yet
    expect(screen.queryByTestId('hotel-detail')).not.toBeInTheDocument();
  });

  it('navigates to the detail view when a hotel card is clicked', () => {
    render(<App />);
    // Click the first hotel card in the grid
    const cards = screen.getAllByTestId('hotel-card');
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);
    // The detail view should now be present
    expect(screen.getByTestId('hotel-detail')).toBeInTheDocument();
    // The dashboard's filter bar should be gone
    expect(screen.queryByText('Find your stay')).not.toBeInTheDocument();
  });

  it('returns to the dashboard when the back button is clicked', () => {
    render(<App />);
    const cards = screen.getAllByTestId('hotel-card');
    fireEvent.click(cards[0]);
    expect(screen.getByTestId('hotel-detail')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('back-button'));
    expect(screen.queryByTestId('hotel-detail')).not.toBeInTheDocument();
    expect(screen.getByText('Find your stay')).toBeInTheDocument();
  });

  it('shows the brand badge with hotel + city counts', () => {
    render(<App />);
    expect(screen.getByText(/40 properties · 10 cities/)).toBeInTheDocument();
  });
});