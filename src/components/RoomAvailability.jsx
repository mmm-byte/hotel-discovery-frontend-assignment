/**
 * RoomAvailability.jsx
 * ----------------------------------------------------------------------------
 * Date-aware room-availability section embedded in the hotel detail view.
 *
 * What it renders:
 *   - Check-in and check-out date inputs (HTML5 <input type="date">).
 *   - A small status banner explaining the current filter state
 *     ("no dates set" / "no rooms match" / "showing N of M rooms").
 *   - A list of available rooms, each as a RoomCard with price + amenities.
 *   - The documented empty state when no rooms match the selected dates.
 *
 * Props:
 *   - hotel:           the hotel object (see docs/json-data-contract.md §6).
 *   - checkIn:         'YYYY-MM-DD' string or ''.
 *   - checkOut:        'YYYY-MM-DD' string or ''.
 *   - onChangeDates:   callback ({ checkIn?, checkOut? }) => void.
 */

import { useMemo } from 'react';
import {
  availableRooms,
  formatPrice,
  hotelHasNoRooms,
} from '../store/useHotels';

/**
 * Compute the count of nights for a stay, or null if dates are invalid.
 */
function nightCount(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Compute the stay total for a single room (nights * price_per_night).
 * Returns null if either piece is missing.
 */
function stayTotal(room, checkIn, checkOut) {
  const nights = nightCount(checkIn, checkOut);
  if (nights == null) return null;
  const price = Number(room.price_per_night) || 0;
  return nights * price;
}

/**
 * One room card. Pure presentation — no internal state.
 */
function RoomCard({ room, checkIn, checkOut }) {
  const total = stayTotal(room, checkIn, checkOut);
  const nights = nightCount(checkIn, checkOut);

  return (
    <div className="room-card" data-testid="room-card" data-room-id={room.room_id}>
      <div>
        <h4 className="room-card__name">{room.type}</h4>
        <div className="room-card__meta">
          <span>{room.bed_count}× {room.bed_type} bed</span>
          <span>· Sleeps {room.max_occupancy}</span>
          <span>· {room.square_footage} sq ft</span>
        </div>
        {room.room_amenities && room.room_amenities.length > 0 && (
          <div className="room-card__amenities">
            {room.room_amenities.map((a) => (
              <span key={a} className="badge">{a.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}
      </div>
      <div className="room-card__right">
        <div className="room-card__price">
          ${formatPrice(room.price_per_night)}
          <span className="room-card__price-unit"> / night</span>
        </div>
        {total != null && nights != null && (
          <div className="badge badge--info">
            ${formatPrice(total)} total · {nights} night{nights > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoomAvailability({ hotel, checkIn, checkOut, onChangeDates }) {
  // ---- Derived state ---------------------------------------------------
  // Filter rooms by the selected dates using the pure helper.
  // useMemo so we don't re-filter on every render of the parent.
  const rooms = useMemo(
    () => availableRooms(hotel, checkIn, checkOut),
    [hotel, checkIn, checkOut]
  );

  const noRoomsAtAll = hotelHasNoRooms(hotel);
  const totalRooms = hotel?.rooms?.length ?? 0;
  const nights = nightCount(checkIn, checkOut);

  // ---- Handlers --------------------------------------------------------
  // Each input change forwards a partial update to the parent, which owns
  // the canonical date state.
  const handleCheckInChange = (event) => {
    onChangeDates?.({ checkIn: event.target.value });
  };
  const handleCheckOutChange = (event) => {
    onChangeDates?.({ checkOut: event.target.value });
  };

  // ---- Status banner text ---------------------------------------------
  // Three states:
  //   - No dates set      → "Pick dates to see available rooms."
  //   - Invalid range     → "Check-out must be after check-in."
  //   - Valid dates       → "Showing N of M rooms for these dates."
  let status;
  if (!checkIn || !checkOut) {
    status = 'Pick a check-in and check-out date to see available rooms.';
  } else if (nights == null) {
    status = 'Check-out must be after check-in. Try a longer stay.';
  } else {
    status = `Showing ${rooms.length} of ${totalRooms} room${totalRooms === 1 ? '' : 's'} for your ${nights}-night stay.`;
  }

  return (
    <section className="availability" data-testid="room-availability">
      <header className="availability__head">
        <h3 className="availability__title">Rooms & availability</h3>
      </header>

      {/* Date inputs */}
      <div className="availability__dates">
        <label className="field">
          <span className="field__label">Check-in</span>
          <input
            type="date"
            className="field__control"
            aria-label="Check-in date"
            value={checkIn}
            onChange={handleCheckInChange}
            data-testid="check-in-input"
          />
        </label>
        <label className="field">
          <span className="field__label">Check-out</span>
          <input
            type="date"
            className="field__control"
            aria-label="Check-out date"
            value={checkOut}
            onChange={handleCheckOutChange}
            data-testid="check-out-input"
          />
        </label>
      </div>

      {/* Status / summary banner */}
      <div className="availability__summary" data-testid="availability-summary">
        {status}
      </div>

      {/* Rooms list / empty states */}
      {noRoomsAtAll && checkIn && checkOut && nights != null ? (
        // The hotel has no rooms available for *any* date — show this once the
        // user has actually picked dates so we don't shout at them upfront.
        <div className="empty-state" data-testid="no-rooms-ever">
          <div className="empty-state__icon" aria-hidden="true">🛏</div>
          <p className="empty-state__title">No rooms available for these dates</p>
          <p className="empty-state__hint">
            This property has no rooms in inventory right now. Try a different property
            from the search results.
          </p>
        </div>
      ) : !checkIn || !checkOut ? (
        // The user hasn't picked dates yet — show a friendly hint, not an empty state.
        <div className="empty-state" data-testid="please-pick-dates">
          <div className="empty-state__icon" aria-hidden="true">📅</div>
          <p className="empty-state__title">Pick your dates</p>
          <p className="empty-state__hint">
            We&apos;ll show you which rooms are available for the nights you select.
          </p>
        </div>
      ) : nights == null ? (
        // Invalid range — check-out <= check-in.
        <div className="empty-state" data-testid="invalid-range">
          <div className="empty-state__icon" aria-hidden="true">⚠️</div>
          <p className="empty-state__title">Check-out must be after check-in</p>
          <p className="empty-state__hint">
            Adjust your dates and we&apos;ll show you the available rooms.
          </p>
        </div>
      ) : rooms.length === 0 ? (
        // Dates are valid but no rooms match — the common empty state.
        <div className="empty-state" data-testid="no-rooms-for-dates">
          <div className="empty-state__icon" aria-hidden="true">🛏</div>
          <p className="empty-state__title">No rooms available for these dates</p>
          <p className="empty-state__hint">
            Try a different date range — different nights often have different inventory.
          </p>
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