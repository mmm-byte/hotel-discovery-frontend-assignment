/**
 * HotelCard.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the HotelCard presentational component.
 *
 * Coverage:
 *   - Renders name, location, star count, rating, and review count.
 *   - Shows the "From $X" anchor derived from the cheapest room.
 *   - Shows the "No rooms" badge when all rooms have empty available_dates.
 *   - Calls onSelect when the user clicks the card or the View details button.
 *   - Shows the cancellation-policy badge with the right kind (free / nonref).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotelCard from './HotelCard';

// A canonical hotel fixture reused across the tests.
const sampleHotel = {
  id: 'test-1',
  name: 'Test Grand Hotel',
  description: 'A wonderful place to stay with great views and amenities.',
  star_rating: 5,
  overall_rating: 4.8,
  review_count: 1240,
  address: { city: 'Paris', state: 'IDF', zip_code: '75001', country: 'France' },
  contact: { phone: '+33-1-23-45-67-89', email: 'stay@test.com' },
  amenities: ['pool', 'spa'],
  policies: {
    check_in_time: '15:00',
    check_out_time: '11:00',
    cancellation: 'Free cancellation up to 24 hours before check-in',
  },
  rooms: [
    { room_id: 't1', type: 'Deluxe King', bed_type: 'King', bed_count: 1,
      max_occupancy: 2, square_footage: 450, price_per_night: 299,
      room_amenities: [], available_dates: ['2026-07-10', '2026-07-11'] },
    { room_id: 't2', type: 'Standard Queen', bed_type: 'Queen', bed_count: 1,
      max_occupancy: 2, square_footage: 320, price_per_night: 199,
      room_amenities: [], available_dates: ['2026-07-10'] },
  ],
};

describe('HotelCard', () => {
  it('renders the hotel name and location', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Test Grand Hotel' })).toBeInTheDocument();
    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
  });

  it('shows the cheapest room price as the "From" anchor', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    // Cheapest room is 199, so we expect "$199" in the document.
    expect(screen.getByText('$199')).toBeInTheDocument();
  });

  it('shows star and rating chips', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    // 5-star glyph is rendered with a sr-only aria-label
    expect(screen.getByLabelText('5 star hotel')).toBeInTheDocument();
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2k reviews/)).toBeInTheDocument();
  });

  it('shows a "No rooms" badge when all rooms have empty available_dates', () => {
    const noRoomsHotel = {
      ...sampleHotel,
      rooms: sampleHotel.rooms.map((r) => ({ ...r, available_dates: [] })),
    };
    render(<HotelCard hotel={noRoomsHotel} onSelect={() => {}} />);
    expect(screen.getByText('No rooms')).toBeInTheDocument();
  });

  it('does NOT show the "No rooms" badge when at least one room has dates', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.queryByText('No rooms')).not.toBeInTheDocument();
  });

  it('shows the free-cancellation badge when the policy allows it', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.getByText(/Free cancellation · 24h/)).toBeInTheDocument();
  });

  it('shows the non-refundable badge when the policy forbids refunds', () => {
    const nonrefHotel = {
      ...sampleHotel,
      policies: { ...sampleHotel.policies, cancellation: 'Non-refundable booking' },
    };
    render(<HotelCard hotel={nonrefHotel} onSelect={() => {}} />);
    expect(screen.getByText('Non-refundable')).toBeInTheDocument();
  });

  it('calls onSelect with the hotel when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<HotelCard hotel={sampleHotel} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('hotel-card'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sampleHotel);
  });

  it('calls onSelect when the View details button is clicked', () => {
    const onSelect = vi.fn();
    render(<HotelCard hotel={sampleHotel} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sampleHotel);
  });

  it('activates on Enter and Space keys for keyboard accessibility', () => {
    const onSelect = vi.fn();
    render(<HotelCard hotel={sampleHotel} onSelect={onSelect} />);
    const card = screen.getByTestId('hotel-card');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('renders nothing for an invalid hotel prop', () => {
    const { container } = render(<HotelCard hotel={null} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});