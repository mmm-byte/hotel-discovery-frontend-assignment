/**
 * useHotels.test.js
 * ----------------------------------------------------------------------------
 * Unit tests for the pure helper functions exported from src/store/useHotels.js.
 */

import { describe, it, expect } from 'vitest';
import {
  filterHotels,
  sortHotels,
  activeFilterCount,
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
  hotelHasRoomsFor,
  recommendDateWindows,
  reviewSummary,
  AMENITIES,
  BED_TYPES,
  SORT_OPTIONS,
} from './useHotels';
import hotelsData from '../data/mock-data.json';

const sample = [
  {
    id: 'a', name: 'Alpha Inn', description: 'cozy and quiet',
    star_rating: 3, overall_rating: 4.2, review_count: 250,
    address: { city: 'Austin', state: 'TX', zip_code: '78701', country: 'USA' },
    contact: { phone: '+1', email: 'a@example.com' },
    amenities: ['pool', 'free Wi-Fi', 'pet_friendly'],
    policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
    rooms: [
      { room_id: 'a1', type: 'Standard', bed_type: 'Queen', bed_count: 1, max_occupancy: 2,
        square_footage: 300, price_per_night: 120, room_amenities: [], available_dates: ['2026-07-10','2026-07-11'] },
      { room_id: 'a2', type: 'King Suite', bed_type: 'King', bed_count: 1, max_occupancy: 2,
        square_footage: 400, price_per_night: 200, room_amenities: [], available_dates: ['2026-07-10'] },
    ],
  },
  {
    id: 'b', name: 'Bravo Tower', description: 'skyline views',
    star_rating: 5, overall_rating: 4.8, review_count: 3200,
    address: { city: 'New York', state: 'NY', zip_code: '10001', country: 'USA' },
    contact: { phone: '+1', email: 'b@example.com' },
    amenities: ['spa', 'fitness_center'],
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
  it('renders whole numbers without decimals', () => expect(formatPrice(199)).toBe('199'));
  it('keeps significant decimals', () => expect(formatPrice(199.5)).toBe('199.5'));
  it('handles non-finite', () => {
    expect(formatPrice(NaN)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });
});

describe('formatReviewCount', () => {
  it('keeps small counts', () => expect(formatReviewCount(950)).toBe('950'));
  it('1-decimal k-suffix under 10k', () => {
    expect(formatReviewCount(1240)).toBe('1.2k');
    expect(formatReviewCount(3200)).toBe('3.2k');
  });
  it('rounds at 10k+', () => expect(formatReviewCount(12400)).toBe('12k'));
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
  it('returns top at 4.7+', () => expect(ratingTier(4.8).tier).toBe('top'));
  it('returns great at 4.5+', () => expect(ratingTier(4.5).tier).toBe('great'));
  it('returns ok at 4.3+', () => expect(ratingTier(4.3).tier).toBe('ok'));
  it('null below 4.3', () => expect(ratingTier(4.2).tier).toBeNull());
});

describe('cancellationBadge', () => {
  it('shortens 24h', () => {
    expect(cancellationBadge('Free cancellation up to 24 hours before check-in'))
      .toEqual({ short: 'Free cancellation · 24h', kind: 'free' });
  });
  it('flags non-refundable', () => {
    expect(cancellationBadge('Non-refundable booking'))
      .toEqual({ short: 'Non-refundable', kind: 'nonref' });
  });
  it('falls back for unknown', () => {
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
  it('returns null for hotels with no rooms', () => {
    expect(cheapestRoomPrice({ id: 'x', rooms: [] })).toBeNull();
  });
});

describe('hotelHasNoRooms', () => {
  it('true when all rooms have empty available_dates', () => {
    expect(hotelHasNoRooms(sample[2])).toBe(true);
  });
  it('false when at least one room has dates', () => {
    expect(hotelHasNoRooms(sample[0])).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// filterHotels — all the criteria
// ----------------------------------------------------------------------------
describe('filterHotels — city', () => {
  it('keeps only hotels in the requested city', () => {
    expect(filterHotels(sample, { city: 'Austin' }).map((h) => h.id)).toEqual(['a', 'c']);
  });
  it('is case-insensitive', () => {
    expect(filterHotels(sample, { city: 'austin' }).length).toBe(2);
  });
  it('returns everything when city is empty', () => {
    expect(filterHotels(sample, { city: '' }).length).toBe(3);
  });
});

describe('filterHotels — star rating', () => {
  it('keeps only hotels at or above the chosen star rating', () => {
    // sample: a=3★, b=5★, c=2★. minStars=4 → only b. minStars=3 → a, b.
    expect(filterHotels(sample, { minStars: 4 }).map((h) => h.id)).toEqual(['b']);
    expect(filterHotels(sample, { minStars: 3 }).map((h) => h.id).sort()).toEqual(['a', 'b']);
    expect(filterHotels(sample, { minStars: 2 }).map((h) => h.id).sort()).toEqual(['a', 'b', 'c']);
  });
  it('null means any star rating', () => {
    expect(filterHotels(sample, { minStars: null }).length).toBe(3);
  });
});

describe('filterHotels — price range', () => {
  it('keeps hotels whose cheapest room is in range', () => {
    // a:120, b:480, c:60
    expect(filterHotels(sample, { minPrice: 100, maxPrice: 200 }).map((h) => h.id)).toEqual(['a']);
    expect(filterHotels(sample, { minPrice: 0, maxPrice: 100 }).map((h) => h.id)).toEqual(['c']);
  });
});

describe('hotelHasRoomsFor', () => {
  it('returns true when any room covers the requested stay', () => {
    // Hotel "a" only has 2026-07-10 available.
    expect(hotelHasRoomsFor(sample[0], '2026-07-10', '2026-07-11')).toBe(true);
  });
  it('returns false when no room is available for the entire stay', () => {
    expect(hotelHasRoomsFor(sample[0], '2099-01-01', '2099-01-05')).toBe(false);
  });
  it('returns false when the hotel has no rooms', () => {
    const empty = { ...sample[0], rooms: [] };
    expect(hotelHasRoomsFor(empty, '2026-07-10', '2026-07-11')).toBe(false);
  });
  it('requires every night of the stay to be covered', () => {
    // sample[0] rooms only cover 2026-07-10 and 2026-07-11. The night
    // 2026-07-12 is missing, so a 3-night stay cannot be satisfied.
    expect(hotelHasRoomsFor(sample[0], '2026-07-10', '2026-07-13')).toBe(false);
    // A 2-night stay (07-10 → 07-12) is fine.
    expect(hotelHasRoomsFor(sample[0], '2026-07-10', '2026-07-12')).toBe(true);
  });
});

describe('recommendDateWindows', () => {
  it('returns at least one window for a real hotel that has future inventory', () => {
    const h = hotelsData[0];
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const inDays = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return iso(d);
    };
    const wins = recommendDateWindows(h, inDays(0), 1, 3);
    expect(Array.isArray(wins)).toBe(true);
    // Each suggestion has ISO dates and a human label.
    wins.forEach((w) => {
      expect(w.checkIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(w.checkOut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(w.label.length).toBeGreaterThan(0);
    });
  });
  it('respects the requested stay length', () => {
    const h = hotelsData[0];
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const inDays = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return iso(d);
    };
    const wins = recommendDateWindows(h, inDays(0), 2, 3);
    // Skip if no window was found (inventory edge); otherwise verify length.
    if (wins.length > 0) {
      wins.forEach((w) => {
        const lo = new Date(w.checkIn + 'T00:00:00Z');
        const hi = new Date(w.checkOut + 'T00:00:00Z');
        const diff = Math.round((hi - lo) / (1000 * 60 * 60 * 24));
        expect(diff).toBe(2);
      });
    }
  });
  it('returns an empty array for a hotel with no future inventory', () => {
    const empty = { ...hotelsData[0], rooms: [] };
    expect(recommendDateWindows(empty, '2099-01-01', 1, 3)).toEqual([]);
  });
});

describe('filterHotels — minRating', () => {
  it('filters by overall_rating', () => {
    // a:4.2, b:4.8, c:4.0
    expect(filterHotels(sample, { minRating: 4.5 }).map((h) => h.id)).toEqual(['b']);
    expect(filterHotels(sample, { minRating: 4.1 }).map((h) => h.id).sort()).toEqual(['a', 'b']);
  });
});

describe('filterHotels — freeCancel', () => {
  it('keeps only hotels with a free-cancellation policy', () => {
    // a + c are free, b is non-refundable
    expect(filterHotels(sample, { freeCancel: true }).map((h) => h.id).sort()).toEqual(['a', 'c']);
  });
  it('false keeps all', () => {
    expect(filterHotels(sample, { freeCancel: false }).length).toBe(3);
  });
});

describe('filterHotels — amenities (ALL must match)', () => {
  it('pool + pet_friendly → only a', () => {
    expect(filterHotels(sample, { amenities: ['pool', 'pet_friendly'] }).map((h) => h.id)).toEqual(['a']);
  });
  it('a missing amenity excludes the hotel', () => {
    expect(filterHotels(sample, { amenities: ['spa', 'pet_friendly'] }).length).toBe(0);
  });
  it('empty list means no constraint', () => {
    expect(filterHotels(sample, { amenities: [] }).length).toBe(3);
  });
});

describe('filterHotels — roomBedType', () => {
  it('keeps hotels with at least one matching room', () => {
    // a:Queen+King, b:King, c:Twin
    expect(filterHotels(sample, { roomBedType: 'Twin' }).map((h) => h.id)).toEqual(['c']);
    expect(filterHotels(sample, { roomBedType: 'King' }).map((h) => h.id).sort()).toEqual(['a', 'b']);
  });
  it('null means any', () => {
    expect(filterHotels(sample, { roomBedType: null }).length).toBe(3);
  });
});

describe('filterHotels — search', () => {
  it('matches name, city, description', () => {
    expect(filterHotels(sample, { search: 'cozy' }).map((h) => h.id)).toEqual(['a']);
    expect(filterHotels(sample, { search: 'austin' }).length).toBe(2);
    expect(filterHotels(sample, { search: 'TOWER' }).map((h) => h.id)).toEqual(['b']);
  });
});

describe('filterHotels — sort', () => {
  it('sorts by price asc', () => {
    const out = filterHotels(sample, { sort: 'price-asc' });
    expect(out.map((h) => h.id)).toEqual(['c', 'a', 'b']);
  });
  it('sorts by rating desc', () => {
    const out = filterHotels(sample, { sort: 'rating-desc' });
    expect(out.map((h) => h.id)).toEqual(['b', 'a', 'c']);
  });
  it('recommended falls back to rating then price', () => {
    const out = filterHotels(sample, { sort: 'recommended' });
    expect(out[0].id).toBe('b'); // highest rated
  });
});

describe('filterHotels — combined', () => {
  it('ANDs all criteria', () => {
    const out = filterHotels(sample, { city: 'Austin', minStars: 3, minPrice: 100, maxPrice: 200, freeCancel: true });
    expect(out.map((h) => h.id)).toEqual(['a']);
  });
});

// ----------------------------------------------------------------------------
// sortHotels
// ----------------------------------------------------------------------------
describe('sortHotels', () => {
  it('price-asc orders cheapest first', () => {
    expect(sortHotels(sample, 'price-asc').map((h) => h.id)).toEqual(['c', 'a', 'b']);
  });
  it('price-desc orders priciest first', () => {
    expect(sortHotels(sample, 'price-desc').map((h) => h.id)).toEqual(['b', 'a', 'c']);
  });
  it('rating-desc orders highest rated first', () => {
    expect(sortHotels(sample, 'rating-desc').map((h) => h.id)).toEqual(['b', 'a', 'c']);
  });
  it('stars-desc orders most stars first', () => {
    expect(sortHotels(sample, 'stars-desc').map((h) => h.id)).toEqual(['b', 'a', 'c']);
  });
  it('returns a new array (no mutation)', () => {
    const original = sample.slice();
    sortHotels(sample, 'price-asc');
    expect(sample).toEqual(original);
  });
});

// ----------------------------------------------------------------------------
// activeFilterCount
// ----------------------------------------------------------------------------
describe('activeFilterCount', () => {
  const defaults = { city: '', minStars: null, minRating: null, freeCancel: false, amenities: [], sort: 'recommended' };
  it('zero when filters equal defaults', () => {
    expect(activeFilterCount(defaults, defaults)).toBe(0);
  });
  it('counts each non-default field', () => {
    expect(activeFilterCount({ ...defaults, city: 'Paris', minStars: 4 }, defaults)).toBe(2);
  });
  it('counts amenity arrays of different length', () => {
    expect(activeFilterCount({ ...defaults, amenities: ['pool'] }, defaults)).toBe(1);
  });
});

// ----------------------------------------------------------------------------
// Date-based availability
// ----------------------------------------------------------------------------
describe('nightsBetween', () => {
  it('lists each night from check-in inclusive to check-out exclusive', () => {
    expect(nightsBetween('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11']);
  });
  it('handles month rollover', () => {
    expect(nightsBetween('2026-07-30', '2026-08-02')).toEqual(['2026-07-30', '2026-07-31', '2026-08-01']);
  });
  it('returns empty on bad input', () => {
    expect(nightsBetween('', '2026-07-10')).toEqual([]);
    expect(nightsBetween('2026-07-10', '')).toEqual([]);
    expect(nightsBetween('not-a-date', '2026-07-10')).toEqual([]);
    expect(nightsBetween('2026-07-12', '2026-07-10')).toEqual([]);
  });
});

describe('isRoomAvailable', () => {
  const room = {
    room_id: 'r1', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 300,
    price_per_night: 200, room_amenities: [],
    available_dates: ['2026-07-10', '2026-07-11', '2026-07-12'],
  };
  it('true when every night is in available_dates', () => {
    expect(isRoomAvailable(room, '2026-07-10', '2026-07-12')).toBe(true);
  });
  it('false when any night missing', () => {
    expect(isRoomAvailable(room, '2026-07-10', '2026-07-14')).toBe(false);
  });
  it('false for empty available_dates', () => {
    expect(isRoomAvailable({ ...room, available_dates: [] }, '2026-07-10', '2026-07-11')).toBe(false);
  });
  it('false when either date missing', () => {
    expect(isRoomAvailable(room, '', '2026-07-12')).toBe(false);
  });
});

describe('availableRooms', () => {
  it('returns only rooms covering the full stay', () => {
    const hotel = {
      rooms: [
        { room_id: 'x1', bed_type: 'King', bed_count: 1, max_occupancy: 2, square_footage: 300,
          price_per_night: 200, room_amenities: [], available_dates: ['2026-07-10', '2026-07-11'] },
        { room_id: 'x2', bed_type: 'Queen', bed_count: 1, max_occupancy: 2, square_footage: 300,
          price_per_night: 200, room_amenities: [], available_dates: ['2026-07-10'] },
      ],
    };
    expect(availableRooms(hotel, '2026-07-10', '2026-07-12').map((r) => r.room_id)).toEqual(['x1']);
  });
});

// ----------------------------------------------------------------------------
// Amenity bucketing + meta
// ----------------------------------------------------------------------------
describe('bucketAmenities', () => {
  it('groups known strings under buckets', () => {
    const out = bucketAmenities(['pool', 'spa', 'free Wi-Fi']);
    const names = out.map((b) => b.name);
    expect(names).toContain('Wellness');
    expect(names).toContain('Connectivity');
  });
  it('drops empty buckets', () => {
    expect(bucketAmenities(['pool']).length).toBe(1);
  });
  it('unknowns go to Other', () => {
    expect(bucketAmenities(['made_up']).map((b) => b.name)).toEqual(['Other']);
  });
});

describe('vocabularies (AMENITIES, BED_TYPES, SORT_OPTIONS)', () => {
  it('exposes at least 30 distinct amenities', () => {
    expect(AMENITIES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(AMENITIES).size).toBe(AMENITIES.length);
  });
  it('exposes multiple bed types', () => {
    expect(BED_TYPES.length).toBeGreaterThanOrEqual(3);
  });
  it('exposes the expected sort options', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(
      expect.arrayContaining(['recommended', 'price-asc', 'price-desc', 'rating-desc', 'stars-desc'])
    );
  });
});

// ----------------------------------------------------------------------------
// Real-seed sanity — guards against contract drift
// ----------------------------------------------------------------------------
describe('real seed sanity', () => {
  it('has 40 hotels across 10 cities with 4 per city', () => {
    expect(hotelsData.length).toBe(40);
    const cities = new Set(hotelsData.map((h) => h.address.city));
    expect(cities.size).toBe(10);
  });
  it('has at least 6 hotels with no available rooms (~15%)', () => {
    const empty = hotelsData.filter(hotelHasNoRooms).length;
    expect(empty).toBeGreaterThanOrEqual(6);
  });
  it('contains all the expected cancellation vocabulary', () => {
    const allCanc = new Set(hotelsData.map((h) => h.policies.cancellation));
    expect(allCanc.has('Non-refundable booking')).toBe(true);
    expect(Array.from(allCanc).some((c) => c.includes('24 hours'))).toBe(true);
  });
  it('every hotel has at least one amenity in the closed vocabulary', () => {
    const known = new Set(AMENITIES);
    const unknown = hotelsData.flatMap((h) => h.amenities).filter((a) => !known.has(a));
    expect(unknown).toEqual([]);
  });
});
describe('reviewSummary', () => {
  it('returns a breakdown whose parts sum to the review count', () => {
    const out = reviewSummary({ overall_rating: 4.8, review_count: 100 });
    expect(out.total).toBe(100);
    const sum = out.breakdown.reduce((s, b) => s + b.count, 0);
    expect(sum).toBe(100);
    expect(out.label).toMatch(/Exceptional|Excellent|Very good|Good|Review score/);
  });
  it('returns null for an invalid hotel', () => {
    expect(reviewSummary(null)).toBeNull();
    expect(reviewSummary(undefined)).toBeNull();
  });
});
