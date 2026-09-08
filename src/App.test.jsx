/**
 * App.test.jsx
 * ----------------------------------------------------------------------------
 * Lightweight smoke tests for the App shell.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App shell', () => {
  it('renders the dashboard by default with the brand and hero', () => {
    render(<App />);
    // "Staylume" appears in both the header brand and the footer — use the
    // brand link which is unique.
    expect(screen.getByTestId('brand-link')).toHaveTextContent('Staylume');
    expect(screen.getByText(/Find your next stay/i)).toBeInTheDocument();
    expect(screen.queryByTestId('hotel-detail')).not.toBeInTheDocument();
  });

  it('navigates to the detail view when a hotel card is clicked', () => {
    render(<App />);
    const cards = screen.getAllByTestId('hotel-card');
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);
    expect(screen.getByTestId('hotel-detail')).toBeInTheDocument();
    expect(screen.queryByText(/Find your next stay/i)).not.toBeInTheDocument();
  });

  it('returns to the dashboard when the back button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getAllByTestId('hotel-card')[0]);
    expect(screen.getByTestId('hotel-detail')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('back-button'));
    expect(screen.queryByTestId('hotel-detail')).not.toBeInTheDocument();
    expect(screen.getByText(/Find your next stay/i)).toBeInTheDocument();
  });

  it('renders the footer with multiple link columns', () => {
    render(<App />);
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('uses the brand link to return to the dashboard from the detail view', () => {
    render(<App />);
    fireEvent.click(screen.getAllByTestId('hotel-card')[0]);
    expect(screen.getByTestId('hotel-detail')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('brand-link'));
    expect(screen.queryByTestId('hotel-detail')).not.toBeInTheDocument();
  });

  it('renders a search field in the top bar', () => {
    render(<App />);
    expect(screen.getByTestId('top-search-input')).toBeInTheDocument();
  });

  it('filters the dashboard cards when the top search term is typed', () => {
    render(<App />);
    const initialCards = screen.getAllByTestId('hotel-card').length;
    expect(initialCards).toBeGreaterThan(0);
    fireEvent.change(screen.getByTestId('top-search-input'), {
      target: { value: 'zzzz-no-such-hotel' },
    });
    // No card survives a guaranteed-empty search.
    expect(screen.queryAllByTestId('hotel-card')).toHaveLength(0);
    // Clearing via the clear button restores the full list.
    fireEvent.click(screen.getByTestId('top-search-clear'));
    expect(screen.getAllByTestId('hotel-card').length).toBe(initialCards);
  });
});