/**
 * App.jsx
 * ----------------------------------------------------------------------------
 * The application shell. Wires the useHotels hook to two views:
 *
 *   - When no hotel is selected, render <FilterDashboard />.
 *   - When a hotel is selected, render <HotelDetail />.
 *
 * The selection, filter, and booking-bar date states all live in the hook so
 * that toggling between the two views preserves them (the user keeps their
 * filters and chosen dates when they go back to the dashboard).
 */

import { useHotels } from './store/useHotels';
import FilterDashboard from './components/FilterDashboard';
import HotelDetail from './components/HotelDetail';

export default function App() {
  // Pull every state slot and action from the central hook.
  const {
    hotels,
    filtered,
    filters,
    setFilters,
    resetFilters,
    selectedHotel,
    selectHotel,
    checkIn,
    checkOut,
    setDates,
    meta,
  } = useHotels();

  return (
    <div className="app-shell" data-testid="app-shell">
      {/* -------- Sticky header -------- */}
      <header className="app-header" role="banner">
        <div className="container app-header__inner">
          <a
            href="#"
            className="app-brand"
            onClick={(event) => {
              // Make the brand act as a "go home" affordance.
              event.preventDefault();
              selectHotel(null);
            }}
          >
            <span className="app-brand__mark" aria-hidden="true" />
            Staylume
          </a>
          <span className="spacer" />
          <span className="badge badge--info" aria-live="polite">
            {hotels.length} properties · 10 cities
          </span>
        </div>
      </header>

      {/* -------- Main content -------- */}
      <main className="app-main">
        <div className="container">
          {selectedHotel ? (
            <HotelDetail
              hotel={selectedHotel}
              onBack={() => selectHotel(null)}
              checkIn={checkIn}
              checkOut={checkOut}
              onChangeDates={setDates}
            />
          ) : (
            <FilterDashboard
              hotels={hotels}
              filtered={filtered}
              filters={filters}
              meta={meta}
              onChangeFilter={setFilters}
              onReset={resetFilters}
              onSelect={selectHotel}
            />
          )}
        </div>
      </main>

      {/* -------- Footer -------- */}
      <footer style={{
        padding: '1.5rem 0',
        borderTop: '1px solid var(--c-border)',
        background: 'var(--c-bg)',
        color: 'var(--c-text-subtle)',
        fontSize: 'var(--fs-sm)',
      }}>
        <div className="container row">
          <span>Staylume · Take-home assignment demo</span>
          <span className="spacer" />
          <span>Mock data — no real bookings.</span>
        </div>
      </footer>
    </div>
  );
}