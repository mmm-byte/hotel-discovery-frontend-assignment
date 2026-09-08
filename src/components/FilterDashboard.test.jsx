/**
 * FilterDashboard.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the FilterDashboard component (interaction + rendering).
 *
 * Coverage:
 *   - Renders the filter bar with all four controls.
 *   - Renders the correct number of HotelCard tiles for the filtered set.
 *   - Calls onChangeFilter when the city dropdown changes.
 *   - Calls onChangeFilter when the search input changes.
 *   - Toggles the star-rating chip and clears it on second click.
 *   - Calls onReset when the Reset filters button is clicked.
 *   - Shows the empty state with a Reset CTA when no hotels match.
 *   - Calls onSelect when a card is clicked.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FilterDashboard from './FilterDashboard';

const META = {
  CITIES: ['Austin', 'London', 'Paris'],
  STAR_RATINGS: [2, 3, 4, 5],
  MIN_PRICE: 50,
  MAX_PRICE: 500,
};

const HOTELS = [
  {
    id: 'h1', name: 'Alpha Inn', description: 'a lovely place',
    star_rating: 3, overall_rating: 4.2, review_count: 100,
    address: { city: 'Austin', state: 'TX', zip_code: '78701', country: 'USA' },
    contact: { phone: '+1', email: 'a@x.com' },
    amenities: ['pool'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
    rooms: [{ room_id: 'a1', type: 'Standard', bed_type: 'Queen', bed_count: 1,
      max_occupancy: 2, square_footage: 300, price_per_night: 120, room_amenities: [], available_dates: ['2026-07-10'] }],
  },
  {
    id: 'h2', name: 'Bravo Tower', description: 'skyline views',
    star_rating: 5, overall_rating: 4.7, review_count: 800,
    address: { city: 'Paris', state: 'IDF', zip_code: '75001', country: 'France' },
    contact: { phone: '+33', email: 'b@x.com' },
    amenities: ['spa'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Non-refundable booking' },
    rooms: [{ room_id: 'b1', type: 'Suite', bed_type: 'King', bed_count: 1,
      max_occupancy: 2, square_footage: 600, price_per_night: 480, room_amenities: [], available_dates: ['2026-07-10'] }],
  },
];

const DEFAULT_FILTERS = {
  city: '',
  stars: null,
  minPrice: 50,
  maxPrice: 500,
  search: '',
};

describe('FilterDashboard', () => {
  it('renders the filter controls', () => {
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('filter-city')).toBeInTheDocument();
    expect(screen.getByTestId('filter-search')).toBeInTheDocument();
    expect(screen.getByTestId('filter-min-price')).toBeInTheDocument();
    expect(screen.getByTestId('filter-max-price')).toBeInTheDocument();
    // Star chips for every rating
    META.STAR_RATINGS.forEach((s) => {
      expect(screen.getByTestId(`star-chip-${s}`)).toBeInTheDocument();
    });
  });

  it('renders one HotelCard per filtered hotel', () => {
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(2);
    expect(screen.getByTestId('result-count').textContent).toBe('2');
  });

  it('calls onChangeFilter when the city dropdown changes', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={onChange}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-city'), { target: { value: 'Paris' } });
    expect(onChange).toHaveBeenCalledWith({ city: 'Paris' });
  });

  it('calls onChangeFilter when the search input changes', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={onChange}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-search'), { target: { value: 'cozy' } });
    expect(onChange).toHaveBeenCalledWith({ search: 'cozy' });
  });

  it('toggles the star filter chip and clears it on a second click', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={{ ...DEFAULT_FILTERS }}
        meta={META}
        onChangeFilter={onChange}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    // Click 5★ → filter to 5
    fireEvent.click(screen.getByTestId('star-chip-5'));
    expect(onChange).toHaveBeenLastCalledWith({ stars: 5 });
    // Re-render with stars=5 so the chip is now active
    rerender(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={{ ...DEFAULT_FILTERS, stars: 5 }}
        meta={META}
        onChangeFilter={onChange}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    // Click again → clears the filter
    fireEvent.click(screen.getByTestId('star-chip-5'));
    expect(onChange).toHaveBeenLastCalledWith({ stars: null });
  });

  it('calls onReset when the Reset filters button is clicked', () => {
    const onReset = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={{ ...DEFAULT_FILTERS, city: 'Paris' }} // non-default → button visible
        meta={META}
        onChangeFilter={() => {}}
        onReset={onReset}
        onSelect={() => {}}
      />
    );
    const resetBtn = screen.getByTestId('reset-filters');
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('does NOT show the Reset button when filters are at their defaults', () => {
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.queryByTestId('reset-filters')).not.toBeInTheDocument();
  });

  it('shows the empty state when no hotels match the filters', () => {
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={[]}
        filters={{ ...DEFAULT_FILTERS, city: 'Paris' }}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No hotels match your filters/)).toBeInTheDocument();
    expect(screen.queryByTestId('hotel-card')).not.toBeInTheDocument();
  });

  it('forwards onSelect from a hotel card click', () => {
    const onSelect = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={onSelect}
      />
    );
    const firstCard = screen.getAllByTestId('hotel-card')[0];
    fireEvent.click(firstCard);
    expect(onSelect).toHaveBeenCalledWith(HOTELS[0]);
  });

  it('respects the price-range inputs', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={onChange}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-min-price'), { target: { value: '100' } });
    expect(onChange).toHaveBeenLastCalledWith({ minPrice: 100 });
    fireEvent.change(screen.getByTestId('filter-max-price'), { target: { value: '400' } });
    expect(onChange).toHaveBeenLastCalledWith({ maxPrice: 400 });
  });

  it('renders city options from the meta', () => {
    render(
      <FilterDashboard
        hotels={HOTELS}
        filtered={HOTELS}
        filters={DEFAULT_FILTERS}
        meta={META}
        onChangeFilter={() => {}}
        onReset={() => {}}
        onSelect={() => {}}
      />
    );
    const select = screen.getByTestId('filter-city');
    META.CITIES.forEach((c) => {
      expect(within(select).getByRole('option', { name: c })).toBeInTheDocument();
    });
    expect(within(select).getByRole('option', { name: 'All cities' })).toBeInTheDocument();
  });
});