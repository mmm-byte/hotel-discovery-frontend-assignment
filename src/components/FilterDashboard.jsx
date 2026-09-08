/**
 * FilterDashboard.jsx
 * ----------------------------------------------------------------------------
 * The main browse view. Contains:
 *   1. A filter bar (city dropdown, star chips, price range, free-text search).
 *   2. A live result count + a "Reset filters" button.
 *   3. The hotel grid (HotelCard tiles).
 *   4. An empty state when no hotels match.
 *
 * The component is "controlled": all state lives in the parent (App) via the
 * useHotels hook. This keeps it easy to test in isolation and to coordinate
 * state across the dashboard and detail views.
 *
 * Props:
 *   - hotels:        the full hotel list (for filter option population).
 *   - filtered:      the hotels after applying filters.
 *   - filters:       current filter values.
 *   - meta:          static metadata (CITIES, STAR_RATINGS, MIN_PRICE, MAX_PRICE).
 *   - onChangeFilter: callback to patch a single filter field.
 *   - onReset:       callback to clear all filters.
 *   - onSelect:      callback fired when the user picks a hotel.
 */

import HotelCard from './HotelCard';

/**
 * A small star chip used inside the filter bar to toggle a star rating.
 */
function StarChip({ value, active, onToggle }) {
  return (
    <button
      type="button"
      className={`badge ${active ? 'badge--stars-luxury' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onToggle(value)}
      aria-pressed={active}
      aria-label={`${value} star${value > 1 ? 's' : ''} filter`}
      data-testid={`star-chip-${value}`}
    >
      {'★'.repeat(value)}
    </button>
  );
}

/**
 * A small star row used inside the filter bar's header to summarise the active stars.
 */
function ActiveStarSummary({ stars }) {
  if (!stars) return null;
  return <span className="badge badge--stars-luxury">{stars}★ only</span>;
}

export default function FilterDashboard({
  hotels,
  filtered,
  filters,
  meta,
  onChangeFilter,
  onReset,
  onSelect,
}) {
  const { CITIES, STAR_RATINGS, MIN_PRICE, MAX_PRICE } = meta || {};

  // ---- Handlers -----------------------------------------------------
  // Patch a single filter field; the parent owns the state.
  const handleCityChange = (event) => onChangeFilter?.({ city: event.target.value });
  const handleSearchChange = (event) => onChangeFilter?.({ search: event.target.value });

  // The star filter is single-select in the dashboard (clearer UX than multi-select chips).
  // Clicking an active chip clears the filter; clicking a different chip switches to it.
  const handleStarToggle = (value) => {
    onChangeFilter?.({ stars: filters.stars === value ? null : value });
  };

  // Price range — two numeric inputs. We only update max when it's >= min
  // and min when it's <= max, otherwise we leave the out-of-range input alone
  // so the user can finish typing.
  const handleMinPriceChange = (event) => {
    const v = event.target.value;
    const n = v === '' ? null : Number(v);
    if (n == null || !Number.isFinite(n) || filters.maxPrice == null || n <= filters.maxPrice) {
      onChangeFilter?.({ minPrice: n });
    }
  };
  const handleMaxPriceChange = (event) => {
    const v = event.target.value;
    const n = v === '' ? null : Number(v);
    if (n == null || !Number.isFinite(n) || filters.minPrice == null || n >= filters.minPrice) {
      onChangeFilter?.({ maxPrice: n });
    }
  };

  // True when any filter is "active" (non-default) — used to show the Reset button.
  const filtersActive =
    filters.city !== '' ||
    filters.stars != null ||
    (filters.minPrice != null && filters.minPrice > MIN_PRICE) ||
    (filters.maxPrice != null && filters.maxPrice < MAX_PRICE) ||
    (filters.search && filters.search.trim() !== '');

  return (
    <section aria-label="Hotel discovery dashboard" data-testid="filter-dashboard">
      {/* ---------------- Filter bar ---------------- */}
      <form
        className="filter-bar"
        role="search"
        onSubmit={(event) => event.preventDefault()} // prevent page reload on Enter
      >
        <h2 className="filter-bar__title">Find your stay</h2>
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
              {CITIES?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* Star rating chips */}
          <div className="field" role="group" aria-labelledby="filter-stars-label">
            <span className="field__label" id="filter-stars-label">Star rating</span>
            <div className="row" style={{ minHeight: 44 }}>
              {STAR_RATINGS?.map((s) => (
                <StarChip
                  key={s}
                  value={s}
                  active={filters.stars === s}
                  onToggle={handleStarToggle}
                />
              ))}
              {filters.stars != null && (
                <ActiveStarSummary stars={filters.stars} />
              )}
            </div>
          </div>

          {/* Price range — min and max in a single field */}
          <div className="field">
            <span className="field__label" id="filter-price-label">Price per night (USD)</span>
            <div className="range-row">
              <input
                className="field__control"
                type="number"
                inputMode="numeric"
                aria-label="Minimum price"
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={10}
                value={filters.minPrice ?? ''}
                placeholder={String(MIN_PRICE ?? 0)}
                onChange={handleMinPriceChange}
                data-testid="filter-min-price"
              />
              <span aria-hidden="true">—</span>
              <input
                className="field__control"
                type="number"
                inputMode="numeric"
                aria-label="Maximum price"
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={10}
                value={filters.maxPrice ?? ''}
                placeholder={String(MAX_PRICE ?? 0)}
                onChange={handleMaxPriceChange}
                data-testid="filter-max-price"
              />
            </div>
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
      </form>

      {/* ---------------- Results meta ---------------- */}
      <div className="results-meta">
        <div className="results-meta__count">
          <strong data-testid="result-count">{filtered.length}</strong>{' '}
          of {hotels.length} hotels
        </div>
        {filtersActive && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onReset}
            data-testid="reset-filters"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* ---------------- Results grid or empty state ---------------- */}
      {filtered.length === 0 ? (
        <div className="empty-state" role="status" data-testid="empty-state">
          <div className="empty-state__icon" aria-hidden="true">🔍</div>
          <p className="empty-state__title">No hotels match your filters</p>
          <p className="empty-state__hint">
            Try widening your price range, removing the star rating, or clearing the search box.
          </p>
          {filtersActive && (
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: '1rem' }}
              onClick={onReset}
            >
              Reset filters
            </button>
          )}
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