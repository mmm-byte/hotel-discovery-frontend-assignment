/**
 * HotelDetail.test.jsx
 * ----------------------------------------------------------------------------
 * Tests for the HotelDetail component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
  amenities: ['pool', 'spa', 'free Wi-Fi', 'restaurant', 'bar', 'pet_friendly', 'valet_parking'],
  policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
  rooms: [
    { room_id: 't1', type: 'Deluxe King', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 450, price_per_night: 299, room_amenities: [], available_dates: ['2026-07-10', '2026-07-11'] },
  ],
};

const baseProps = {
  onBack: vi.fn(),
  checkIn: '',
  checkOut: '',
  onChangeDates: vi.fn(),
};

describe('HotelDetail', () => {
  it('renders the hotel name and description in the hero/about sections', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Test Grand Hotel');
    expect(screen.getByTestId('hotel-description')).toHaveTextContent('A wonderful place to stay.');
  });

  it('renders the back button in the booking bar and calls onBack on click', () => {
    const onBack = vi.fn();
    render(<HotelDetail hotel={sampleHotel} {...baseProps} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('also exposes a back button in the hero', () => {
    const onBack = vi.fn();
    render(<HotelDetail hotel={sampleHotel} {...baseProps} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('hero-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the about section with rating chips', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('about-section')).toBeInTheDocument();
    // A 4.8-rated hotel should show the "Exceptional" tier label.
    expect(screen.getAllByText(/Exceptional/i).length).toBeGreaterThan(0);
  });

  it('renders the policies / house-rules section with check-in/out times and cancellation', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    const policies = screen.getByTestId('policies-section');
    expect(policies).toBeInTheDocument();
    expect(within(policies).getByText('15:00')).toBeInTheDocument();
    expect(within(policies).getByText('11:00')).toBeInTheDocument();
    expect(within(policies).getAllByText(/Free cancellation/i).length).toBeGreaterThan(0);
  });

  it('renders the most-popular facilities tiles for the hotel amenities', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('facilities-section')).toBeInTheDocument();
    const grid = screen.getByTestId('facilities-grid');
    expect(within(grid).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('hides the facilities section when the hotel has no amenities', () => {
    const noAmenitiesHotel = { ...sampleHotel, amenities: [] };
    render(<HotelDetail hotel={noAmenitiesHotel} {...baseProps} />);
    expect(screen.queryByTestId('facilities-section')).not.toBeInTheDocument();
  });

  it('shows a "Show all facilities" toggle when there are more than 6 amenities', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    // 7 amenities in the fixture → toggle should be visible.
    expect(screen.getByTestId('facilities-toggle')).toBeInTheDocument();
  });

  it('renders the contact section with phone and email', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('contact-section')).toBeInTheDocument();
    expect(screen.getByText('+33-1-23-45-67-89')).toBeInTheDocument();
    expect(screen.getByText('stay@test.com')).toBeInTheDocument();
  });

  it('renders the sticky booking bar', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('booking-bar')).toBeInTheDocument();
  });

  it('renders the sticky reserve card on the right rail', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    const card = screen.getByTestId('reserve-card');
    expect(card).toBeInTheDocument();
    expect(within(card).getByTestId('reserve-cta')).toHaveTextContent(/Check availability/i);
  });

  it('updates the reserve-card dates and total when dates are passed in', () => {
    render(
      <HotelDetail
        hotel={sampleHotel}
        {...baseProps}
        checkIn="2026-07-10"
        checkOut="2026-07-12"
      />
    );
    const card = screen.getByTestId('reserve-card');
    expect(within(card).getByTestId('reserve-checkin').textContent).toMatch(/Jul/i);
    expect(within(card).getByTestId('reserve-checkout').textContent).toMatch(/Jul/i);
    expect(within(card).getByTestId('reserve-card-total')).toHaveTextContent(/2 nights/);
    expect(within(card).getByTestId('reserve-cta')).toHaveTextContent(/Reserve/i);
  });

  it('renders the guest reviews breakdown', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('review-breakdown')).toBeInTheDocument();
  });

  it('renders the neighborhood preview', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(screen.getByTestId('neighborhood-card')).toBeInTheDocument();
  });

  it('renders the highlight strip with top amenities', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    const strip = screen.getByTestId('highlight-strip');
    expect(strip).toBeInTheDocument();
    expect(within(strip).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('toggles the Save button between Saved and Save', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    const save = screen.getByTestId('save-button');
    expect(save).toHaveTextContent(/Save/);
    fireEvent.click(save);
    expect(save).toHaveTextContent(/Saved/);
  });

  it('renders nothing when no hotel is selected', () => {
    const { container } = render(<HotelDetail hotel={null} {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the availability section anchor', () => {
    render(<HotelDetail hotel={sampleHotel} {...baseProps} />);
    expect(document.getElementById('availability')).toBeInTheDocument();
  });
});
