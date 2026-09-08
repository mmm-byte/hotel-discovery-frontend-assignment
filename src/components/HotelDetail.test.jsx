/**
 * HotelDetail.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the HotelDetail component.
 *
 * Coverage:
 *   - Renders the hotel name, address, description.
 *   - Renders the back button and calls onBack on click.
 *   - Renders the policies section with check-in/out times.
 *   - Renders amenity buckets for known amenity strings.
 *   - Hides the amenities section when the hotel has no amenities.
 *   - Delegates room rendering to the RoomAvailability component
 *     (verified by passing through dates and asserting the embedded summary).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotelDetail from './HotelDetail';

const sampleHotel = {
  id: 'test-1',
  name: 'Test Grand Hotel',
  description: 'A wonderful place to stay.',
  star_rating: 5,
  overall_rating: 4.8,
  review_count: 1240,
  address: { street: '1 Test St', city: 'Paris', state: 'IDF', zip_code: '75001', country: 'France' },
  contact: { phone: '+33-1-23-45-67-89', email: 'stay@test.com' },
  amenities: ['pool', 'spa', 'free Wi-Fi'],
  policies: {
    check_in_time: '15:00',
    check_out_time: '11:00',
    cancellation: 'Free cancellation up to 24 hours before check-in',
  },
  rooms: [
    { room_id: 't1', type: 'Deluxe King', bed_type: 'King', bed_count: 1,
      max_occupancy: 2, square_footage: 450, price_per_night: 299,
      room_amenities: [], available_dates: ['2026-07-10', '2026-07-11'] },
  ],
};

const baseProps = {
  onBack: vi.fn(),
  checkIn: '',
  checkOut: '',
  onChangeDates: vi.fn(),
};

describe('HotelDetail', () => {
  it('renders the hotel name, location, and description', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Test Grand Hotel' })).toBeInTheDocument();
    expect(screen.getByText(/1 Test St, Paris, IDF/)).toBeInTheDocument();
    expect(screen.getByText('A wonderful place to stay.')).toBeInTheDocument();
  });

  it('renders the back button and calls onBack on click', () => {
    const onBack = vi.fn();
    render(<HotelDetail hotel={sampleHotel} {...baseProps} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the policies section with check-in/out times', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('policies-section')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
  });

  it('renders amenity buckets for the hotel\'s amenities', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('amenities-section')).toBeInTheDocument();
    // 'pool' and 'spa' live in the Wellness bucket per §7.
    expect(screen.getByText('pool')).toBeInTheDocument();
    expect(screen.getByText('spa')).toBeInTheDocument();
    expect(screen.getByText('free Wi-Fi')).toBeInTheDocument();
    expect(screen.getByText('Wellness')).toBeInTheDocument();
    expect(screen.getByText('Connectivity')).toBeInTheDocument();
  });

  it('hides the amenities section when the hotel has no amenities', () => {
    const noAmenitiesHotel = { ...sampleHotel, amenities: [] };
    render(<HotelDetail hotel={noAmenitiesHotel} {...baseProps} />);
    expect(screen.queryByTestId('amenities-section')).not.toBeInTheDocument();
  });

  it('renders nothing when no hotel is selected', () => {
    const { container } = render(<HotelDetail hotel={null} {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the contact phone and email in the policies section', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByText('+33-1-23-45-67-89')).toBeInTheDocument();
    expect(screen.getByText('stay@test.com')).toBeInTheDocument();
  });

  it('passes dates down to RoomAvailability', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} checkIn="2026-07-10" checkOut="2026-07-12" />);
    // RoomAvailability will render date inputs with the provided values.
    const checkInInput = screen.getByLabelText('Check-in date');
    const checkOutInput = screen.getByLabelText('Check-out date');
    expect(checkInInput.value).toBe('2026-07-10');
    expect(checkOutInput.value).toBe('2026-07-12');
  });
});