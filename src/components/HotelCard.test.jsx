/**
 * HotelCard.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the HotelCard presentational component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotelCard from './HotelCard';

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
  policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
  rooms: [
    { room_id: 't1', type: 'Deluxe King', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 450, price_per_night: 299, room_amenities: [], available_dates: ['2026-07-10', '2026-07-11'] },
    { room_id: 't2', type: 'Standard Queen', bed_type: 'Queen', bed_count: 1, max_occupancy: 2, square_footage: 320, price_per_night: 199, room_amenities: [], available_dates: ['2026-07-10'] },
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
    expect(screen.getByText('$199')).toBeInTheDocument();
  });

  it('shows the star count and rating chip', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.getByLabelText('5 star hotel')).toBeInTheDocument();
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2k reviews/)).toBeInTheDocument();
  });

  it('shows the "No rooms" badge + sold-out class when all rooms are empty', () => {
    const noRoomsHotel = { ...sampleHotel, rooms: sampleHotel.rooms.map((r) => ({ ...r, available_dates: [] })) };
    const { container } = render(<HotelCard hotel={noRoomsHotel} onSelect={() => {}} />);
    expect(screen.getByText('No rooms')).toBeInTheDocument();
    expect(container.querySelector('.hotel-card--sold-out')).toBeInTheDocument();
  });

  it('does NOT show the "No rooms" badge when at least one room is available', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.queryByText('No rooms')).not.toBeInTheDocument();
  });

  it('shows the free-cancellation badge', () => {
    render(<HotelCard hotel={sampleHotel} onSelect={() => {}} />);
    expect(screen.getByText(/Free cancellation · 24h/)).toBeInTheDocument();
  });

  it('shows the non-refundable badge when policy forbids refunds', () => {
    const nonrefHotel = { ...sampleHotel, policies: { ...sampleHotel.policies, cancellation: 'Non-refundable booking' } };
    render(<HotelCard hotel={nonrefHotel} onSelect={() => {}} />);
    expect(screen.getByText('Non-refundable')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<HotelCard hotel={sampleHotel} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('hotel-card'));
    expect(onSelect).toHaveBeenCalledWith(sampleHotel);
  });

  it('calls onSelect when the View details button is clicked', () => {
    const onSelect = vi.fn();
    render(<HotelCard hotel={sampleHotel} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(onSelect).toHaveBeenCalledWith(sampleHotel);
  });

  it('changes the CTA text to "View property" for sold-out hotels', () => {
    const noRoomsHotel = { ...sampleHotel, rooms: sampleHotel.rooms.map((r) => ({ ...r, available_dates: [] })) };
    render(<HotelCard hotel={noRoomsHotel} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /view property/i })).toBeInTheDocument();
  });

  it('activates on Enter and Space keys', () => {
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