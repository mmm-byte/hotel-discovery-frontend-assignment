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
 * A dual-handle price slider. Two stacked <input type="range"> elements
 * with z-index trickery so both handles are visible and draggable.
 */
function PriceSlider({ min, max, minValue, maxValue, onChange }) {
  // Clamp helpers — keep the two handles from crossing.
  const updateMin = (v) => {
    const n = Math.min(Number(v), maxValue);
    onChange({ minPrice: n });
  };
  const updateMax = (v) => {
    const n = Math.max(Number(v), minValue);
    onChange({ maxPrice: n });
  };

  // The lower thumb needs higher z-index when it reaches the max so it
  // remains draggable. We approximate with a constant; good enough for UX.
  return (
    <div className="slider" data-testid="price-slider">
      <div className="slider__track" />
      <div
        className="slider__range"
        style={{
          left: `${((minValue - min) / (max - min)) * 100}%`,
          right: `${100 - ((maxValue - min) / (max - min)) * 100}%`,
        }}
      />
      <input
        className="slider__input"
        type="range"
        min={min} max={max} step={5}
        value={minValue}
        onChange={(e) => updateMin(e.target.value)}
        aria-label="Minimum price"
        data-testid="filter-min-price"
      />
      <input
        className="slider__input"
        type="range"
        min={min} max={max} step={5}
        value={maxValue}
        onChange={(e) => updateMax(e.target.value)}
        aria-label="Maximum price"
        data-testid="filter-max-price"
      />
      <div className="slider__labels">
        <span data-testid="filter-min-price-value">${minValue}</span>
        <span data-testid="filter-max-price-value">${maxValue}+</span>
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
  if (filters.stars != null) chips.push({ key: 'stars', label: `${filters.stars}★+` });
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
}) {
  const { CITIES, STAR_RATINGS, AMENITIES, BED_TYPES, MIN_PRICE, MAX_PRICE, SORT_OPTIONS } = meta || {};
  const activeCount = useMemo(
    () => activeFilterCount(filters, defaultFilters || {}),
    [filters, defaultFilters]
  );

  // Local state: which amenity group is "open" (collapsible multi-select).
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const VISIBLE_AMENITIES = 8;

  // Handlers ---------------------------------------------------------------
  const handleCityChange = (e) => onChangeFilter?.({ city: e.target.value });
  const handleSearchChange = (e) => onChangeFilter?.({ search: e.target.value });
  const handleStarsToggle = (v) => onChangeFilter?.({ stars: filters.stars === v ? null : v });
  const handleRatingChange = (e) => onChangeFilter?.({ minRating: e.target.value === '' ? null : Number(e.target.value) });
  const handleBedTypeChange = (e) => onChangeFilter?.({ roomBedType: e.target.value || null });
  const handleSortChange = (e) => onChangeFilter?.({ sort: e.target.value });
  const handlePriceChange = ({ minPrice, maxPrice }) => onChangeFilter?.({ minPrice, maxPrice });
  const handleFreeCancelToggle = () => onChangeFilter?.({ freeCancel: !filters.freeCancel });
  const handleAmenityToggle = (amenity) => {
    const have = new Set(filters.amenities || []);
    if (have.has(amenity)) have.delete(amenity); else have.add(amenity);
    onChangeFilter?.({ amenities: Array.from(have) });
  };
  const handleRemoveChip = (key) => {
    switch (key) {
      case 'city':         onChangeFilter?.({ city: '' }); break;
      case 'stars':        onChangeFilter?.({ stars: null }); break;
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
            {hotels.length} hand-picked properties across {CITIES?.length || 10} cities. Prices include taxes &amp; fees.
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

          {/* Star rating chips */}
          <div className="field" role="group" aria-labelledby="filter-stars-label">
            <span className="field__label" id="filter-stars-label">Star rating</span>
            <div className="chip-row">
              {STAR_RATINGS?.map((s) => (
                <Chip
                  key={s}
                  active={filters.stars === s}
                  onClick={() => handleStarsToggle(s)}
                  data-testid={`star-chip-${s}`}
                >
                  {'★'.repeat(s)}{' '}{s}★
                </Chip>
              ))}
            </div>
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

          {/* Free-text search */}
          <label className="field">
            <span className="field__label" id="filter-search-label">Search</span>
            <input
              className="field__control"
              type="search"
              aria-labelledby="filter-search-label"
              placeholder="Hotel name, keyword…"
              value={filters.search}
              onChange={handleSearchChange}
              data-testid="filter-search"
            />
          </label>
        </div>

        {/* Price range slider — full width, below the grid */}
        <div className="field" style={{ marginTop: '1rem' }}>
          <span className="field__label" id="filter-price-label">
            Price per night · <span style={{ fontWeight: 500, textTransform: 'none', color: 'var(--c-text-muted)' }}>taxes not included</span>
          </span>
          <PriceSlider
            min={MIN_PRICE}
            max={MAX_PRICE}
            minValue={filters.minPrice ?? MIN_PRICE}
            maxValue={filters.maxPrice ?? MAX_PRICE}
            onChange={handlePriceChange}
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
            />
          ))}
        </div>
      )}
    </section>
  );
}