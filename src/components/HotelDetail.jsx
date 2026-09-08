/**
 * HotelDetail.jsx
 * ----------------------------------------------------------------------------
 * Full-property view shown when a hotel is selected from the dashboard.
 *
 * Sections:
 *   - Hero (city photo with overlaid name/rating chips).
 *   - Sticky booking summary bar (visible on scroll) — name, rating, price,
 *     and a "Check availability" anchor that scrolls to the room section.
 *   - Description.
 *   - Amenities (icon-led chips, bucketed by category).
 *   - Policies (check-in/out, cancellation).
 *   - Contact info (de-emphasized; small icon row).
 *   - RoomAvailability (custom date-range picker + filtered room list).
 *
 * Props:
 *   - hotel:           the hotel object (see docs/json-data-contract.md §2).
 *   - onBack:          callback to clear the selection and return to the dashboard.
 *   - checkIn:         'YYYY-MM-DD' string or ''.
 *   - checkOut:        'YYYY-MM-DD' string or ''.
 *   - onChangeDates:   callback to update one or both dates.
 */

import { useEffect, useState } from 'react';
import {
  formatPrice,
  formatReviewCount,
  ratingTier,
  cheapestRoomPrice,
  cancellationBadge,
  bucketAmenities,
} from '../store/useHotels';
import { heroImageUrl, cityGradient } from '../assets/images';
import { amenityIcon } from './amenityIcons';
import RoomAvailability from './RoomAvailability';

/**
 * Render an amenity chip with a category-specific icon glyph.
 */
function AmenityChip({ label }) {
  const { glyph, label: nice } = amenityIcon(label);
  return (
    <span className="amenity-chip">
      <span className="amenity-chip__icon" aria-hidden="true">{glyph}</span>
      <span className="amenity-chip__label">{nice}</span>
    </span>
  );
}

/**
 * Render an amenity bucket.
 */
function AmenityBucket({ name, items }) {
  return (
    <div className="amenity-bucket" style={{ marginBottom: '1.25rem' }}>
      <h4 className="amenity-bucket__name">{name}</h4>
      <div className="amenity-grid">
        {items.map((item) => <AmenityChip key={item} label={item} />)}
      </div>
    </div>
  );
}

export default function HotelDetail({ hotel, onBack, checkIn, checkOut, onChangeDates }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Track scroll position to swap the sticky bar's collapsed/expanded state.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!hotel) return null;

  const fromPrice = cheapestRoomPrice(hotel);
  const tier = ratingTier(hotel.overall_rating);
  const cancel = cancellationBadge(hotel.policies?.cancellation);
  const amenityBuckets = bucketAmenities(hotel.amenities || []);

  const heroUrl = heroImageUrl(hotel);
  const [g1, g2] = cityGradient(hotel.address.city);

  return (
    <article className="detail-page" data-testid="hotel-detail" data-hotel-id={hotel.id}>
      {/* ---------------- Sticky booking bar (always visible) ---------------- */}
      <div className={`booking-bar ${scrolled ? 'booking-bar--scrolled' : ''}`} data-testid="booking-bar">
        <div className="container booking-bar__inner">
          <div className="booking-bar__left">
            <button
              type="button"
              className="btn btn--ghost btn--sm booking-bar__back"
              onClick={onBack}
              data-testid="back-button"
            >
              ← All hotels
            </button>
            <div>
              <div className="booking-bar__name">{hotel.name}</div>
              <div className="booking-bar__sub">
                <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
                  <strong>{hotel.overall_rating?.toFixed?.(1) ?? hotel.overall_rating}</strong>
                  {tier.label ? ` · ${tier.label}` : ''}
                </span>
                <span className="badge">{formatReviewCount(hotel.review_count)} reviews</span>
                <span className="booking-bar__loc">{hotel.address.city}</span>
              </div>
            </div>
          </div>
          <div className="booking-bar__right">
            <div className="booking-bar__price">
              <span className="booking-bar__price-label">From</span>
              <span className="booking-bar__price-value">${formatPrice(fromPrice)}</span>
              <span className="booking-bar__price-unit"> / night</span>
            </div>
            <a
              href="#availability"
              className="btn btn--primary"
              data-testid="check-availability"
            >
              Check availability
            </a>
          </div>
        </div>
      </div>

      {/* ---------------- Hero ---------------- */}
      <div
        className="detail-hero"
        style={{ backgroundImage: `linear-gradient(135deg, ${g1}, ${g2})` }}
      >
        {heroUrl && !imgFailed ? (
          <img
            src={heroUrl}
            alt={`${hotel.name} — ${hotel.address.city}`}
            onError={() => setImgFailed(true)}
          />
        ) : null}
      </div>

      {/* ---------------- Body ---------------- */}
      <div className="detail-body">
        <header className="detail-body__header">
          <h1 className="detail-body__title">{hotel.name}</h1>
          <p className="detail-body__location">
            {hotel.address.street}, {hotel.address.city}, {hotel.address.state}{' '}
            {hotel.address.zip_code}, {hotel.address.country}
          </p>
          <div className="hotel-card__meta">
            <span className="badge badge--stars">
              {'★'.repeat(hotel.star_rating)} hotel
            </span>
            <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
              <strong>{hotel.overall_rating?.toFixed?.(1) ?? hotel.overall_rating}</strong>
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

        {/* Amenities (icon-led) */}
        {amenityBuckets.length > 0 && (
          <section className="detail-section" data-testid="amenities-section">
            <h3>Amenities</h3>
            {amenityBuckets.map((bucket) => (
              <AmenityBucket key={bucket.name} {...bucket} />
            ))}
          </section>
        )}

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
          </div>
        </section>

        {/* Contact info — de-emphasized icon row */}
        {(hotel.contact?.phone || hotel.contact?.email) && (
          <section className="detail-section detail-section--muted" data-testid="contact-section">
            <h3>Contact this property</h3>
            <div className="contact-row">
              {hotel.contact?.phone && (
                <a href={`tel:${hotel.contact.phone}`} className="contact-item">
                  <span className="contact-item__icon" aria-hidden="true">📞</span>
                  {hotel.contact.phone}
                </a>
              )}
              {hotel.contact?.email && (
                <a href={`mailto:${hotel.contact.email}`} className="contact-item">
                  <span className="contact-item__icon" aria-hidden="true">✉️</span>
                  {hotel.contact.email}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Rooms & availability — anchor target for the booking-bar CTA */}
        <div id="availability">
          <RoomAvailability
            hotel={hotel}
            checkIn={checkIn}
            checkOut={checkOut}
            onChangeDates={onChangeDates}
          />
        </div>
      </div>
    </article>
  );
}