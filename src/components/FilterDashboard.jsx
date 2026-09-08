/**
 * FilterDashboard.jsx
 * ----------------------------------------------------------------------------
 * The main browse view. Contains:
 *   1. A hero with a brand promise + headline search bar (city + dates + guests).
 *   2. A filter bar with: city, star chips, dual-handle price slider, free-text
 *      search, min guest-rating, free-cancellation toggle, amenity multi-select,
 *      room-bed-type dropdown.
 *   3. A results header with sort dropdown, result count, "Clear all" link,
 *      and an active-filter chip strip ("Showing results for: City: Paris × 2★+ × Free cancel").
 *   4. The hotel grid (HotelCard tiles).
 *   5. An empty state when no hotels match.
 *
 * The component is "controlled": all state lives in the parent (App) via the
 * useHotels hook. This keeps it easy to test in isolation and to coordinate
 * state across the dashboard and detail views.
 *
 * Props:
 *   - hotels:         the full hotel list.
 *   - filtered:       the hotels after applying filters.
 *   - filters:        current filter values.
 *   - defaultFilters: the canonical defaults (used for diff/active-count).
 *   - meta:           static metadata (CITIES, STAR_RATINGS, AMENITIES, BED_TYPES,
 *                     MIN_PRICE, MAX_PRICE, SORT_OPTIONS).
 *   - onChangeFilter: callback to patch a single filter field.
 *   - onReset:        callback to clear all filters.
 *   - onSelect:       callback fired when the user picks a hotel.
 */

import { useMemo, useState } from 'react';
import HotelCard from './HotelCard';
import { activeFilterCount } from '../store/useHotels';

/**
 * A small toggleable chip used inside the filter bar.
 */
function Chip({ active, onClick, children, 'data-testid': testId, ...rest }) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={!!active}
      data-testid={testId}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The classic Booking.com / Expedia star-rating selector.
 *
 * Renders 5 large gold star buttons. Clicking the Nth star sets the filter to
 * "N stars and up" (e.g. clicking 3 keeps hotels with 3, 4, or 5 stars). The
 * currently-active star plus all lower stars are highlighted in gold; the
 * remaining ones are muted. Clicking the same active star clears the filter
 * (back to "all stars"). The selected value is also echoed as a text label
 * so the current state is obvious at a glance.
 *
 *   minStars === null  →  "All stars"        (nothing highlighted)
 *   minStars === 3     →  "3 stars & up"     (3, 4, 5 highlighted)
 */
function StarSelector({ value, onChange, max = 5, testIdPrefix = 'filter-stars' }) {
  const handleClick = (n) => {
    // Toggle: clicking the active star clears the filter.
    onChange(value === n ? null : n);
  };
  return (
    <div className="star-selector" role="radiogroup" aria-label="Minimum star rating" data-testid={`${testIdPrefix}-selector`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const isActive = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`star-selector__star ${isActive ? 'star-selector__star--active' : ''}`}
            onClick={() => handleClick(n)}
            data-testid={`${testIdPrefix}-${n}`}
          >
            ★
          </button>
        );
      })}
      <span className="star-selector__label" data-testid={`${testIdPrefix}-label`}>
        {value == null ? 'All stars' : `${value} stars & up`}
      </span>
    </div>
  );
}

/**
 * Compact two-input date filter for the dashboard. Uses native <input
 * type="date"> elements which work reliably when the user clicks the
 * calendar icon (the broken-typing case from v1 doesn't apply here because
 * the dashboard filter is meant to be picked, not typed).
 *
 * Props:
 *   - checkIn / checkOut: 'YYYY-MM-DD' or ''.
 *   - onChange({ checkIn?, checkOut? }): patches the parent's date state.
 *   - onClear(): called when the user clicks "Clear dates".
 */
function DashboardDateFilter({ checkIn, checkOut, onChange, onClear }) {
  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(`${checkIn}T00:00:00Z`).getTime();
    const b = new Date(`${checkOut}T00:00:00Z`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
  })();
  return (
    <div className="dashboard-dates" data-testid="dashboard-date-filter">
      <span className="dashboard-dates__icon" aria-hidden="true">📅</span>
      <div className="dashboard-dates__inputs">
        <label className="dashboard-dates__field">
          <span className="dashboard-dates__label">Check-in</span>
          <input
            type="date"
            className="field__control"
            value={checkIn}
            onChange={(e) => onChange?.({ checkIn: e.target.value })}
            data-testid="dashboard-checkin"
          />
        </label>
        <span className="dashboard-dates__sep" aria-hidden="true">→</span>
        <label className="dashboard-dates__field">
          <span className="dashboard-dates__label">Check-out</span>
          <input
            type="date"
            className="field__control"
            value={checkOut}
            onChange={(e) => onChange?.({ checkOut: e.target.value })}
            data-testid="dashboard-checkout"
          />
        </label>
        {(checkIn || checkOut) && (
          <span className="dashboard-dates__nights" data-testid="dashboard-nights">
            {nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Invalid range'}
          </span>
        )}
      </div>
      {(checkIn || checkOut) && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onClear}
          data-testid="dashboard-dates-clear"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * A generic dual-handle range slider used for both price and star-rating.
 *
 * The component renders two stacked <input type="range"> elements with
 * z-index/pointer-events trickery so both thumbs are draggable. The thumbs
 * are clamped to never cross each other.
 *
 * Props:
 *   - min, max:   the absolute bounds (e.g. 1-5 for stars, 75-590 for price).
 *   - step:       snap step (default 1).
 *   - minValue, maxValue: the current range.
 *   - onChange({ min, max }): invoked on every drag tick.
 *   - format(v):  pretty-print the value for the label (default: v).
 *   - testIdPrefix: prefix for data-testid on inputs (e.g. "filter-price").
 *   - theme:      'price' (default) or 'gold' for star ratings.
 *   - minLabel / maxLabel: suffix appended to the right-side label (e.g. '+').
 */
function DualSlider({
  min, max, step = 1,
  minValue, maxValue,
  onChange,
  format = (v) => v,
  testIdPrefix,
  theme = 'price',
  minSuffix = '',
  maxSuffix = '',
}) {
  const updateMin = (v) => {
    const n = Math.min(Number(v), maxValue);
    onChange({ min: n, max: maxValue });
  };
  const updateMax = (v) => {
    const n = Math.max(Number(v), minValue);
    onChange({ min: minValue, max: n });
  };
  const range = max - min || 1;
  return (
    <div className={`slider slider--${theme}`} data-testid={`${testIdPrefix}-slider`}>
      <div className="slider__track" />
      <div
        className="slider__range"
        style={{
          left: `${((minValue - min) / range) * 100}%`,
          right: `${100 - ((maxValue - min) / range) * 100}%`,
        }}
      />
      <input
        className="slider__input"
        type="range"
        min={min} max={max} step={step}
        value={minValue}
        onChange={(e) => updateMin(e.target.value)}
        aria-label={`Minimum ${testIdPrefix}`}
        data-testid={`${testIdPrefix}-min`}
      />
      <input
        className="slider__input"
        type="range"
        min={min} max={max} step={step}
        value={maxValue}
        onChange={(e) => updateMax(e.target.value)}
        aria-label={`Maximum ${testIdPrefix}`}
        data-testid={`${testIdPrefix}-max`}
      />
      <div className="slider__labels">
        <span data-testid={`${testIdPrefix}-min-value`}>
          {format(minValue)}{minSuffix}
        </span>
        <span data-testid={`${testIdPrefix}-max-value`}>
          {format(maxValue)}{maxSuffix}
        </span>
      </div>
    </div>
  );
}

/**
 * Build a list of "active filter chips" (small labels that show which
 * filters are currently restricting the result set).
 */
function ActiveFilterChips({ filters, defaults, onRemove, onReset }) {
  const chips = [];
  if (filters.city) chips.push({ key: 'city', label: `City: ${filters.city}` });
  if (filters.minStars != null) chips.push({ key: 'minStars', label: `${filters.minStars}★ & up` });
  if (filters.minRating != null) chips.push({ key: 'minRating', label: `Rated ${filters.minRating}+` });
  if (filters.freeCancel) chips.push({ key: 'freeCancel', label: 'Free cancellation' });
  if (filters.amenities && filters.amenities.length > 0) {
    chips.push({ key: 'amenities', label: `${filters.amenities.length} amenit${filters.amenities.length === 1 ? 'y' : 'ies'}` });
  }
  if (filters.roomBedType) chips.push({ key: 'roomBedType', label: `${filters.roomBedType} bed` });
  if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”` });
  if (filters.minPrice != null && filters.minPrice > defaults.minPrice) {
    chips.push({ key: 'minPrice', label: `≥ $${filters.minPrice}` });
  }
  if (filters.maxPrice != null && filters.maxPrice < defaults.maxPrice) {
    chips.push({ key: 'maxPrice', label: `≤ $${filters.maxPrice}` });
  }
  if (chips.length === 0) return null;
  return (
    <div className="active-chips" data-testid="active-chips">
      <span className="active-chips__label">Filtering by:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className="active-chip"
          onClick={() => onRemove(c.key)}
          data-testid={`active-chip-${c.key}`}
          aria-label={`Remove filter: ${c.label}`}
        >
          {c.label} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        className="active-chips__clear"
        onClick={onReset}
        data-testid="clear-all"
      >
        Clear all
      </button>
    </div>
  );
}

export default function FilterDashboard({
  hotels,
  filtered,
  filters,
  defaultFilters,
  meta,
  onChangeFilter,
  onReset,
  onSelect,
  checkIn = '',
  checkOut = '',
  onChangeDates = null,
}) {
  const { CITIES, AMENITIES, BED_TYPES, MIN_PRICE, MAX_PRICE, MAX_STAR, SORT_OPTIONS } = meta || {};
  const activeCount = useMemo(
    () => activeFilterCount(filters, defaultFilters || {}),
    [filters, defaultFilters]
  );

  // Local state: which amenity group is "open" (collapsible multi-select).
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const VISIBLE_AMENITIES = 8;

  // Handlers ---------------------------------------------------------------
  const handleCityChange = (e) => onChangeFilter?.({ city: e.target.value });
  const handleStarsChange = (n) => onChangeFilter?.({ minStars: n });
  const handleRatingChange = (e) => onChangeFilter?.({ minRating: e.target.value === '' ? null : Number(e.target.value) });
  const handleBedTypeChange = (e) => onChangeFilter?.({ roomBedType: e.target.value || null });
  const handleSortChange = (e) => onChangeFilter?.({ sort: e.target.value });
  const handlePriceChange = ({ min, max }) => onChangeFilter?.({ minPrice: min, maxPrice: max });
  const handleFreeCancelToggle = () => onChangeFilter?.({ freeCancel: !filters.freeCancel });
  const handleAmenityToggle = (amenity) => {
    const have = new Set(filters.amenities || []);
    if (have.has(amenity)) have.delete(amenity); else have.add(amenity);
    onChangeFilter?.({ amenities: Array.from(have) });
  };
  const handleRemoveChip = (key) => {
    switch (key) {
      case 'city':         onChangeFilter?.({ city: '' }); break;
      case 'minStars':     onChangeFilter?.({ minStars: null }); break;
      case 'minRating':    onChangeFilter?.({ minRating: null }); break;
      case 'freeCancel':   onChangeFilter?.({ freeCancel: false }); break;
      case 'amenities':    onChangeFilter?.({ amenities: [] }); break;
      case 'roomBedType':  onChangeFilter?.({ roomBedType: null }); break;
      case 'search':       onChangeFilter?.({ search: '' }); break;
      case 'minPrice':     onChangeFilter?.({ minPrice: MIN_PRICE }); break;
      case 'maxPrice':     onChangeFilter?.({ maxPrice: MAX_PRICE }); break;
      default: break;
    }
  };

  return (
    <section aria-label="Hotel discovery dashboard" data-testid="filter-dashboard">
      {/* ---------------- Hero / search bar ---------------- */}
      <div className="hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="hero__content">
          <h1 className="hero__title">Find your next stay</h1>
          <p className="hero__subtitle">
            {hotels.length} {hotels.length === 1 ? 'property' : 'properties'} ready to discover. Prices include taxes &amp; fees.
          </p>
        </div>
      </div>

      {/* ---------------- Filter bar ---------------- */}
      <form
        className="filter-bar"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="filter-bar__title-row">
          <h2 className="filter-bar__title">Refine your results</h2>
          {activeCount > 0 && (
            <span className="filter-bar__active" data-testid="active-count">
              {activeCount} active filter{activeCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="filter-bar__grid">
          {/* City dropdown */}
          <label className="field">
            <span className="field__label" id="filter-city-label">City</span>
            <select
              className="field__control"
              aria-labelledby="filter-city-label"
              value={filters.city}
              onChange={handleCityChange}
              data-testid="filter-city"
            >
              <option value="">All cities</option>
              {CITIES?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Star rating selector — classic Booking.com 5-star clickable row */}
          <div className="field" role="group" aria-labelledby="filter-stars-label">
            <span className="field__label" id="filter-stars-label">Star rating</span>
            <StarSelector
              value={filters.minStars}
              onChange={handleStarsChange}
              max={MAX_STAR}
            />
          </div>

          {/* Guest rating dropdown */}
          <label className="field">
            <span className="field__label" id="filter-rating-label">Guest rating</span>
            <select
              className="field__control"
              aria-labelledby="filter-rating-label"
              value={filters.minRating ?? ''}
              onChange={handleRatingChange}
              data-testid="filter-rating"
            >
              <option value="">Any</option>
              <option value="4.7">Exceptional · 4.7+</option>
              <option value="4.5">Excellent · 4.5+</option>
              <option value="4.3">Very good · 4.3+</option>
              <option value="4.0">Good · 4.0+</option>
            </select>
          </label>

          {/* Room bed type */}
          <label className="field">
            <span className="field__label" id="filter-bed-label">Room type</span>
            <select
              className="field__control"
              aria-labelledby="filter-bed-label"
              value={filters.roomBedType || ''}
              onChange={handleBedTypeChange}
              data-testid="filter-bed-type"
            >
              <option value="">Any</option>
              {BED_TYPES?.map((b) => <option key={b} value={b}>{b} bed</option>)}
            </select>
          </label>

          {/* Free cancellation toggle */}
          <div className="field" role="group" aria-labelledby="filter-cancel-label">
            <span className="field__label" id="filter-cancel-label">Cancellation</span>
            <Chip
              active={filters.freeCancel}
              onClick={handleFreeCancelToggle}
              data-testid="filter-free-cancel"
            >
              ✓ Free cancellation only
            </Chip>
          </div>
        </div>

        {/* Dashboard date filter — full width, between the grid and the price slider */}
        <DashboardDateFilter
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={onChangeDates}
          onClear={() => onChangeDates?.({ checkIn: '', checkOut: '' })}
        />

        {/* Price range slider — full width, below the grid */}
        <div className="field" style={{ marginTop: '1rem' }}>
          <span className="field__label" id="filter-price-label">
            Price per night · <span style={{ fontWeight: 500, textTransform: 'none', color: 'var(--c-text-muted)' }}>taxes not included</span>
          </span>
          <DualSlider
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={5}
            minValue={filters.minPrice ?? MIN_PRICE}
            maxValue={filters.maxPrice ?? MAX_PRICE}
            onChange={handlePriceChange}
            format={(v) => `$${v}`}
            maxSuffix="+"
            testIdPrefix="filter-price"
          />
        </div>

        {/* Amenity multi-select */}
        <div className="field" style={{ marginTop: '1rem' }}>
          <span className="field__label" id="filter-amenities-label">Amenities</span>
          <div className="chip-row" role="group" aria-labelledby="filter-amenities-label">
            {AMENITIES?.slice(0, showAllAmenities ? AMENITIES.length : VISIBLE_AMENITIES).map((a) => (
              <Chip
                key={a}
                active={filters.amenities?.includes(a)}
                onClick={() => handleAmenityToggle(a)}
                data-testid={`amenity-chip-${a}`}
              >
                {a.replace(/_/g, ' ')}
              </Chip>
            ))}
            {AMENITIES && AMENITIES.length > VISIBLE_AMENITIES && (
              <button
                type="button"
                className="chip chip--more"
                onClick={() => setShowAllAmenities((v) => !v)}
                data-testid="amenities-toggle"
              >
                {showAllAmenities ? 'Show fewer' : `Show all ${AMENITIES.length}`}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* ---------------- Results header ---------------- */}
      <div className="results-meta">
        <div className="results-meta__count">
          <strong data-testid="result-count">{filtered.length}</strong>{' '}
          of {hotels.length} hotels
        </div>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <span className="field__label" style={{ marginBottom: 0 }}>Sort by</span>
          <select
            className="field__control"
            value={filters.sort}
            onChange={handleSortChange}
            data-testid="filter-sort"
            style={{ minWidth: 220 }}
          >
            {SORT_OPTIONS?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {/* ---------------- Active filter chips ---------------- */}
      <ActiveFilterChips
        filters={filters}
        defaults={defaultFilters}
        onRemove={handleRemoveChip}
        onReset={onReset}
      />

      {/* ---------------- Results grid or empty state ---------------- */}
      {filtered.length === 0 ? (
        <div className="empty-state" role="status" data-testid="empty-state">
          <div className="empty-state__icon" aria-hidden="true">🔍</div>
          <p className="empty-state__title">No hotels match your filters</p>
          <p className="empty-state__hint">
            Try widening your price range, removing the star rating, or clearing the search box.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginTop: '1rem' }}
            onClick={onReset}
            data-testid="empty-reset"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="hotel-grid" data-testid="hotel-grid">
          {filtered.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onSelect={onSelect}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          ))}
        </div>
      )}
    </section>
  );
}