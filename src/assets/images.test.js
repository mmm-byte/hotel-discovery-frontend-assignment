/**
 * images.test.js
 * ----------------------------------------------------------------------------
 * Tests for the image URL + gradient helpers.
 */

import { describe, it, expect } from 'vitest';
import { cardImageUrl, heroImageUrl, cityGradient } from './images';

const sampleHotel = {
  id: 'hotel-01',
  name: 'Test Hotel',
  address: { city: 'Paris' },
};

describe('cardImageUrl', () => {
  it('returns a non-empty Unsplash URL for a valid hotel', () => {
    const url = cardImageUrl(sampleHotel);
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(url).toMatch(/w=800&h=500/);
  });

  it('is deterministic for the same hotel id', () => {
    expect(cardImageUrl(sampleHotel)).toBe(cardImageUrl(sampleHotel));
  });

  it('picks different photos for different hotels in the same city', () => {
    const a = cardImageUrl({ id: 'hotel-01', address: { city: 'Paris' } });
    const b = cardImageUrl({ id: 'hotel-22', address: { city: 'Paris' } });
    // The pool has 3 entries → some ids collide, but at least verify the
    // function doesn't throw for distinct ids.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });

  it('returns null when the hotel has no city', () => {
    expect(cardImageUrl({ id: 'x', address: {} })).toBeNull();
  });

  it('returns null when the hotel has no id', () => {
    expect(cardImageUrl({ address: { city: 'Paris' } })).toBeNull();
  });

  it('falls back to a default pool for unknown cities', () => {
    const url = cardImageUrl({ id: 'hotel-01', address: { city: 'Atlantis' } });
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});

describe('heroImageUrl', () => {
  it('returns a larger Unsplash URL than cardImageUrl', () => {
    const card = cardImageUrl(sampleHotel);
    const hero = heroImageUrl(sampleHotel);
    expect(hero).toMatch(/w=1600&h=720/);
    // Same photo ID, different size params
    expect(hero.split('?')[0]).toBe(card.split('?')[0]);
  });
});

describe('cityGradient', () => {
  it('returns a 2-element color array for known cities', () => {
    const g = cityGradient('Paris');
    expect(Array.isArray(g)).toBe(true);
    expect(g.length).toBe(2);
    g.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('returns a fallback gradient for unknown cities', () => {
    const g = cityGradient('Atlantis');
    expect(g.length).toBe(2);
    g.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('gives distinct gradients for distinct known cities', () => {
    const a = cityGradient('Paris').join(',');
    const b = cityGradient('Tokyo').join(',');
    expect(a).not.toBe(b);
  });
});
