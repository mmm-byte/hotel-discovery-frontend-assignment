/**
 * RoomAvailability.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the RoomAvailability section. Covers the custom date-range picker
 * (replacing the broken native <input type="date">) and the four empty-state
 * branches.
 *
 * Date strategy: the test computes future dates relative to "now" so the
 * suite doesn't bit-rot as real calendar time advances.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RoomAvailability from './RoomAvailability';

// Compute future dates relative to "now" so the test never breaks.
const futureDate = (offsetDays) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const D_IN  = futureDate(30);  // check-in
const D_OUT = futureDate(32);  // check-out (2 nights)
const D_3   = futureDate(33);  // for the 3-night stay total test
const D_FAR = futureDate(90);  // a date with no rooms
const D_OOO = futureDate(95);  // after D_FAR

// Build a hotel whose available_dates align with our future test dates.
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
    { room_id: 'r1', type: 'Standard King', bed_type: 'King', bed_count: 1, max_occupancy: 2,
      square_footage: 300, price_per_night: 200, room_amenities: ['city_view'],
      available_dates: [D_IN, futureDate(31), D_OUT] },
    { room_id: 'r2', type: 'Twin Room', bed_type: 'Twin', bed_count: 2, max_occupancy: 3,
      square_footage: 320, price_per_night: 180, room_amenities: [],
      available_dates: [] },
  ],
};

const emptyHotel = {
  ...sampleHotel,
  id: 'h-empty',
  rooms: sampleHotel.rooms.map((r) => ({ ...r, available_dates: [] })),
};

// Hotel with a run of consecutive available nights so the recommended-dates
// panel can find a real suggestion window to display.
const hotelWithFuture = {
  ...sampleHotel,
  id: 'h-future',
  rooms: [
    { room_id: 'rf1', type: 'Standard King', bed_type: 'King', bed_count: 1, max_occupancy: 2,
      square_footage: 300, price_per_night: 200, room_amenities: [],
      available_dates: [futureDate(100), futureDate(101), futureDate(102)] },
  ],
};

describe('RoomAvailability', () => {
  it('renders the date-range picker', () => {
    render(<RoomAvailability hotel={sampleHotel} checkIn="" checkOut="" onChangeDates={() => {}} />);
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
  });

  it('shows the "please pick dates" hint when no dates are set', () => {
    render(<RoomAvailability hotel={sampleHotel} checkIn="" checkOut="" onChangeDates={() => {}} />);
    expect(screen.getByTestId('please-pick-dates')).toBeInTheDocument();
  });

  it('picking two days from the calendar calls onChangeDates with the range', () => {
    const onChange = vi.fn();
    render(<RoomAvailability hotel={sampleHotel} checkIn="" checkOut="" onChangeDates={onChange} />);
    fireEvent.click(screen.getByTestId(`cal-day-${D_IN}`));
    expect(onChange).toHaveBeenLastCalledWith({ checkIn: D_IN, checkOut: '' });
    fireEvent.click(screen.getByTestId(`cal-day-${D_OUT}`));
    expect(onChange).toHaveBeenLastCalledWith({ checkIn: D_IN, checkOut: D_OUT });
  });

  it('renders only rooms that cover the full stay', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_IN} checkOut={D_OUT}
        onChangeDates={() => {}}
      />
    );
    const rooms = screen.getAllByTestId('room-card');
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toHaveAttribute('data-room-id', 'r1');
  });

  it('shows the stay total on each room card', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_IN} checkOut={D_3}
        onChangeDates={() => {}}
      />
    );
    // 3 nights * 200 = 600. The total is split across nested elements so we
    // use a function matcher on the room-card element directly.
    const card = screen.getByTestId('room-card');
    expect(card.textContent).toMatch(/\$600\s*total/);
  });

  it('shows the "no rooms for these dates" empty state when nothing matches', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_FAR} checkOut={D_OOO}
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('no-rooms-for-dates')).toBeInTheDocument();
  });

  it('shows the "no rooms ever" empty state when the hotel has zero inventory', () => {
    render(
      <RoomAvailability
        hotel={emptyHotel}
        checkIn={D_IN} checkOut={D_OUT}
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('no-rooms-ever')).toBeInTheDocument();
  });

  it('updates the summary line with the visible count', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_IN} checkOut={D_OUT}
        onChangeDates={() => {}}
      />
    );
    expect(screen.getByTestId('availability-summary').textContent)
      .toMatch(/Showing 1 of 2 rooms for your 2-night stay/);
  });

  it('navigates forward and backward by month', () => {
    render(<RoomAvailability hotel={sampleHotel} checkIn="" checkOut="" onChangeDates={() => {}} />);
    fireEvent.click(screen.getByTestId('cal-next'));
    fireEvent.click(screen.getByTestId('cal-prev'));
  });

  it('clears the selection when Clear dates is clicked', () => {
    const onChange = vi.fn();
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_IN} checkOut={D_OUT}
        onChangeDates={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('cal-clear'));
    expect(onChange).toHaveBeenCalledWith({ checkIn: '', checkOut: '' });
  });

  it('renders a Select room CTA on each room card', () => {
    render(
      <RoomAvailability
        hotel={sampleHotel}
        checkIn={D_IN} checkOut={D_OUT}
        onChangeDates={() => {}}
      />
    );
    expect(screen.getAllByTestId('select-room').length).toBeGreaterThan(0);
  });

  it('shows recommended-date chips in the "no rooms for these dates" empty state', () => {
    const onChangeDates = vi.fn();
    render(
      <RoomAvailability
        hotel={hotelWithFuture}
        checkIn={futureDate(0)} checkOut={futureDate(2)}
        onChangeDates={onChangeDates}
      />
    );
    const panel = screen.getByTestId('recommended-dates');
    expect(panel).toBeInTheDocument();
    const chips = within(panel).getAllByTestId('recommended-window');
    expect(chips.length).toBeGreaterThan(0);
    // Clicking a chip propagates a real date pair back to the parent.
    const first = chips[0];
    fireEvent.click(first);
    expect(onChangeDates).toHaveBeenCalledWith({
      checkIn: first.getAttribute('data-checkin'),
      checkOut: first.getAttribute('data-checkout'),
    });
  });
});