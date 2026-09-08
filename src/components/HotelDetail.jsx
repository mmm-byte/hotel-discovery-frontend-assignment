/**
 * HotelDetail.jsx
 * ----------------------------------------------------------------------------
 * Full-property view shown when a hotel is selected from the dashboard.
 *
 * Layout (production-quality, booking.com-inspired):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Sticky booking bar (name, rating, price, Check avail.)     │   ← scrolls with you
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  Hero image with overlay: hotel name, star rating, location │
 *   │  Save/Wishlist + Share actions                              │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  Property highlights strip (top 4 amenities as big tiles)   │
 *   ├──────────────────────────────┬──────────────────────────────┤
 *   │  About this property         │                              │
 *   │  Description                 │   Sticky reserve card        │
 *   │  Most popular facilities     │   - price summary            │
 *   │  House rules / policies      │   - check-in / check-out     │
 *   │  Guest reviews (summary)     │   - "Reserve" CTA            │
 *   │  Neighborhood (map preview)  │                              │
 *   │  Contact this property       │                              │
 *   │  Availability + rooms        │                              │
 *   └──────────────────────────────┴──────────────────────────────┘
 *
 * Props:
 *   - hotel:           the hotel object (see docs/json-data-contract.md §2).
 *   - onBack:          callback to clear the selection and return to the dashboard.
 *   - checkIn:         'YYYY-MM-DD' string or ''.
 *   - checkOut:        'YYYY-MM-DD' string or ''.
 *   - onChangeDates:   callback to update one or both dates.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  formatPrice,
  formatReviewCount,
  ratingTier,
  cheapestRoomPrice,
  cancellationBadge,
  reviewSummary,
  nightsBetween,
  formatHumanDate,
} from '../store/useHotels';
import { heroImageUrl, cityGradient } from '../assets/images';
import { amenityIcon } from './amenityIcons';
import RoomAvailability from './RoomAvailability';

/* ----------------------------- Small helpers ----------------------------- */

function Stars({ count = 0 }) {
  return (
    <span className="stars" aria-label={`${count}-star hotel`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`stars__glyph ${i < count ? 'is-on' : ''}`} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21s-7.5-4.6-9.6-9.4C1.1 8.4 2.7 5 6 5c2 0 3.5 1 4.5 2.4l1.5 1.9 1.5-1.9C14.5 6 16 5 18 5c3.3 0 4.9 3.4 3.6 6.6C19.5 16.4 12 21 12 21Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M18 8a3 3 0 1 0-2.8-4l-6 3.1a3 3 0 0 0-5.2 2.1c0 .6.2 1.1.4 1.6l-1.7.9a3 3 0 1 0 1 2.6l6.2-3.2A3 3 0 0 0 18 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ------------------------- Presentation components ------------------------- */

function HighlightStrip({ items = [] }) {
  if (items.length === 0) return null;
  return (
    <ul className="highlight-strip" data-testid="highlight-strip">
      {items.map((label) => {
        const { glyph, label: nice } = amenityIcon(label);
        return (
          <li key={label} className="highlight-tile">
            <span className="highlight-tile__icon" aria-hidden="true">{glyph}</span>
            <span className="highlight-tile__label">{nice}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FacilityGrid({ items = [], initialCount = 6, expandLabel, collapseLabel }) {
  const [expanded, setExpanded] = useState(items.length <= initialCount);
  const visible = expanded ? items : items.slice(0, initialCount);
  const hidden = Math.max(0, items.length - initialCount);
  return (
    <div className="facilities">
      <ul className="facilities__grid" data-testid="facilities-grid">
        {visible.map((label) => {
          const { glyph, label: nice } = amenityIcon(label);
          return (
            <li key={label} className="facility-tile">
              <span className="facility-tile__icon" aria-hidden="true">{glyph}</span>
              <span className="facility-tile__label">{nice}</span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className="facilities__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          data-testid="facilities-toggle"
        >
          {expanded ? collapseLabel : `${expandLabel} (${hidden} more)`}
        </button>
      )}
    </div>
  );
}

function ReviewBreakdown({ summary }) {
  if (!summary) return null;
  const total = summary.total || 1;
  return (
    <div className="review-breakdown" data-testid="review-breakdown">
      <div className="review-breakdown__score">
        <div className="review-breakdown__num">{summary.overall.toFixed(1)}</div>
        <div className="review-breakdown__label">{summary.label}</div>
        <div className="review-breakdown__count">
          {formatReviewCount(summary.total)} reviews
        </div>
      </div>
      <ul className="review-breakdown__bars">
        {summary.breakdown.map((row) => {
          const pct = total === 0 ? 0 : Math.round((row.count / total) * 100);
          return (
            <li key={row.kind} className={`review-bar review-bar--${row.kind}`}>
              <span className="review-bar__label">{row.label}</span>
              <span className="review-bar__track" aria-hidden="true">
                <span className="review-bar__fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="review-bar__count">{row.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NeighborhoodCard({ city }) {
  return (
    <div className="neighborhood" data-testid="neighborhood-card">
      <div className="neighborhood__map" aria-hidden="true">
        <svg viewBox="0 0 240 120" width="100%" height="100%">
          <defs>
            <linearGradient id="mapGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--c-accent-soft)" />
              <stop offset="100%" stopColor="var(--c-bg)" />
            </linearGradient>
          </defs>
          <rect width="240" height="120" fill="url(#mapGrad)" />
          <g stroke="var(--c-border)" strokeWidth="1">
            <line x1="0" y1="30" x2="240" y2="30" />
            <line x1="0" y1="60" x2="240" y2="60" />
            <line x1="0" y1="90" x2="240" y2="90" />
            <line x1="40"  y1="0" x2="40"  y2="120" />
            <line x1="80"  y1="0" x2="80"  y2="120" />
            <line x1="120" y1="0" x2="120" y2="120" />
            <line x1="160" y1="0" x2="160" y2="120" />
            <line x1="200" y1="0" x2="200" y2="120" />
          </g>
          <path d="M0,75 C40,60 80,90 120,72 C160,54 200,90 240,80 L240,120 L0,120 Z"
                fill="var(--c-accent-soft)" opacity="0.7" />
          <circle cx="120" cy="60" r="9" fill="var(--c-accent)" />
          <circle cx="120" cy="60" r="3" fill="#fff" />
        </svg>
      </div>
      <div className="neighborhood__body">
        <h4 className="neighborhood__title">Neighborhood</h4>
        <p className="neighborhood__text">
          Located in <strong>{city}</strong>. Walkable to nearby restaurants,
          transit, and major attractions. Guests love the area for its
          safety, convenience, and walkability.
        </p>
      </div>
    </div>
  );
}

function ReserveCard({ fromPrice, checkIn, checkOut }) {
  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = fromPrice && nights.length > 0 ? fromPrice * nights.length : null;
  const hasDates = checkIn && checkOut && nights.length > 0;
  return (
    <aside className="reserve-card" data-testid="reserve-card">
      <div className="reserve-card__price">
        <span className="reserve-card__from">From</span>
        <span className="reserve-card__amount">${formatPrice(fromPrice)}</span>
        <span className="reserve-card__unit"> / night</span>
      </div>
      {hasDates && (
        <p className="reserve-card__total" data-testid="reserve-card-total">
          <strong>${formatPrice(total)}</strong>{' '}
          total for {nights.length} {nights.length === 1 ? 'night' : 'nights'}
        </p>
      )}
      {hasDates && (
        <div className="reserve-card__dates">
          <span data-testid="reserve-checkin">
            {formatHumanDate(checkIn)}
          </span>
          <span aria-hidden="true"> → </span>
          <span data-testid="reserve-checkout">
            {formatHumanDate(checkOut)}
          </span>
        </div>
      )}

      <a
        href="#availability"
        className="btn btn--primary btn--block"
        data-testid="reserve-cta"
      >
        {hasDates ? 'Reserve' : 'Check availability'}
      </a>
      <p className="reserve-card__hint">You won&apos;t be charged yet</p>

      <ul className="reserve-card__perks">
        <li><span className="reserve-card__check" aria-hidden="true">✓</span> Free cancellation on most rooms</li>
        <li><span className="reserve-card__check" aria-hidden="true">✓</span> No booking fee</li>
        <li><span className="reserve-card__check" aria-hidden="true">✓</span> Best-rate guarantee</li>
      </ul>
    </aside>
  );
}

/* ------------------------------ Main component ------------------------------ */

export default function HotelDetail({ hotel, onBack, checkIn, checkOut, onChangeDates }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!hotel) return null;

  const fromPrice = cheapestRoomPrice(hotel);
  const tier = ratingTier(hotel.overall_rating);
  const cancel = cancellationBadge(hotel.policies?.cancellation);
  const allAmenities = (hotel.amenities || []).slice();
  const summary = reviewSummary(hotel);

  const heroUrl = heroImageUrl(hotel);
  const [g1, g2] = cityGradient(hotel.address.city);

  // Top highlights are the first 4 amenities. Fall back to "free Wi-Fi" if
  // the hotel exposes nothing (so the strip never looks empty).
  const highlights = (allAmenities.length > 0 ? allAmenities.slice(0, 4) : ['free Wi-Fi']);

  return (
    <article className="detail-page" data-testid="hotel-detail" data-hotel-id={hotel.id}>
      {/* ---------------- Sticky booking bar ---------------- */}
      <div
        className={`booking-bar ${scrolled ? 'booking-bar--scrolled' : ''}`}
        data-testid="booking-bar"
      >
        <div className="container booking-bar__inner">
          <div className="booking-bar__left">
            <button
              type="button"
              className="btn btn--ghost btn--sm booking-bar__back"
              onClick={onBack}
              data-testid="back-button"
              aria-label="Back to all hotels"
            >
              ← All hotels
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm detail-hero__back"
              onClick={onBack}
              data-testid="hero-back-button"
              aria-label="Back to all hotels"
            >
              ← All hotels
            </button>
            <div>
              <div className="booking-bar__name">{hotel.name}</div>
              <div className="booking-bar__sub">
                <Stars count={hotel.star_rating} />
                <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
                  <strong>{Number(hotel.overall_rating || 0).toFixed(1)}</strong>
                  {tier.label ? ` · ${tier.label}` : ''}
                </span>
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
        <div className="detail-hero__overlay" aria-hidden="true" />

        <div className="detail-hero__content">
          <div className="detail-hero__breadcrumb">
            <span className="detail-hero__crumb">{hotel.address.city}</span>
            <span className="detail-hero__sep" aria-hidden="true">·</span>
            <span className="detail-hero__crumb">{hotel.address.country}</span>
          </div>

          <h1 className="detail-hero__title" data-testid="detail-title">{hotel.name}</h1>

          <div className="detail-hero__meta">
            <Stars count={hotel.star_rating} />
            <span className="detail-hero__chip">{hotel.address.city}, {hotel.address.country}</span>
            {hotel.address.street && (
              <span className="detail-hero__chip detail-hero__chip--ghost">
                <PinIcon /> {hotel.address.street}
              </span>
            )}
          </div>

          <div className="detail-hero__actions">
            <button
              type="button"
              className={`hero-action ${saved ? 'hero-action--active' : ''}`}
              onClick={() => setSaved((v) => !v)}
              aria-pressed={saved}
              data-testid="save-button"
            >
              <HeartIcon filled={saved} />
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              type="button"
              className="hero-action"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  navigator
                    .share({ title: hotel.name, text: hotel.description })
                    .catch(() => {});
                } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href).catch(() => {});
                }
              }}
              data-testid="share-button"
            >
              <ShareIcon />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Highlights strip ---------------- */}
      <div className="container">
        <HighlightStrip items={highlights} />
      </div>

      {/* ---------------- Body ---------------- */}
      <div className="container">
        <div className="detail-body">
          <main className="detail-body__main">
            {/* ----- About ----- */}
            <section className="detail-section" data-testid="about-section">
              <header className="detail-section__head">
                <h2>About this property</h2>
                <div className="detail-section__chips">
                  <Stars count={hotel.star_rating} />
                  <span className={`badge badge--rating badge--rating--${tier.tier || 'ok'}`}>
                    <strong>{Number(hotel.overall_rating || 0).toFixed(1)}</strong>
                    {tier.label ? ` · ${tier.label}` : ''}
                  </span>
                  <span className="badge badge--muted">
                    {formatReviewCount(hotel.review_count)} reviews
                  </span>
                  <span className={`badge badge--${cancel.kind}`}>{cancel.short}</span>
                </div>
              </header>
              <p className="detail-body__desc" data-testid="hotel-description">
                {hotel.description}
              </p>
            </section>

            {/* ----- Most popular facilities ----- */}
            {allAmenities.length > 0 && (
              <section className="detail-section" data-testid="facilities-section">
                <header className="detail-section__head">
                  <h2>Most popular facilities</h2>
                </header>
                <FacilityGrid
                  items={allAmenities}
                  initialCount={6}
                  expandLabel="Show all facilities"
                  collapseLabel="Show fewer facilities"
                />
              </section>
            )}

            {/* ----- House rules / Policies ----- */}
            <section className="detail-section" data-testid="policies-section">
              <header className="detail-section__head">
                <h2>House rules</h2>
              </header>
              <div className="policies-grid">
                <div className="policy-card">
                  <div className="policy-card__icon" aria-hidden="true">🛎️</div>
                  <div className="policy-card__label">Check-in</div>
                  <div className="policy-card__value">{hotel.policies?.check_in_time || '—'}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-card__icon" aria-hidden="true">🧳</div>
                  <div className="policy-card__label">Check-out</div>
                  <div className="policy-card__value">{hotel.policies?.check_out_time || '—'}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-card__icon" aria-hidden="true">📋</div>
                  <div className="policy-card__label">Cancellation</div>
                  <div className="policy-card__value">{cancel.short}</div>
                </div>
                <div className="policy-card">
                  <div className="policy-card__icon" aria-hidden="true">🐾</div>
                  <div className="policy-card__label">Pets</div>
                  <div className="policy-card__value">
                    {allAmenities.includes('pet_friendly') ? 'Allowed' : 'Not allowed'}
                  </div>
                </div>
              </div>
              <p className="policies-fineprint">
                {hotel.policies?.cancellation}
              </p>
            </section>

            {/* ----- Guest reviews ----- */}
            <section className="detail-section" data-testid="reviews-section">
              <header className="detail-section__head">
                <h2>Guest reviews</h2>
              </header>
              <ReviewBreakdown summary={summary} />
            </section>

            {/* ----- Neighborhood ----- */}
            <section className="detail-section" data-testid="neighborhood-section">
              <header className="detail-section__head">
                <h2>Where you&apos;ll be</h2>
              </header>
              <NeighborhoodCard city={hotel.address.city} />
            </section>

            {/* ----- Contact ----- */}
            {(hotel.contact?.phone || hotel.contact?.email) && (
              <section className="detail-section" data-testid="contact-section">
                <header className="detail-section__head">
                  <h2>Contact this property</h2>
                </header>
                <div className="contact-row">
                  {hotel.contact?.phone && (
                    <a href={`tel:${hotel.contact.phone}`} className="contact-item">
                      <span className="contact-item__icon" aria-hidden="true">📞</span>
                      <div>
                        <div className="contact-item__label">Phone</div>
                        <div className="contact-item__value">{hotel.contact.phone}</div>
                      </div>
                    </a>
                  )}
                  {hotel.contact?.email && (
                    <a href={`mailto:${hotel.contact.email}`} className="contact-item">
                      <span className="contact-item__icon" aria-hidden="true">✉️</span>
                      <div>
                        <div className="contact-item__label">Email</div>
                        <div className="contact-item__value">{hotel.contact.email}</div>
                      </div>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* ----- Rooms & availability (anchor target) ----- */}
            <div id="availability" className="detail-section">
              <RoomAvailability
                hotel={hotel}
                checkIn={checkIn}
                checkOut={checkOut}
                onChangeDates={onChangeDates}
              />
            </div>
          </main>

          {/* ----- Sticky reserve card ----- */}
          <ReserveCard
            fromPrice={fromPrice}
            checkIn={checkIn}
            checkOut={checkOut}
          />
        </div>
      </div>
    </article>
  );
}
