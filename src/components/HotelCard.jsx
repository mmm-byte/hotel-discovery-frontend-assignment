/**
 * HotelCard.jsx
 * ----------------------------------------------------------------------------
 * Compact summary tile for a single hotel in the dashboard grid.
 *
 * Layout (matches what real booking sites do):
 *   ┌────────────────────────────────────┐
 *   │  [hero photo, fallback gradient]   │
 *   │   "No rooms" badge (if applicable) │
 *   ├────────────────────────────────────┤
 *   │  Hotel name (h3)                   │
 *   │  City, Country                     │
 *   │  ★★★★★  4.8 · Exceptional  1.2k    │
 *   │  2-line description …              │
 *   │  Free cancellation · 24h          │
 *   │  ─────────────────────────────────│
 *   │  From          [ View details → ] │
 *   │  $199                            │
 *   └────────────────────────────────────┘
 *
 * Visual rules:
 *   - If the hotel has no rooms, the entire card is dimmed (opacity 0.65) and
 *     the CTA changes to "View property" to set the right expectation.
 *   - The price is the largest text on the card and lives at the bottom-right
 *     next to the CTA — the same hierarchy Booking/Expedia use.
 *   - The hero image uses a real per-city Unsplash photo; if it fails to load
 *     we fall back to a city-specific gradient.
 *
 * Props:
 *   - hotel:    the hotel object (see docs/json-data-contract.md §2).
 *   - onSelect: callback fired with the hotel object when the user clicks
 *               the card or its CTA. The parent (App) navigates to the detail view.
 */

import { useState } from 'react';
import {
  formatPrice,
  formatReviewCount,
  ratingTier,
  cheapestRoomPrice,
  hotelHasNoRooms,
  cancellationBadge,
} from '../store/useHotels';
import { cardImageUrl, cityGradient } from '../assets/images';

/**
 * Render N filled stars with the remaining (5-N) shown at 25% opacity.
 */
function StarRow({ count }) {
  const safe = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span className="stars" aria-label={`${safe} star hotel`} role="img">
      <span className="stars__filled">{'★'.repeat(safe)}</span>
      <span className="stars__empty">{'★'.repeat(5 - safe)}</span>
    </span>
  );
}

/**
 * The HotelCard component. Pure presentation — no internal state except the
 * image-error fallback (which is a one-way switch).
 */
export default function HotelCard({ hotel, onSelect }) {
  // Hooks must come before any early return. The image-error state is safe to
  // declare even when `hotel` is null; we just don't render anything below.
  const [imgFailed, setImgFailed] = useState(false);

  // Defensive: if a bad reference sneaks in, fail silently rather than crash.
  if (!hotel) return null;

  const fromPrice = cheapestRoomPrice(hotel);
  const tier = ratingTier(hotel.overall_rating);
  const noRooms = hotelHasNoRooms(hotel);
  const cancel = cancellationBadge(hotel.policies?.cancellation);

  // Pre-compute the image URL + gradient fallback so the media always has a
  // background even before <img> loads.
  const imgUrl = cardImageUrl(hotel);
  const [gradientStart, gradientEnd] = cityGradient(hotel.address.city);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(hotel);
    }
  };

  const className = `hotel-card ${noRooms ? 'hotel-card--sold-out' : ''}`;

  return (
    <article
      className={className}
      role="button"
      tabIndex={0}
      aria-label={`${hotel.name} in ${hotel.address.city}, from $${formatPrice(fromPrice)} per night${noRooms ? ' — no rooms available' : ''}`}
      onClick={() => onSelect?.(hotel)}
      onKeyDown={handleKeyDown}
      data-testid="hotel-card"
      data-hotel-id={hotel.id}
    >
      {/* ----- Hero image area ----- */}
      <div
        className="hotel-card__media"
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
        }}
        aria-hidden="true"
      >
        {imgUrl && !imgFailed ? (
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : null}
        {noRooms && (
          <span className="hotel-card__badge hotel-card__badge--warn">No rooms</span>
        )}
      </div>

      {/* ----- Body ----- */}
      <div className="hotel-card__body">
        <div>
          <h3 className="hotel-card__title">{hotel.name}</h3>
          <p className="hotel-card__location">
            {hotel.address.city}, {hotel.address.country}
          </p>
        </div>

        {/* Star + rating + reviews */}
        <div className="hotel-card__meta">
          <span className="badge badge--stars">
            <StarRow count={hotel.star_rating} />
          </span>
          <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
            <strong>{hotel.overall_rating?.toFixed?.(1) ?? hotel.overall_rating}</strong>
            {tier.label ? <span> · {tier.label}</span> : null}
          </span>
          <span className="badge">{formatReviewCount(hotel.review_count)} reviews</span>
        </div>

        {/* Two-line description preview. */}
        <p className="hotel-card__desc">{hotel.description}</p>

        {/* Cancellation badge */}
        <div className="hotel-card__canc">
          <span className={`badge badge--${cancel.kind}`}>{cancel.short}</span>
        </div>

        {/* Price + CTA row — price is the visual anchor. */}
        <div className="hotel-card__price">
          <div className="hotel-card__price-meta">
            <span className="hotel-card__price-label">From</span>
            <span className="hotel-card__price-value">
              ${formatPrice(fromPrice)}
            </span>
            <span className="hotel-card__price-unit"> / night</span>
          </div>
          <button
            type="button"
            className="btn btn--primary hotel-card__cta"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(hotel);
            }}
          >
            {noRooms ? 'View property' : 'View details'} →
          </button>
        </div>
      </div>
    </article>
  );
}