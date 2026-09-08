/**
 * FilterDashboard.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the FilterDashboard component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FilterDashboard from './FilterDashboard';

const META = {
  CITIES: ['Austin', 'London', 'Paris'],
  STAR_RATINGS: [2, 3, 4, 5],
  AMENITIES: ['pool', 'spa', 'free Wi-Fi'],
  BED_TYPES: ['King', 'Queen', 'Twin'],
  MIN_PRICE: 50,
  MAX_PRICE: 500,
  SORT_OPTIONS: [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price-asc',   label: 'Price · Low to high' },
  ],
};

const HOTELS = [
  { id: 'h1', name: 'Alpha Inn', description: 'a lovely place',
    star_rating: 3, overall_rating: 4.2, review_count: 100,
    address: { city: 'Austin', state: 'TX', zip_code: '78701', country: 'USA' },
    contact: { phone: '+1', email: 'a@x.com' },
    amenities: ['pool'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
    rooms: [{ room_id: 'a1', type: 'Standard', bed_type: 'Queen', bed_count: 1, max_occupancy: 2, square_footage: 300, price_per_night: 120, room_amenities: [], available_dates: ['2026-07-10'] }] },
  { id: 'h2', name: 'Bravo Tower', description: 'skyline views',
    star_rating: 5, overall_rating: 4.7, review_count: 800,
    address: { city: 'Paris', state: 'IDF', zip_code: '75001', country: 'France' },
    contact: { phone: '+33', email: 'b@x.com' },
    amenities: ['spa'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Non-refundable booking' },
    rooms: [{ room_id: 'b1', type: 'Suite', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 600, price_per_night: 480, room_amenities: [], available_dates: ['2026-07-10'] }] },
];

const DEFAULT_FILTERS = {
  city: '', stars: null, minPrice: 50, maxPrice: 500, search: '',
  minRating: null, freeCancel: false, amenities: [], roomBedType: null, sort: 'recommended',
};

describe('FilterDashboard', () => {
  it('renders the hero, filter bar, and result count', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    expect(screen.getByText(/Find your next stay/i)).toBeInTheDocument();
    expect(screen.getByTestId('result-count').textContent).toBe('2');
  });

  it('renders one HotelCard per filtered hotel', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(2);
  });

  it('calls onChangeFilter when the city dropdown changes', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-city'), { target: { value: 'Paris' } });
    expect(onChange).toHaveBeenCalledWith({ city: 'Paris' });
  });

  it('calls onChangeFilter when the search input changes', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-search'), { target: { value: 'cozy' } });
    expect(onChange).toHaveBeenCalledWith({ search: 'cozy' });
  });

  it('toggles the star filter chip and clears on second click', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('star-chip-5'));
    expect(onChange).toHaveBeenLastCalledWith({ stars: 5 });
    rerender(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={{ ...DEFAULT_FILTERS, stars: 5 }}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('star-chip-5'));
    expect(onChange).toHaveBeenLastCalledWith({ stars: null });
  });

  it('shows the empty state when no hotels match', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={[]} filters={{ ...DEFAULT_FILTERS, city: 'Paris' }}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No hotels match your filters/)).toBeInTheDocument();
  });

  it('forwards onSelect from a card click', () => {
    const onSelect = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getAllByTestId('hotel-card')[0]);
    expect(onSelect).toHaveBeenCalledWith(HOTELS[0]);
  });

  it('renders city options from the meta', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    const select = screen.getByTestId('filter-city');
    META.CITIES.forEach((c) => {
      expect(within(select).getByRole('option', { name: c })).toBeInTheDocument();
    });
  });

  it('shows the active filter count when a filter is set', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS}
        filters={{ ...DEFAULT_FILTERS, city: 'Paris', stars: 5 }}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('active-count').textContent).toMatch(/2 active filters/);
  });

  it('renders active filter chips and Clear all button', () => {
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS}
        filters={{ ...DEFAULT_FILTERS, city: 'Paris', freeCancel: true }}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={() => {}} onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('active-chips')).toBeInTheDocument();
    expect(screen.getByTestId('active-chip-city')).toBeInTheDocument();
    expect(screen.getByTestId('active-chip-freeCancel')).toBeInTheDocument();
    expect(screen.getByTestId('clear-all')).toBeInTheDocument();
  });

  it('toggles the free-cancellation filter', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('filter-free-cancel'));
    expect(onChange).toHaveBeenLastCalledWith({ freeCancel: true });
  });

  it('toggles an amenity chip', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('amenity-chip-pool'));
    expect(onChange).toHaveBeenLastCalledWith({ amenities: ['pool'] });
  });

  it('calls onChangeFilter when the sort changes', () => {
    const onChange = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={HOTELS} filters={DEFAULT_FILTERS}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={onChange} onReset={() => {}} onSelect={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('filter-sort'), { target: { value: 'price-asc' } });
    expect(onChange).toHaveBeenLastCalledWith({ sort: 'price-asc' });
  });

  it('calls onReset when the empty-state Reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <FilterDashboard
        hotels={HOTELS} filtered={[]} filters={{ ...DEFAULT_FILTERS, city: 'Paris' }}
        defaultFilters={DEFAULT_FILTERS} meta={META}
        onChangeFilter={() => {}} onReset={onReset} onSelect={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('empty-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});