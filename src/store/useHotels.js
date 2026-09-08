/**
 * useHotels.js
 * ----------------------------------------------------------------------------
 * Central hook + pure helper functions for the hotel discovery app.
 *
 * Responsibilities:
 *   1. Load the mock dataset (a JSON array of hotels, see docs/json-data-contract.md).
 *   2. Provide filter helpers used by FilterDashboard (city, star rating, price range, search).
 *   3. Provide date-based room-availability helpers used by RoomAvailability.
 *   4. Provide selection state for navigating to a hotel detail view.
 *   5. Provide small "view-model" selectors used by HotelCard / HotelDetail.
 *
 * Design notes:
 *   - The hook is intentionally tiny. Most logic lives in pure functions so it can
 *     be unit-tested without React (see useHotels.test.js).
 *   - Filtering is O(n) over hotels; for the 40-hotel seed this is trivially fast.
 *   - Availability for a stay is computed by intersecting the requested date range
 *     with each room's available_dates list (see §6.1 of the data contract).
 */

import { useMemo, useState, useCallback } from 'react';
// The JSON file is imported as a raw module via Vite's default JSON behaviour.
// In test environments (Vitest with jsdom) the same import works because
// Vite's test runner shares the same JSON loading pipeline.
import hotelsData from '../data/mock-data.json';

// ----------------------------------------------------------------------------
// Static reference data derived from the seed (used to populate filter options).
// ----------------------------------------------------------------------------

/**
 * Unique cities in stable alphabetical order.
 * Derived from the seed at module load — no hard-coding to keep the seed honest.
 */
export const CITIES = Array.from(
  new Set(hotelsData.map((h) => h.address.city))
).sort();

/**
 * Unique star ratings present in the seed, ascending.
 * The seed contains 2-, 3-, 4-, and 5-star hotels, but the slider adapts to
 * whatever the data actually contains (e.g. a 1-star economy chain would
 * expand the range automatically).
 */
export const STAR_RATINGS = Array.from(
  new Set(hotelsData.map((h) => h.star_rating))
).sort((a, b) => a - b);

/**
 * Min and max star rating present in the seed. Used to bound the star-rating
 * range slider. Both default to "no constraint" so the UI can pick the full
 * spread for whatever dataset is loaded.
 */
export const MIN_STAR = Math.min(...STAR_RATINGS);
export const MAX_STAR = Math.max(...STAR_RATINGS);

/**
 * Unique bed types across all rooms in the seed. Used to populate the
 * "Room type" filter dropdown.
 */
export const BED_TYPES = Array.from(
  new Set(hotelsData.flatMap((h) => h.rooms.map((r) => r.bed_type)))
).sort();

/**
 * Unique amenity strings across all hotels in the seed. Used to populate
 * the amenity multi-select filter. Sorted alphabetically for stable UI.
 */
export const AMENITIES = Array.from(
  new Set(hotelsData.flatMap((h) => h.amenities || []))
).sort();

/**
 * Minimum and maximum nightly price across all rooms in the seed.
 * Used to seed the price-range filter slider bounds.
 */
const PRICE_BOUNDS = hotelsData.reduce(
  (acc, h) => {
    for (const room of h.rooms) {
      const p = Number(room.price_per_night) || 0;
      if (p < acc.min) acc.min = p;
      if (p > acc.max) acc.max = p;
    }
    return acc;
  },
  { min: Infinity, max: -Infinity }
);

export const MIN_PRICE = Math.floor(PRICE_BOUNDS.min);
export const MAX_PRICE = Math.ceil(PRICE_BOUNDS.max);

// ----------------------------------------------------------------------------
// Pure helpers — exported so they can be unit-tested directly.
// ----------------------------------------------------------------------------

/**
 * Format a USD price for display (no symbol, two-decimal rounding).
 * Example: 199 -> "199", 199.5 -> "199.50"
 */
export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a review count for compact display.
 *   950 -> "950"
 *   1240 -> "1.2k"
 *   12400 -> "12k"
 */
export function formatReviewCount(count) {
  const n = Number(count) || 0;
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

/**
 * Star-rating visual tier. Used to style the star chip on cards.
 * Returns one of: 'luxury' (5★), 'upscale' (4★), 'midscale' (3★), 'budget' (2★).
 */
export function starTier(starRating) {
  switch (starRating) {
    case 5: return 'luxury';
    case 4: return 'upscale';
    case 3: return 'midscale';
    case 2: return 'budget';
    default: return 'unknown';
  }
}

/**
 * Rating-tier label and CSS modifier for the overall_rating badge.
 * The seed range is 3.9–4.9 on a 0-5 scale, so thresholds are tuned to that scale.
 */
export function ratingTier(overallRating) {
  const r = Number(overallRating) || 0;
  if (r >= 4.7) return { label: 'Exceptional', tier: 'top' };
  if (r >= 4.5) return { label: 'Excellent', tier: 'great' };
  if (r >= 4.3) return { label: 'Very good', tier: 'ok' };
  return { label: null, tier: null };
}

/**
 * The cheapest nightly price across all of a hotel's rooms.
 * Returns null if the hotel has no rooms.
 */
export function cheapestRoomPrice(hotel) {
  if (!hotel || !Array.isArray(hotel.rooms) || hotel.rooms.length === 0) {
    return null;
  }
  return hotel.rooms.reduce(
    (min, r) => Math.min(min, Number(r.price_per_night) || Infinity),
    Infinity
  );
}

/**
 * Whether a hotel has *no* rooms available for any date.
 * Matches the §9 "no rooms" test scenario.
 */
export function hotelHasNoRooms(hotel) {
  if (!hotel || !Array.isArray(hotel.rooms) || hotel.rooms.length === 0) {
    return true;
  }
  return hotel.rooms.every((r) => !Array.isArray(r.available_dates) || r.available_dates.length === 0);
}

/**
 * Cancellation-policy badge text derived from the free-text cancellation field.
 * Returns { short, kind } where kind is 'free' | 'nonref' | 'unknown'.
 * Matches the §5.1 vocabulary table.
 */
export function cancellationBadge(cancellation) {
  if (!cancellation) return { short: 'Cancellation policy applies', kind: 'unknown' };
  const c = String(cancellation).toLowerCase();
  if (c.startsWith('non-refundable')) {
    return { short: 'Non-refundable', kind: 'nonref' };
  }
  if (c.includes('24 hours')) return { short: 'Free cancellation · 24h', kind: 'free' };
  if (c.includes('48 hours')) return { short: 'Free cancellation · 48h', kind: 'free' };
  if (c.includes('72 hours')) return { short: 'Free cancellation · 72h', kind: 'free' };
  if (c.includes('7 days'))   return { short: 'Free cancellation · 7 days', kind: 'free' };
  if (c.includes('free'))     return { short: 'Free cancellation', kind: 'free' };
  return { short: 'Cancellation policy applies', kind: 'unknown' };
}

/**
 * Build the filter criteria object consumed by `filterHotels`.
 * Empty string for city / null for minStars means "no constraint".
 *
 * Available fields (all optional):
 *   city:         string ('' = any city)
 *   minStars:     number 1-5 | null  (minimum star rating, e.g. 4 = '4 stars and up')
 *   minPrice:     number | null      (cheapest-room anchor)
 *   maxPrice:     number | null
 *   search:       string             (matches name / city / description)
 *   minRating:    number 0–5 | null  (filter by overall_rating)
 *   freeCancel:   boolean            (if true, only hotels with a free-cancel policy)
 *   amenities:    string[]           (must contain ALL of these amenities)
 *   roomBedType:  string | null      (e.g. 'King', 'Queen' — hotel must have at least one such room)
 *   sort:         string             ('recommended' | 'price-asc' | 'price-desc' | 'rating-desc' | 'stars-desc')
 */
export function buildFilters({
  city = '',
  minStars = null,
  minPrice = null,
  maxPrice = null,
  search = '',
  minRating = null,
  freeCancel = false,
  amenities = [],
  roomBedType = null,
  sort = 'recommended',
} = {}) {
  return {
    city, minStars, minPrice, maxPrice, search,
    minRating, freeCancel, amenities, roomBedType, sort,
  };
}

/**
 * Sort options for the dashboard. Each entry has a value + a label.
 */
export const SORT_OPTIONS = [
  { value: 'recommended',  label: 'Recommended' },
  { value: 'price-asc',    label: 'Price · Low to high' },
  { value: 'price-desc',   label: 'Price · High to low' },
  { value: 'rating-desc',  label: 'Guest rating · High to low' },
  { value: 'stars-desc',   label: 'Star rating · High to low' },
];

/**
 * Apply the filter criteria to the full hotel list, then sort the result.
 *  - city:        exact match (case-insensitive). '' = any.
 *  - minStars:    hotel.star_rating must be >= minStars (e.g. 4 = '4★ and up').
 *  - minPrice/maxPrice: applied to the hotel's cheapest room.
 *  - search:      case-insensitive substring on hotel name, city, or description.
 *  - minRating:   lower-bound on overall_rating.
 *  - freeCancel:  if true, hotel must have a free-cancellation policy.
 *  - amenities:   hotel must include every string in this list.
 *  - roomBedType: hotel must have at least one room with this bed_type.
 *  - sort:        ordering of the result set.
 *
 * Hotels with no rooms are NOT excluded by price filtering — their price is
 * treated as 0 for range checks so the filter still passes them through.
 */
export function filterHotels(hotels, {
  city = '',
  minStars = null,
  minPrice = null,
  maxPrice = null,
  search = '',
  minRating = null,
  freeCancel = false,
  amenities = [],
  roomBedType = null,
  sort = 'recommended',
} = {}) {
  const q = String(search || '').trim().toLowerCase();
  const amenitySet = Array.isArray(amenities) && amenities.length > 0 ? new Set(amenities) : null;

  const filtered = hotels.filter((hotel) => {
    // City filter — exact, case-insensitive
    if (city && String(hotel.address.city).toLowerCase() !== String(city).toLowerCase()) {
      return false;
    }
    // Star filter — minimum star rating. A hotel passes if its rating is >= minStars.
    if (minStars != null && Number(hotel.star_rating || 0) < Number(minStars)) return false;
    // Price filter — compare against the cheapest room
    const p = cheapestRoomPrice(hotel);
    const priceValue = p == null ? 0 : p;
    if (minPrice != null && priceValue < Number(minPrice)) return false;
    if (maxPrice != null && priceValue > Number(maxPrice)) return false;
    // Guest-rating filter
    if (minRating != null && Number(hotel.overall_rating || 0) < Number(minRating)) return false;
    // Free-cancellation filter
    if (freeCancel) {
      const c = String(hotel.policies?.cancellation || '').toLowerCase();
      if (!c.startsWith('free')) return false;
    }
    // Amenity filter (ALL of the requested amenities must be present)
    if (amenitySet) {
      const have = new Set(hotel.amenities || []);
      for (const a of amenitySet) if (!have.has(a)) return false;
    }
    // Bed-type filter (at least one room must match)
    if (roomBedType) {
      const ok = (hotel.rooms || []).some((r) => r.bed_type === roomBedType);
      if (!ok) return false;
    }
    // Free-text search across name, city, and description
    if (q) {
      const haystack = `${hotel.name} ${hotel.address.city} ${hotel.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Sort the filtered set. We return a new array to keep the store immutable.
  return sortHotels(filtered, sort);
}

/**
 * Sort hotels in-place-free style. Returns a new array.
 * 'recommended' = highest rated first, then cheapest, then most reviewed.
 */
export function sortHotels(hotels, sort = 'recommended') {
  const arr = hotels.slice();
  switch (sort) {
    case 'price-asc':
      arr.sort((a, b) => (cheapestRoomPrice(a) ?? Infinity) - (cheapestRoomPrice(b) ?? Infinity));
      break;
    case 'price-desc':
      arr.sort((a, b) => (cheapestRoomPrice(b) ?? -Infinity) - (cheapestRoomPrice(a) ?? -Infinity));
      break;
    case 'rating-desc':
      arr.sort((a, b) => Number(b.overall_rating || 0) - Number(a.overall_rating || 0));
      break;
    case 'stars-desc':
      arr.sort((a, b) => Number(b.star_rating || 0) - Number(a.star_rating || 0));
      break;
    case 'recommended':
    default:
      arr.sort((a, b) => {
        const r = Number(b.overall_rating || 0) - Number(a.overall_rating || 0);
        if (r !== 0) return r;
        const p = (cheapestRoomPrice(a) ?? Infinity) - (cheapestRoomPrice(b) ?? Infinity);
        if (p !== 0) return p;
        return Number(b.review_count || 0) - Number(a.review_count || 0);
      });
      break;
  }
  return arr;
}

/**
 * Count the number of distinct active filter fields (used for the active-filter
 * chip badge in the dashboard). A field counts as "active" when it has a
 * non-default value.
 */
export function activeFilterCount(filters, defaults) {
  if (!filters) return 0;
  let n = 0;
  for (const key of Object.keys(defaults)) {
    const a = filters[key];
    const b = defaults[key];
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) { n++; continue; }
      const sa = new Set(a); for (const v of b) if (!sa.has(v)) { n++; break; }
    } else if (a !== b) {
      n++;
    }
  }
  return n;
}

/**
 * Parse an ISO YYYY-MM-DD date string into a UTC midnight Date.
 * We use UTC to avoid DST/timezone drift when computing night counts.
 */
function parseISODate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Iterate every night between checkIn (inclusive) and checkOut (exclusive).
 * Each yielded value is a 'YYYY-MM-DD' string.
 * Returns an empty array if checkOut <= checkIn or either date is invalid.
 */
export function nightsBetween(checkIn, checkOut) {
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);
  if (!start || !end) return [];
  const out = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  for (let t = start.getTime(); t < end.getTime(); t += ONE_DAY_MS) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

/**
 * Is this room available for the entire [checkIn, checkOut) range?
 * A room is available iff every night in the range is in its available_dates.
 * Per §6.1: an empty available_dates array means "no availability at all".
 * A missing checkIn or checkOut returns false (UI should still show a hint).
 */
export function isRoomAvailable(room, checkIn, checkOut) {
  if (!room) return false;
  if (!Array.isArray(room.available_dates) || room.available_dates.length === 0) {
    return false;
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights.length === 0) return false; // missing or invalid dates → not available for filter
  const set = new Set(room.available_dates);
  return nights.every((n) => set.has(n));
}

/**
 * Return only the rooms that are available for [checkIn, checkOut).
 * If either date is missing, returns an empty array (UI shows "please pick dates").
 */
export function availableRooms(hotel, checkIn, checkOut) {
  if (!hotel || !Array.isArray(hotel.rooms)) return [];
  if (!checkIn || !checkOut) return [];
  return hotel.rooms.filter((r) => isRoomAvailable(r, checkIn, checkOut));
}

/**
 * Group a list of amenities into the six buckets documented in §7.
 * Unknown strings are placed in the 'other' bucket.
 */
export const AMENITY_BUCKETS = {
  Connectivity:      ['free Wi-Fi', 'luggage_storage'],
  Wellness:          ['fitness_center', 'spa', 'pool', 'hot_tub', 'public_hot_spring_bath'],
  Dining:            ['restaurant', 'bar', 'free_breakfast', 'traditional_breakfast', 'michelin_restaurant',
                      'rooftop_bar', 'rooftop_wine_bar', 'sky_bar', 'on_site_pub', 'courtyard_cafe',
                      'harbour_restaurant', 'fine_dining_terrace', 'afternoon_tea_lounge', 'vending_galore'],
  'Parking & transit': ['valet_parking', 'free_parking'],
  'Family & pets':   ['pet_friendly', 'bicycle_rentals'],
  'Spaces & extras': ['rooftop_terrace', 'courtyard_lounge', 'beach_access', 'marina_access',
                      'social_lounge', 'gaming_lounge', 'meeting_rooms', 'laundry_service'],
};

/**
 * Bucket a list of amenity strings. Returns an array of
 * { name: string, items: string[] } preserving the order of AMENITY_BUCKETS,
 * with a trailing 'Other' bucket for unknowns.
 */
export function bucketAmenities(amenities = []) {
  // Initialise every known bucket (so iteration order is stable) plus an Other bucket.
  const buckets = {};
  for (const name of Object.keys(AMENITY_BUCKETS)) {
    buckets[name] = [];
  }
  buckets.Other = [];
  for (const a of amenities) {
    let placed = false;
    for (const [name, members] of Object.entries(AMENITY_BUCKETS)) {
      if (members.includes(a)) {
        buckets[name].push(a);
        placed = true;
        break;
      }
    }
    if (!placed) buckets.Other.push(a);
  }
  // Drop empty buckets, preserve defined order, then append Other at the end if non-empty
  const out = [];
  for (const name of Object.keys(AMENITY_BUCKETS)) {
    if (buckets[name].length > 0) out.push({ name, items: buckets[name] });
  }
  if (buckets.Other.length > 0) out.push({ name: 'Other', items: buckets.Other });
  return out;
}

// ----------------------------------------------------------------------------
// React hook — the "store" surface used by components.
// ----------------------------------------------------------------------------

/**
 * Default filter state used when the app first mounts. minStars starts as null
 * (no constraint) so every hotel shows on first paint.
 */
const DEFAULT_FILTERS = buildFilters({
  city: '',
  minStars: null,
  minPrice: MIN_PRICE,
  maxPrice: MAX_PRICE,
  search: '',
  minRating: null,
  freeCancel: false,
  amenities: [],
  roomBedType: null,
  sort: 'recommended',
});

/**
 * useHotels — the app's central store hook.
 *
 * Returns:
 *   - hotels:          the full unfiltered hotel list.
 *   - filtered:        the hotels after applying currentFilters.
 *   - filters:         current filter state object.
 *   - setFilters:      merge-patch the filters (partial update).
 *   - resetFilters:    restore defaults.
 *   - defaultFilters:  the canonical default filter object (for diffing).
 *   - selectedHotel:   the hotel currently shown in the detail view, or null.
 *   - selectHotel:     set the selected hotel (or null to clear).
 *   - checkIn / checkOut / setDates: booking-bar state used by RoomAvailability.
 *   - meta:            static helpers (CITIES, STAR_RATINGS, AMENITIES, BED_TYPES,
 *                      MIN_PRICE, MAX_PRICE, SORT_OPTIONS).
 */
export function useHotels() {
  // The hotel list itself is immutable for the lifetime of the app —
  // it's loaded from JSON once at module load above. We still keep it in state
  // so the hook surface is consistent if we ever swap in a fetch.
  const [hotels] = useState(() => hotelsData);

  // Filter state — a single object so partial updates are easy.
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  // Selection state — null means we're on the dashboard.
  const [selectedHotel, setSelectedHotel] = useState(null);

  // Booking-bar dates. Stored as 'YYYY-MM-DD' strings or '' when unset.
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Memoized filtered list — recomputes only when filters or the underlying data change.
  const filtered = useMemo(() => filterHotels(hotels, filters), [hotels, filters]);

  /**
   * Patch one or more filter fields.
   * Accepts a partial object; missing keys keep their current values.
   */
  const setFilters = useCallback((patch) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Restore the default filter set. */
  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  /** Select a hotel by id, or pass null to return to the dashboard. */
  const selectHotel = useCallback((hotel) => setSelectedHotel(hotel ?? null), []);

  /**
   * Update one or both dates.
   * If checkIn >= checkOut after the patch, checkOut is cleared so the
   * availability filter does not produce a misleading "no rooms" state.
   */
  const setDates = useCallback(({ checkIn: ci, checkOut: co } = {}) => {
    setCheckIn((prevIn) => {
      setCheckOut((prevOut) => {
        const nextIn = ci !== undefined ? ci : prevIn;
        const nextOut = co !== undefined ? co : prevOut;
        if (nextIn && nextOut && parseISODate(nextIn) && parseISODate(nextOut)
            && parseISODate(nextIn) >= parseISODate(nextOut)) {
          return ''; // invalid range — drop check-out
        }
        return nextOut;
      });
      return ci !== undefined ? ci : prevIn;
    });
  }, []);

  return {
    hotels,
    filtered,
    filters,
    setFilters,
    resetFilters,
    defaultFilters: DEFAULT_FILTERS,
    selectedHotel,
    selectHotel,
    checkIn,
    checkOut,
    setDates,
    meta: {
      CITIES,
      STAR_RATINGS,
      MIN_STAR,
      MAX_STAR,
      AMENITIES,
      BED_TYPES,
      MIN_PRICE,
      MAX_PRICE,
      SORT_OPTIONS,
    },
  };
}

// Default export for convenience (mirrors the named export).
export default useHotels;