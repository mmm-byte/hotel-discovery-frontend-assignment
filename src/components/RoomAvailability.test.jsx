/**
 * RoomAvailability.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the RoomAvailability section.
 *
 * Coverage:
 *   - Shows the "please pick dates" hint when no dates are set.
 *   - Shows the "invalid range" hint when check-out <= check-in.
 *   - Renders only the rooms that match the selected dates.
 *   - Shows the "no rooms for these dates" empty state when no rooms match.
 *   - Shows the "no rooms ever" empty state when the hotel has zero rooms.
 *   - Calls onChangeDates with the new value when an input changes.
 *   - Renders the stay total (nights * price) on each room card.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomAvailability from './RoomAvailability';

const sampleHotel = {
  id: 'h-rooms',
  name: 'Sample',
  description: 'd',
  star_rating: 4,
  overall_rating: 4.4,
  review_count: 100,
  address: { city: 'Austin', state: 'TX', zip_code: '78701', country: 'USA' },
  contact: { phone: '+1', email: 'a@x.com' },
  amenities: ['pool'],
  policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Non-refundable booking' },
  rooms: [
    { room_id: 'r1', type: 'Standard King', bed_type: 'King', bed_count: 1,
      max_occupancy: 2, square_footage: 300, price_per_night: 200,
      room_amenities: ['city_view'], available_dates: ['2026-07-10', '2026-07-11', '2026-07-12'] },
    { room_id: 'r2', type: 'Suite', bed_type: 'King', bed_count: 1,
      max_occupancy: 2, square_footage: 500, price_per_night: 400,
      room_amenities: ['balcony'], available_dates: ['2026-07-10'] }, // only one night
    { room_id: 'r3', type: 'Twin Room', bed_type: 'Twin', bed_count: 2,
      max_occupancy: 3, square_footage: 320, price_per_night: 180,
      room_amenities: [], available_dates: [] }, // never available
  ],
};

const emptyHotel = {
  ...sampleHotel,
  id: 'h-empty',
  rooms: sampleHotel.rooms.map((r) => ({ ...r, available_dates: [] })),
};

describe('RoomAvailability', () => {
  it('shows the "please pick dates" hint when no dates are set', () => {
    render(<RoomAvailability hotel={sampleHotel} checkIn="" checkOut="" onChangeDates={() => {}} />);
    expect(screen.getByTestId('please-pick-dates')).toBeInTheDocument();
    expect(screen.queryByTestId('room-list')).not.toBeInTheDocument();
  });

  it('shows the invalid-range empty state when check-out is before check-in', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-12"
        checkOut="2026-07-10"
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('invalid-range')).toBeInTheDocument();
  });

  it('renders only rooms that cover the full stay', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-10"
        checkOut="2026-07-12"
        onChangeDates={() => {}}
      />
    );
    // r1 covers 7/10, 7/11 → matches. r2 only covers 7/10 → doesn't. r3 never.
    const rooms = screen.getAllByTestId('room-card');
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toHaveAttribute('data-room-id', 'r1');
  });

  it('shows the "no rooms for these dates" empty state when nothing matches', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-20"
        checkOut="2026-07-22"
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('no-rooms-for-dates')).toBeInTheDocument();
  });

  it('shows the "no rooms ever" empty state when the hotel has zero inventory', () => {
    render(
      <RoomAvailability
        hotel={emptyHotel}
        checkIn="2026-07-10"
        checkOut="2026-07-12"
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('no-rooms-ever')).toBeInTheDocument();
  });

  it('calls onChangeDates with the new value when check-in changes', () => {
    const onChange = vi.fn();
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn=""
        checkOut=""
        onChangeDates={onChange}
      />
    );
    fireEvent.change(screen.getByTestId('check-in-input'), { target: { value: '2026-07-10' } });
    expect(onChange).toHaveBeenCalledWith({ checkIn: '2026-07-10' });
  });

  it('calls onChangeDates with the new value when check-out changes', () => {
    const onChange = vi.fn();
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-10"
        checkOut="2026-07-12"
        onChangeDates={onChange}
      />
    );
    fireEvent.change(screen.getByTestId('check-out-input'), { target: { value: '2026-07-15' } });
    expect(onChange).toHaveBeenCalledWith({ checkOut: '2026-07-15' });
  });

  it('renders the stay total on each room card', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-10"
        checkOut="2026-07-13"
        onChangeDates={() => {}}
      />
    );
    // r1 has price 200 and 3 nights → total 600
    expect(screen.getByText(/\$600 total · 3 nights/)).toBeInTheDocument();
  });

  it('updates the summary line with the visible count', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn="2026-07-10"
        checkOut="2026-07-12"
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('availability-summary').textContent)
      .toMatch(/Showing 1 of 3 rooms for your 2-night stay/);
  });
});