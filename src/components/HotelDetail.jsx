/**
 * HotelDetail.jsx
 * ----------------------------------------------------------------------------
 * Full-property view shown when a hotel is selected from the dashboard.
 *
 * Sections:
 *   - Back button (returns to the dashboard).
 *   - Hero (image + name + location + key chips).
 *   - Description.
 *   - Policies (check-in/out, cancellation, contact).
 *   - Amenities (bucketed chips).
 *   - RoomAvailability (date picker + filtered room list).
 *
 * Props:
 *   - hotel:           the hotel object (see docs/json-data-contract.md §2).
 *   - onBack:          callback to clear the selection and return to the dashboard.
 *   - checkIn:         'YYYY-MM-DD' string or ''.
 *   - checkOut:        'YYYY-MM-DD' string or ''.
 *   - onChangeDates:   callback to update one or both dates.
 */

import {
  formatPrice,
  formatReviewCount,
  starTier,
  ratingTier,
  cheapestRoomPrice,
  cancellationBadge,
  bucketAmenities,
} from '../store/useHotels';
import RoomAvailability from './RoomAvailability';

/**
 * One amenity chip — visual dot + label, used inside each bucket.
 */
function AmenityChip({ label }) {
  return (
    <span className="amenity-chip">
      <span className="amenity-chip__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Render an amenity bucket (a labelled group of chips).
 */
function AmenityBucket({ name, items }) {
  return (
    <div className="amenity-bucket" style={{ marginBottom: '1rem' }}>
      <h4 style={{
        fontSize: '0.85rem', textTransform: 'uppercase',
        letterSpacing: '0.04em', color: 'var(--c-text-subtle)',
        margin: '0 0 0.5rem',
      }}>
        {name}
      </h4>
      <div className="amenity-grid">
        {items.map((item) => (
          <AmenityChip key={item} label={item} />
        ))}
      </div>
    </div>
  );
}

export default function HotelDetail({ hotel, onBack, checkIn, checkOut, onChangeDates }) {
  // If no hotel is selected, render nothing — the parent owns routing.
  if (!hotel) return null;

  // ---- Derived values ----------------------------------------------------
  const fromPrice = cheapestRoomPrice(hotel);
  const tier = ratingTier(hotel.overall_rating);
  const cancel = cancellationBadge(hotel.policies?.cancellation);
  const amenityBuckets = bucketAmenities(hotel.amenities || []);

  return (
    <article className="detail-page" data-testid="hotel-detail" data-hotel-id={hotel.id}>
      {/* ---------------- Hero ---------------- */}
      <div className="detail-hero">
        {hotel.imageUrl ? (
          <img src={hotel.imageUrl} alt={`${hotel.name} exterior`} />
        ) : null}
        <button
          type="button"
          className="detail-hero__back"
          onClick={onBack}
          aria-label="Back to all hotels"
          data-testid="back-button"
        >
          ← Back to results
        </button>
      </div>

      {/* ---------------- Body ---------------- */}
      <div className="detail-body">
        {/* Header */}
        <header className="detail-body__header">
          <h1 className="detail-body__title">{hotel.name}</h1>
          <p className="detail-body__location">
            {hotel.address.street}, {hotel.address.city}, {hotel.address.state}{' '}
            {hotel.address.zip_code}, {hotel.address.country}
          </p>
          <div className="hotel-card__meta">
            <span className={`badge badge--stars-${starTier(hotel.star_rating)}`}>
              {'★'.repeat(hotel.star_rating)} hotel
            </span>
            <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
              {hotel.overall_rating?.toFixed?.(1) ?? hotel.overall_rating}
              {tier.label ? ` · ${tier.label}` : ''}
            </span>
            <span className="badge">{formatReviewCount(hotel.review_count)} reviews</span>
            <span className="badge">{`From $${formatPrice(fromPrice)} / night`}</span>
            <span className={`badge badge--${cancel.kind}`}>{cancel.short}</span>
          </div>
        </header>

        {/* Description */}
        <section>
          <p className="detail-body__desc">{hotel.description}</p>
        </section>

        {/* Policies */}
        <section className="detail-section" data-testid="policies-section">
          <h3>Policies</h3>
          <div className="policies-grid">
            <div className="policy-card">
              <div className="policy-card__label">Check-in</div>
              <div className="policy-card__value">{hotel.policies?.check_in_time}</div>
            </div>
            <div className="policy-card">
              <div className="policy-card__label">Check-out</div>
              <div className="policy-card__value">{hotel.policies?.check_out_time}</div>
            </div>
            <div className="policy-card">
              <div className="policy-card__label">Cancellation</div>
              <div className="policy-card__value">{cancel.short}</div>
            </div>
            <div className="policy-card">
              <div className="policy-card__label">Phone</div>
              <div className="policy-card__value">{hotel.contact?.phone}</div>
            </div>
            <div className="policy-card">
              <div className="policy-card__label">Email</div>
              <div className="policy-card__value">{hotel.contact?.email}</div>
            </div>
          </div>
        </section>

        {/* Amenities (only render the section if there are any) */}
        {amenityBuckets.length > 0 && (
          <section className="detail-section" data-testid="amenities-section">
            <h3>Amenities</h3>
            {amenityBuckets.map((bucket) => (
              <AmenityBucket key={bucket.name} {...bucket} />
            ))}
          </section>
        )}

        {/* Room availability — the live date-aware section */}
        <RoomAvailability
          hotel={hotel}
          checkIn={checkIn}
          checkOut={checkOut}
          onChangeDates={onChangeDates}
        />
      </div>
    </article>
  );
}