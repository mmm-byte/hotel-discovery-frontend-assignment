/**
 * useHotels.test.js
 * ----------------------------------------------------------------------------
 * Unit tests for the pure helper functions exported from src/store/useHotels.js.
 * We test helpers directly (no React rendering) so failures are obvious and fast.
 *
 * What this covers:
 *   - filterHotels: city / star / price / search criteria, including edge cases
 *   - formatPrice / formatReviewCount: display formatting
 *   - starTier / ratingTier / cancellationBadge: view-model selectors
 *   - cheapestRoomPrice / hotelHasNoRooms: derivation helpers
 *   - nightsBetween / isRoomAvailable / availableRooms: date-based availability
 *     logic, including the "check-out is not a night" rule and the §9
 *     "no rooms" empty-state scenario.
 */

import { describe, it, expect } from 'vitest';
import {
  filterHotels,
  formatPrice,
  formatReviewCount,
  starTier,
  ratingTier,
  cheapestRoomPrice,
  hotelHasNoRooms,
  cancellationBadge,
  nightsBetween,
  isRoomAvailable,
  availableRooms,
  bucketAmenities,
} from './useHotels';
import hotelsData from '../data/mock-data.json';

// A small synthetic dataset for filter tests — easier to reason about than the full 40.
const sample = [
  {
    id: 'a', name: 'Alpha Inn', description: 'cozy and quiet',
    star_rating: 3, overall_rating: 4.2, review_count: 250,
    address: { city: 'Austin', state: 'TX', zip_code: '78701', country: 'USA' },
    contact: { phone: '+1', email: 'a@example.com' },
    amenities: ['pool'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
    rooms: [
      { room_id: 'a1', type: 'Standard', bed_type: 'Queen', bed_count: 1, max_occupancy: 2,
        square_footage: 300, price_per_night: 120, room_amenities: [], available_dates: ['2026-07-10','2026-07-11'] },
    ],
  },
  {
    id: 'b', name: 'Bravo Tower', description: 'skyline views',
    star_rating: 5, overall_rating: 4.8, review_count: 3200,
    address: { city: 'New York', state: 'NY', zip_code: '10001', country: 'USA' },
    contact: { phone: '+1', email: 'b@example.com' },
    amenities: ['spa'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Non-refundable booking' },
    rooms: [
      { room_id: 'b1', type: 'Suite', bed_type: 'King', bed_count: 1, max_occupancy: 2,
        square_footage: 600, price_per_night: 480, room_amenities: [], available_dates: ['2026-07-10','2026-07-11','2026-07-12'] },
    ],
  },
  {
    id: 'c', name: 'Charlie Hostel', description: 'budget pick',
    star_rating: 2, overall_rating: 4.0, review_count: 80,
    address: { city: 'Austin', state: 'TX', zip_code: '78702', country: 'USA' },
    contact: { phone: '+1', email: 'c@example.com' },
    amenities: [],
    policies: { check_in_time: '16:00', check_out_time: '10:00', cancellation: 'Free cancellation up to 48 hours before check-in' },
    rooms: [
      { room_id: 'c1', type: 'Dorm', bed_type: 'Twin', bed_count: 1, max_occupancy: 1,
        square_footage: 120, price_per_night: 60, room_amenities: [], available_dates: [] },
    ],
  },
];

// ----------------------------------------------------------------------------
// Display formatting
// ----------------------------------------------------------------------------

describe('formatPrice', () => {
  it('renders whole numbers without decimals', () => {
    expect(formatPrice(199)).toBe('199');
  });
  it('keeps existing decimals (Intl.NumberFormat behaviour)', () => {
    // Intl.NumberFormat with min=0/max=2 trims trailing zeros but preserves
    // significant decimals. 199.5 stays 199.5; 199.50 stays 199.5; 199 stays 199.
    expect(formatPrice(199.5)).toBe('199.5');
    expect(formatPrice(199.25)).toBe('199.25');
  });
  it('handles non-finite gracefully', () => {
    expect(formatPrice(NaN)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });
});

describe('formatReviewCount', () => {
  it('shows small counts as-is', () => {
    expect(formatReviewCount(950)).toBe('950');
  });
  it('uses 1-decimal k-suffix under 10k', () => {
    expect(formatReviewCount(1240)).toBe('1.2k');
    expect(formatReviewCount(3200)).toBe('3.2k');
  });
  it('rounds at 10k+', () => {
    expect(formatReviewCount(12400)).toBe('12k');
  });
});

// ----------------------------------------------------------------------------
// View-model selectors
// ----------------------------------------------------------------------------

describe('starTier', () => {
  it('maps 2..5 to budget..luxury', () => {
    expect(starTier(5)).toBe('luxury');
    expect(starTier(4)).toBe('upscale');
    expect(starTier(3)).toBe('midscale');
    expect(starTier(2)).toBe('budget');
    expect(starTier(99)).toBe('unknown');
  });
});

describe('ratingTier', () => {
  it('returns top tier at 4.7+', () => {
    expect(ratingTier(4.8).tier).toBe('top');
    expect(ratingTier(4.7).tier).toBe('top');
  });
  it('returns great tier at 4.5+', () => {
    expect(ratingTier(4.5).tier).toBe('great');
    expect(ratingTier(4.65).tier).toBe('great');
  });
  it('returns ok tier at 4.3+', () => {
    expect(ratingTier(4.3).tier).toBe('ok');
    expect(ratingTier(4.4).tier).toBe('ok');
  });
  it('returns null tier below 4.3', () => {
    expect(ratingTier(4.2).tier).toBeNull();
    expect(ratingTier(0).tier).toBeNull();
  });
});

describe('cancellationBadge', () => {
  it('shortens the 24h string', () => {
    expect(cancellationBadge('Free cancellation up to 24 hours before check-in'))
      .toEqual({ short: 'Free cancellation · 24h', kind: 'free' });
  });
  it('flags non-refundable', () => {
    expect(cancellationBadge('Non-refundable booking'))
      .toEqual({ short: 'Non-refundable', kind: 'nonref' });
  });
  it('falls back for unknown values', () => {
    expect(cancellationBadge('something else').kind).toBe('unknown');
    expect(cancellationBadge(undefined).kind).toBe('unknown');
  });
});

// ----------------------------------------------------------------------------
// Hotel-derived helpers
// ----------------------------------------------------------------------------

describe('cheapestRoomPrice', () => {
  it('returns the minimum nightly price', () => {
    expect(cheapestRoomPrice(sample[0])).toBe(120);
    expect(cheapestRoomPrice(sample[1])).toBe(480);
  });
  it('returns null when the hotel has no rooms', () => {
    expect(cheapestRoomPrice({ id: 'x', rooms: [] })).toBeNull();
    expect(cheapestRoomPrice({})).toBeNull();
  });
});

describe('hotelHasNoRooms', () => {
  it('is true when all rooms have empty available_dates', () => {
    expect(hotelHasNoRooms(sample[2])).toBe(true);
  });
  it('is false when at least one room has dates', () => {
    expect(hotelHasNoRooms(sample[0])).toBe(false);
    expect(hotelHasNoRooms(sample[1])).toBe(false);
  });
  it('is true for an empty rooms array', () => {
    expect(hotelHasNoRooms({ rooms: [] })).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// filterHotels
// ----------------------------------------------------------------------------

describe('filterHotels — city filter', () => {
  it('keeps only hotels in the requested city', () => {
    const out = filterHotels(sample, { city: 'Austin' });
    expect(out.map((h) => h.id)).toEqual(['a', 'c']);
  });
  it('is case-insensitive', () => {
    expect(filterHotels(sample, { city: 'austin' }).length).toBe(2);
    expect(filterHotels(sample, { city: 'AUSTIN' }).length).toBe(2);
  });
  it('returns everything when city is empty', () => {
    expect(filterHotels(sample, { city: '' }).length).toBe(3);
  });
});

describe('filterHotels — star filter', () => {
  it('keeps only the requested star rating', () => {
    expect(filterHotels(sample, { stars: 5 }).map((h) => h.id)).toEqual(['b']);
    expect(filterHotels(sample, { stars: 2 }).map((h) => h.id)).toEqual(['c']);
  });
  it('accepts an array of ratings', () => {
    const out = filterHotels(sample, { stars: [2, 5] });
    expect(out.map((h) => h.id)).toEqual(['b', 'c']);
  });
  it('null means "any star"', () => {
    expect(filterHotels(sample, { stars: null }).length).toBe(3);
  });
});

describe('filterHotels — price range', () => {
  it('keeps hotels whose cheapest room is in range', () => {
    // Sample cheapest prices: a=120, b=480, c=60
    expect(filterHotels(sample, { minPrice: 100, maxPrice: 200 }).map((h) => h.id)).toEqual(['a']);
    expect(filterHotels(sample, { minPrice: 0, maxPrice: 100 }).map((h) => h.id)).toEqual(['c']);
    expect(filterHotels(sample, { minPrice: 0, maxPrice: 9999 }).length).toBe(3);
  });
  it('treats hotels with no rooms as price 0 (they still pass)', () => {
    const noRoomsHotel = { ...sample[2], rooms: [] };
    const out = filterHotels([noRoomsHotel], { minPrice: 100 });
    // Cheapest price is null → treated as 0 → fails minPrice=100
    expect(out).toEqual([]);
  });
});

describe('filterHotels — search', () => {
  it('matches across name, city, and description', () => {
    expect(filterHotels(sample, { search: 'cozy' }).map((h) => h.id)).toEqual(['a']);
    expect(filterHotels(sample, { search: 'austin' }).length).toBe(2);
    expect(filterHotels(sample, { search: 'TOWER' }).map((h) => h.id)).toEqual(['b']);
  });
  it('returns all when search is empty', () => {
    expect(filterHotels(sample, { search: '' }).length).toBe(3);
    expect(filterHotels(sample, { search: '   ' }).length).toBe(3);
  });
});

describe('filterHotels — combined criteria', () => {
  it('ANDs all filters together', () => {
    const out = filterHotels(sample, { city: 'Austin', stars: 3, minPrice: 100, maxPrice: 200 });
    expect(out.map((h) => h.id)).toEqual(['a']);
  });
});

// ----------------------------------------------------------------------------
// Date-based availability
// ----------------------------------------------------------------------------

describe('nightsBetween', () => {
  it('lists each night from check-in (inclusive) to check-out (exclusive)', () => {
    // 10 → 12 should yield 2 nights: 10, 11 (NOT 12 — check-out is morning)
    expect(nightsBetween('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11']);
  });
  it('handles month rollover', () => {
    expect(nightsBetween('2026-07-30', '2026-08-02')).toEqual(['2026-07-30', '2026-07-31', '2026-08-01']);
  });
  it('returns empty on bad input', () => {
    expect(nightsBetween('', '2026-07-10')).toEqual([]);
    expect(nightsBetween('2026-07-10', '')).toEqual([]);
    expect(nightsBetween('not-a-date', '2026-07-10')).toEqual([]);
    expect(nightsBetween('2026-07-12', '2026-07-10')).toEqual([]); // out-of-order
  });
});

describe('isRoomAvailable', () => {
  const room = {
    room_id: 'r1', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 300,
    price_per_night: 200, room_amenities: [],
    available_dates: ['2026-07-10', '2026-07-11', '2026-07-12'],
  };

  it('returns true when every night is in available_dates', () => {
    expect(isRoomAvailable(room, '2026-07-10', '2026-07-12')).toBe(true);
  });
  it('returns false when any night is missing', () => {
    // Room covers 10, 11, 12. Stay [10, 14) requires 10, 11, 12, 13 — 13 is missing.
    expect(isRoomAvailable(room, '2026-07-10', '2026-07-14')).toBe(false);
  });
  it('returns false for rooms with empty available_dates', () => {
    expect(isRoomAvailable({ ...room, available_dates: [] }, '2026-07-10', '2026-07-11')).toBe(false);
  });
  it('returns false when either date is missing', () => {
    expect(isRoomAvailable(room, '', '2026-07-12')).toBe(false);
    expect(isRoomAvailable(room, '2026-07-10', '')).toBe(false);
  });
  it('treats check-out as not-a-night (one-night stays work)', () => {
    // A one-night stay [10, 11) only needs 10 in the list.
    expect(isRoomAvailable(room, '2026-07-10', '2026-07-11')).toBe(true);
  });
});

describe('availableRooms', () => {
  it('returns only rooms available for the full stay', () => {
    const hotel = {
      rooms: [
        { room_id: 'x1', bed_type: 'King', bed_count: 1, max_occupancy: 2,
          square_footage: 300, price_per_night: 200, room_amenities: [],
          available_dates: ['2026-07-10', '2026-07-11'] },
        { room_id: 'x2', bed_type: 'Queen', bed_count: 1, max_occupancy: 2,
          square_footage: 300, price_per_night: 200, room_amenities: [],
          available_dates: ['2026-07-10'] },
      ],
    };
    expect(availableRooms(hotel, '2026-07-10', '2026-07-12').map((r) => r.room_id)).toEqual(['x1']);
  });
  it('returns empty when no dates are set', () => {
    expect(availableRooms({ rooms: [] }, '', '')).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// Amenity bucketing
// ----------------------------------------------------------------------------

describe('bucketAmenities', () => {
  it('groups known strings under the right buckets', () => {
    const out = bucketAmenities(['pool', 'spa', 'free Wi-Fi']);
    const names = out.map((b) => b.name);
    expect(names).toContain('Wellness');
    expect(names).toContain('Connectivity');
  });
  it('drops empty buckets', () => {
    const out = bucketAmenities(['pool']);
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('Wellness');
  });
  it('places unknowns under Other', () => {
    const out = bucketAmenities(['made_up_amenity']);
    expect(out[0].name).toBe('Other');
    expect(out[0].items).toEqual(['made_up_amenity']);
  });
  it('returns empty list for empty input', () => {
    expect(bucketAmenities([])).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// Real-seed sanity check — guards against accidental contract drift.
// If this fails after editing mock-data.json, update the contract doc too.
// ----------------------------------------------------------------------------

describe('real seed sanity', () => {
  it('has 40 hotels across 10 cities with 4 per city', () => {
    expect(hotelsData.length).toBe(40);
    const cities = new Set(hotelsData.map((h) => h.address.city));
    expect(cities.size).toBe(10);
  });
  it('has at least 6 hotels with no available rooms (the 15% scenario)', () => {
    const empty = hotelsData.filter(hotelHasNoRooms).length;
    expect(empty).toBeGreaterThanOrEqual(6);
  });
  it('exposes the expected cancellation vocabulary', () => {
    const allCanc = new Set(hotelsData.map((h) => h.policies.cancellation));
    expect(allCanc.has('Non-refundable booking')).toBe(true);
    expect(Array.from(allCanc).some((c) => c.includes('24 hours'))).toBe(true);
  });
});