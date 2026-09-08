/**
 * RoomAvailability.jsx
 * ----------------------------------------------------------------------------
 * Date-aware room-availability section embedded in the hotel detail view.
 *
 * Renders:
 *   - A custom two-month date-range picker (avoids the native <input type="date">
 *     issues that plague React apps — see RoomAvailability.test.jsx for the
 *     regression test that would have caught the original bug).
 *   - A status banner showing the current filter state.
 *   - The available rooms list, each card with nightly rate + total-for-stay.
 *   - Clean empty states for every "no result" branch.
 *
 * Why a custom picker instead of <input type="date">?
 *   Native date inputs don't fire `change` until the value is a *complete* ISO
 *   date. Partial typing silently does nothing. The state can be out of sync
 *   with the visible field. A small custom calendar with onClick handlers is
 *   simpler to test, works on every browser without locale surprises, and
 *   visually integrates with the rest of the design system.
 *
 * Props:
 *   - hotel:           the hotel object (see docs/json-data-contract.md §6).
 *   - checkIn:         'YYYY-MM-DD' string or ''.
 *   - checkOut:        'YYYY-MM-DD' string or ''.
 *   - onChangeDates:   callback ({ checkIn?, checkOut? }) => void.
 */

import { useMemo, useState, useEffect } from 'react';
import {
  availableRooms,
  formatPrice,
  hotelHasNoRooms,
  nightsBetween,
  recommendDateWindows,
} from '../store/useHotels';

// ----------------------------------------------------------------------------
// Date helpers (UTC-based to avoid DST drift, matching the store's contract).
// ----------------------------------------------------------------------------

function toISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromISODate(iso) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function addDays(iso, n) {
  const d = fromISODate(iso);
  if (!d) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

function startOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 1));
}

/**
 * Build the 6×7 grid of dates for a given month.
 * Returns an array of { iso, day, inMonth } entries; inMonth=false means a
 * leading/trailing day from the neighbouring month (greyed out in the UI).
 */
function monthGrid(year, month) {
  const first = startOfMonth(year, month);
  // Week starts Monday (1) to match most international hotel sites.
  // Shift Sunday (0) back one day so the grid starts on Monday.
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(1 - firstWeekday);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    cells.push({
      iso: toISODate(d),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
      isToday: toISODate(d) === toISODate(new Date()),
    });
  }
  return cells;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ----------------------------------------------------------------------------
// Custom calendar — two months side-by-side, range selection, prev/next nav.
// ----------------------------------------------------------------------------

function DateRangePicker({ checkIn, checkOut, onChangeDates, minIso }) {
  // Anchor the leftmost visible month. Defaults to the month of checkIn,
  // or today's month if no checkIn. Initialised once; nav is local state.
  const initialAnchor = useMemo(() => {
    const seed = fromISODate(checkIn) || new Date();
    return new Date(Date.UTC(seed.getUTCFullYear(), seed.getUTCMonth(), 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [anchor, setAnchor] = useState(initialAnchor);

  // Hover preview so the user can see the range they'd commit when they've
  // only set checkIn and are about to click their end date.
  const [hoverIso, setHoverIso] = useState('');
  // Track the pending check-in *within a single click sequence*. When the user
  // picks a start date, the prop may not have updated yet by the time they
  // pick the end date (React batches updates). We track the intermediate
  // check-in here so the second click is treated as a check-out, not a new
  // start. We re-sync from the prop whenever it changes from outside.
  const [pendingIn, setPendingIn] = useState(checkIn);
  useEffect(() => { setPendingIn(checkIn); }, [checkIn]);
  const months = useMemo(() => {
    const a = monthGrid(anchor.getUTCFullYear(), anchor.getUTCMonth());
    const bMonth = anchor.getUTCMonth() + 1;
    const bYear = anchor.getUTCFullYear() + Math.floor(bMonth / 12);
    const b = monthGrid(bYear, bMonth % 12);
    return [
      { year: anchor.getUTCFullYear(), month: anchor.getUTCMonth(), cells: a },
      { year: bYear, month: bMonth % 12, cells: b },
    ];
  }, [anchor]);

  const goPrev = () => {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - 1);
    setAnchor(d);
  };
  const goNext = () => {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() + 1);
    setAnchor(d);
  };

  // Determine which nights are "in range" given the current selection state.
  // - If both checkIn and checkOut are set: range = [checkIn, checkOut)
  // - If only checkIn is set and user is hovering: range = [checkIn, hoverIso)
  // - Otherwise: nothing is highlighted.
  const inRange = useMemo(() => {
    const out = new Set();
    let start, end;
    const activeStart = pendingIn || checkIn;
    const activeEnd = checkOut;
    if (activeStart && activeEnd) {
      start = activeStart; end = activeEnd;
    } else if (activeStart && hoverIso && hoverIso > activeStart) {
      start = activeStart; end = hoverIso;
    } else if (activeStart && hoverIso && hoverIso < activeStart) {
      start = hoverIso; end = activeStart;
    } else {
      return out;
    }
    let cur = start;
    while (cur < end) {
      out.add(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [checkIn, checkOut, pendingIn, hoverIso]);

  /**
   * Click a day cell. Implements the classic two-click range pattern:
   *   1st click → sets check-in (and pendingIn so the 2nd click knows).
   *   2nd click → sets check-out if it's after the pending start, or resets
   *               to a new check-in if the user clicks before the original.
   */
  const handleCellClick = (iso) => {
    const start = pendingIn || checkIn;
    if (!start || (checkIn && checkOut)) {
      onChangeDates?.({ checkIn: iso, checkOut: '' });
      setPendingIn(iso);
    } else if (iso <= start) {
      // Picked a date before the current start — begin a new range.
      onChangeDates?.({ checkIn: iso, checkOut: '' });
      setPendingIn(iso);
    } else {
      onChangeDates?.({ checkIn: start, checkOut: iso });
      setPendingIn('');
    }
  };

  const handleClear = () => {
    onChangeDates?.({ checkIn: '', checkOut: '' });
    setPendingIn('');
  };

  const isDisabled = (iso) => minIso && iso < minIso;
  // The "start" cell can be either the committed check-in or the pending
  // (in-progress) one — pending takes priority so the highlight is instant.
  const isStart = (iso) => iso === (pendingIn || checkIn);
  const isEnd = (iso) => iso === checkOut;

  return (
    <div className="date-range" data-testid="date-range-picker">
      <div className="date-range__head">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={goPrev}
          aria-label="Previous month"
          data-testid="cal-prev"
        >‹</button>
        <span className="spacer" />
        {(checkIn || checkOut) && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleClear}
            data-testid="cal-clear"
          >Clear dates</button>
        )}
        <span className="spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={goNext}
          aria-label="Next month"
          data-testid="cal-next"
        >›</button>
      </div>

      <div className="date-range__months">
        {months.map((m, idx) => (
          <div key={idx} className="cal">
            <h4 className="cal__title">
              {MONTH_NAMES[m.month]} {m.year}
            </h4>
            <div className="cal__weekdays" aria-hidden="true">
              {DAY_NAMES.map((d) => (
                <span key={d} className="cal__weekday">{d}</span>
              ))}
            </div>
            <div className="cal__grid" role="grid">
              {m.cells.map((c) => {
                const disabled = isDisabled(c.iso);
                const inMonth = c.inMonth;
                const isInRange = inRange.has(c.iso);
                const classes = [
                  'cal__cell',
                  inMonth ? '' : 'cal__cell--out',
                  disabled ? 'cal__cell--disabled' : '',
                  isInRange ? 'cal__cell--in-range' : '',
                  isStart(c.iso) ? 'cal__cell--start' : '',
                  isEnd(c.iso) ? 'cal__cell--end' : '',
                  c.isToday ? 'cal__cell--today' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={c.iso}
                    type="button"
                    role="gridcell"
                    className={classes}
                    disabled={disabled || !inMonth}
                    aria-label={c.iso}
                    aria-pressed={isStart(c.iso) || isEnd(c.iso)}
                    aria-disabled={disabled || !inMonth}
                    onClick={() => !disabled && inMonth && handleCellClick(c.iso)}
                    onMouseEnter={() => setHoverIso(c.iso)}
                    onFocus={() => setHoverIso(c.iso)}
                    data-testid={inMonth ? `cal-day-${c.iso}` : `cal-day-out-${c.iso}`}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// One room card — pure presentation, no internal state.
// ----------------------------------------------------------------------------

function RoomCard({ room, checkIn, checkOut }) {
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = nights.length > 0 ? nights.length * Number(room.price_per_night || 0) : null;

  return (
    <div className="room-card" data-testid="room-card" data-room-id={room.room_id}>
      <div className="room-card__media" aria-hidden="true">
        <div className="room-card__media-pattern" />
      </div>
      <div className="room-card__body">
        <h4 className="room-card__name">{room.type}</h4>
        <div className="room-card__meta">
          <span>{room.bed_count}× {room.bed_type} bed</span>
          <span>· Sleeps {room.max_occupancy}</span>
          <span>· {room.square_footage} sq ft</span>
        </div>
        {room.room_amenities && room.room_amenities.length > 0 && (
          <div className="room-card__amenities">
            {room.room_amenities.map((a) => (
              <span key={a} className="room-card__amenity">
                {a.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="room-card__right">
        <div className="room-card__price">
          <span className="room-card__price-currency">$</span>
          <span className="room-card__price-value">{formatPrice(room.price_per_night)}</span>
          <span className="room-card__price-unit">/ night</span>
        </div>
        {total != null && nights.length > 0 && (
          <div className="room-card__total">
            <strong>${formatPrice(total)}</strong> total · {nights.length} night{nights.length > 1 ? 's' : ''}
          </div>
        )}
        <button
          type="button"
          className="btn btn--primary room-card__cta"
          data-testid="select-room"
          aria-label={`Select ${room.type}`}
          onClick={() => {
            // A real booking flow would open a checkout here. For the assignment
            // we surface a confirmation that the selection was registered.
            window.alert(
              `Selected: ${room.type}\n` +
              `${nights.length} night${nights.length > 1 ? 's' : ''} · ` +
              `${checkIn} → ${checkOut}\n` +
              `Total: $${formatPrice(total)}`
            );
          }}
        >
          Select room
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export default function RoomAvailability({ hotel, checkIn, checkOut, onChangeDates }) {
  const rooms = useMemo(
    () => availableRooms(hotel, checkIn, checkOut),
    [hotel, checkIn, checkOut]
  );

  const noRoomsAtAll = hotelHasNoRooms(hotel);
  const totalRooms = hotel?.rooms?.length ?? 0;
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  // Earliest-selectable date is today (so users can't pick a past night).
  const minIso = useMemo(() => {
    const t = new Date();
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')}`;
  }, []);

  // Auto-correct an inverted range: if checkOut <= checkIn, clear it.
  useEffect(() => {
    if (checkIn && checkOut && checkOut <= checkIn) {
      onChangeDates?.({ checkIn, checkOut: '' });
    }
  }, [checkIn, checkOut, onChangeDates]);

  // Build the status banner text for the four meaningful states.
  const status = (() => {
    if (!checkIn || !checkOut) {
      return 'Pick a check-in and check-out date to see available rooms.';
    }
    if (nights.length === 0) {
      return 'Check-out must be after check-in. Try a longer stay.';
    }
    return `Showing ${rooms.length} of ${totalRooms} room${totalRooms === 1 ? '' : 's'} for your ${nights.length}-night stay.`;
  })();

  // Recommend up to 3 nearby date windows when no rooms match the selected
  // stay. We use the same night count as the user's selected stay so the
  // suggestions are drop-in replacements. Only computed when the user has
  // already picked a start date so we don't recommend the past.
  const recommendedWindows = useMemo(() => {
    if (!checkIn || !checkOut || nights.length === 0) return [];
    if (rooms.length > 0) return [];
    return recommendDateWindows(hotel, checkIn, nights.length, 3);
  }, [hotel, checkIn, checkOut, nights.length, rooms.length]);

  // Clicking a suggestion commits it to the parent's date state.
  const applyWindow = (win) => {
    onChangeDates?.({ checkIn: win.checkIn, checkOut: win.checkOut });
  };

  /**
   * Recommended-dates panel. Rendered inside the "no rooms for these dates"
   * and "no rooms ever" empty states when we have at least one suggestion.
   */
  const renderRecommended = () => {
    if (recommendedWindows.length === 0) return null;
    return (
      <div className="recommended-dates" data-testid="recommended-dates">
        <p className="recommended-dates__title">Try one of these available stays:</p>
        <div className="recommended-dates__list">
          {recommendedWindows.map((win) => (
            <button
              key={`${win.checkIn}-${win.checkOut}`}
              type="button"
              className="recommended-dates__chip"
              onClick={() => applyWindow(win)}
              data-testid="recommended-window"
              data-checkin={win.checkIn}
              data-checkout={win.checkOut}
            >
              <span className="recommended-dates__icon" aria-hidden="true">📅</span>
              <span className="recommended-dates__label">{win.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="availability" data-testid="room-availability">
      <header className="availability__head">
        <h3 className="availability__title">Rooms & availability</h3>
        {nights.length > 0 && (
          <span className="badge badge--info">
            {nights.length} night{nights.length > 1 ? 's' : ''} · {checkIn} → {checkOut}
          </span>
        )}
      </header>

      {/* Custom date-range picker (no native <input type="date">). */}
      <DateRangePicker
        checkIn={checkIn}
        checkOut={checkOut}
        onChangeDates={onChangeDates}
        minIso={minIso}
      />

      {/* Status banner */}
      <div className="availability__summary" data-testid="availability-summary">
        {status}
      </div>

      {/* Render the right empty state or the room list. */}
      {noRoomsAtAll && checkIn && checkOut && nights.length > 0 ? (
        <div className="empty-state" data-testid="no-rooms-ever">
          <div className="empty-state__icon" aria-hidden="true">🛏</div>
          <p className="empty-state__title">No rooms available for these dates</p>
          <p className="empty-state__hint">
            This property has no rooms in inventory right now. Try a different property
            from the search results.
          </p>
          {renderRecommended()}
        </div>
      ) : !checkIn || !checkOut ? (
        <div className="empty-state" data-testid="please-pick-dates">
          <div className="empty-state__icon" aria-hidden="true">📅</div>
          <p className="empty-state__title">Pick your dates</p>
          <p className="empty-state__hint">
            We&apos;ll show you which rooms are available for the nights you select.
          </p>
        </div>
      ) : nights.length === 0 ? (
        <div className="empty-state" data-testid="invalid-range">
          <div className="empty-state__icon" aria-hidden="true">⚠️</div>
          <p className="empty-state__title">Check-out must be after check-in</p>
          <p className="empty-state__hint">
            Adjust your dates and we&apos;ll show you the available rooms.
          </p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state" data-testid="no-rooms-for-dates">
          <div className="empty-state__icon" aria-hidden="true">🛏</div>
          <p className="empty-state__title">No rooms available for these dates</p>
          <p className="empty-state__hint">
            Try a different date range — different nights often have different inventory.
          </p>
          {renderRecommended()}
        </div>
      ) : (
        <div className="room-list" data-testid="room-list">
          {rooms.map((room) => (
            <RoomCard
              key={room.room_id}
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          ))}
        </div>
      )}
    </section>
  );
}