/**
 * HotelCard.jsx
 * ----------------------------------------------------------------------------
 * Compact summary tile for a single hotel in the dashboard grid.
 *
 * Renders: image, name, location, star + rating chips, short description,
 *          "From $X" price anchor, "No rooms" badge when applicable,
 *          and a "View details" CTA.
 *
 * Props:
 *   - hotel:    the hotel object (see docs/json-data-contract.md §2).
 *   - onSelect: callback fired with the hotel object when the user clicks
 *               the card or its CTA. The parent (App) navigates to the detail view.
 */

import {
  formatPrice,
  formatReviewCount,
  starTier,
  ratingTier,
  cheapestRoomPrice,
  hotelHasNoRooms,
  cancellationBadge,
} from '../store/useHotels';

/**
 * StarTier → CSS modifier suffix for the star chip.
 * Kept local because it only affects presentation.
 */
function starTierClass(tier) {
  return `badge--stars-${tier}`;
}

/**
 * Render N filled stars. The seed uses 2-5 stars so we just repeat the glyph.
 */
function StarRow({ count }) {
  const safe = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span aria-label={`${safe} star hotel`} role="img">
      {'★'.repeat(safe)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - safe)}</span>
    </span>
  );
}

/**
 * The HotelCard component. Pure presentation — no internal state.
 */
export default function HotelCard({ hotel, onSelect }) {
  // Defensive: if a bad reference sneaks in, fail silently rather than crash.
  if (!hotel) return null;

  // Derive the price anchor from the cheapest room.
  const fromPrice = cheapestRoomPrice(hotel);

  // Rating tier label (e.g., "Exceptional" for >= 4.7).
  const tier = ratingTier(hotel.overall_rating);

  // Show a "No rooms" badge when the §9 condition holds.
  const noRooms = hotelHasNoRooms(hotel);

  // Cancellation badge text + kind (free / nonref / unknown).
  const cancel = cancellationBadge(hotel.policies?.cancellation);

  // Keyboard activation handler — Enter or Space triggers the same action as click.
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(hotel);
    }
  };

  return (
    <article
      className="hotel-card"
      // Make the whole card keyboard-activatable like a button.
      role="button"
      tabIndex={0}
      aria-label={`${hotel.name} in ${hotel.address.city}, from ${formatPrice(fromPrice)} per night`}
      onClick={() => onSelect?.(hotel)}
      onKeyDown={handleKeyDown}
      data-testid="hotel-card"
      data-hotel-id={hotel.id}
    >
      {/* ----- Hero image area ----- */}
      <div className="hotel-card__media" aria-hidden="true">
        {/* Show the image only if a URL was provided. The seed doesn't ship
            with images, so this stays as the background gradient. */}
        {hotel.imageUrl ? (
          <img src={hotel.imageUrl} alt="" loading="lazy" />
        ) : null}
        {/* "No rooms" badge — sits in the corner of the image area. */}
        {noRooms && (
          <span className="hotel-card__badge hotel-card__badge--warn">No rooms</span>
        )}
      </div>

      {/* ----- Body ----- */}
      <div className="hotel-card__body">
        <h3 className="hotel-card__title">{hotel.name}</h3>
        <p className="hotel-card__location">
          {hotel.address.city}, {hotel.address.country}
        </p>

        {/* Star + rating chip row. */}
        <div className="hotel-card__meta">
          <span className={`badge ${starTierClass(starTier(hotel.star_rating))}`}>
            <StarRow count={hotel.star_rating} />
          </span>
          <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
            {hotel.overall_rating?.toFixed?.(1) ?? hotel.overall_rating}
            {tier.label ? ` · ${tier.label}` : ''}
          </span>
          <span className="badge">{formatReviewCount(hotel.review_count)} reviews</span>
        </div>

        {/* Two-line description preview. */}
        <p className="hotel-card__desc">{hotel.description}</p>

        {/* Cancellation badge + price anchor. */}
        <div className="hotel-card__meta">
          <span className={`badge badge--${cancel.kind}`}>{cancel.short}</span>
        </div>

        {/* Price row + View details CTA. */}
        <div className="hotel-card__price">
          <div>
            <div className="hotel-card__price-label">From</div>
            <div className="hotel-card__price-value">
              {fromPrice != null ? `$${formatPrice(fromPrice)}` : '—'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={(event) => {
              // Stop propagation so the card's own onClick doesn't double-fire.
              event.stopPropagation();
              onSelect?.(hotel);
            }}
          >
            View details
          </button>
        </div>
      </div>
    </article>
  );
}